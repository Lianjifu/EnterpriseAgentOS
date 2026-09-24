/**
 * Mock → 真实 EOS 后端路径翻译表。
 *
 * 仅显式列出已知的、已映射到后端 `/v1/...` 的端点；其余路径原样透传，
 * 由消费方在真模式下触发 404 后逐步补齐（本计划 Phase B 的 proof-of-pattern
 * 只接通 4 条；其他是后续 ticket）。
 *
 * 设计要点：
 * - 数组按"最长前缀优先"排序，命中即停止；避免 `/api/memory` 抢占
 *   `/api/memory/candidates/:id/...`。
 * - 路径参数 `:id/:cid/:docId/:runId` 走 regex match；为简单起见本表只列
 *   静态子段，参数化路径通过 `matchPath` + `rebuildPath` 在运行时合成。
 * - 未命中返回 `null`，调用方走"原路径 + 默认 method"分支；这意味着该
 *   端点暂时只在 mock 模式下可用，真模式会 404（开发期即可见，便于补表）。
 */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface RouteRule {
  /** 后端真实方法（仅 pathMap 真模式使用，mock 模式按调用方原 method 走） */
  method: HttpMethod;
  /** 后端真实路径，含 `:` 参数占位 */
  backendPath: string;
  /** 简要注释，便于维护 */
  note?: string;
}

/**
 * 顺序敏感：长前缀在前。
 *   key:    mock 路径或前缀
 *   value:  { method, backendPath }
 *
 * 当 `key` 含 `:` 时，整段做 regex match，参数顺序与 backendPath 一一对应。
 */
const ROUTE_TABLE: Array<{ key: string; rule: RouteRule }> = [
  // ── Phase B proof-of-pattern：identity / workspaces ─────────────────────
  { key: '/api/auth/login', rule: { method: 'POST', backendPath: '/v1/identity/login', note: '响应折形见 responseAdapters.ts' } },
  { key: '/api/auth/me', rule: { method: 'GET', backendPath: '/v1/identity/users/me', note: '取当前用户 profile' } },
  { key: '/api/workspaces', rule: { method: 'GET', backendPath: '/v1/identity/workspaces', note: '租户下工作空间列表' } },
  { key: '/api/tenant/profile', rule: { method: 'GET', backendPath: '/v1/identity/tenants/current', note: '当前租户 profile + plan' } },

  // ── Phase B+:已经在后端存在但本期未接通的端点（先列出来方便后续补）───
  // memory 后端 prefix 是 /v1/memories（注意复数）
  { key: '/api/memory/records', rule: { method: 'GET', backendPath: '/v1/memories', note: 'TODO: Phase C+ 折 snake_case→camelCase' } },
  { key: '/api/memory/policy', rule: { method: 'GET', backendPath: '/v1/memories/policy', note: 'TODO' } },
  // skills 后端在 /v1/skills
  { key: '/api/skills', rule: { method: 'GET', backendPath: '/v1/skills', note: 'TODO' } },
  // knowledge 后端在 /v1/knowledge
  { key: '/api/knowledge/docs', rule: { method: 'GET', backendPath: '/v1/knowledge/documents', note: 'TODO: doc→documents' } },
  // orchestration 在 /v1/orchestration
  { key: '/api/workflows', rule: { method: 'GET', backendPath: '/v1/orchestration/workflows', note: 'TODO' } },
  // agent_factory 在 /v1/agents
  { key: '/api/agents', rule: { method: 'GET', backendPath: '/v1/agents', note: 'TODO' } },
  // evaluation 在 /v1/eval
  { key: '/api/evaluations', rule: { method: 'GET', backendPath: '/v1/eval', note: 'TODO' } },
  // channel 在 /v1（无前缀），通过 /v1/channels 找到的路由
  { key: '/api/channels', rule: { method: 'GET', backendPath: '/v1/channels', note: 'TODO' } },
];

export interface TranslatedRoute {
  method: HttpMethod;
  backendPath: string;
  /** true = 在 ROUTE_TABLE 命中；false = 透传原路径 */
  matched: boolean;
}

function matchExactOrWildcard(key: string, path: string): string[] | null {
  // 把 key 转成 regex（`:xxx` → `([^/]+)`）
  const parts = key.split('/');
  const reParts = parts.map((p) => {
    if (p.startsWith(':')) return '([^/]+)';
    if (p === '') return '';
    return p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  });
  const re = new RegExp('^' + reParts.join('/') + '$');
  const m = path.match(re);
  if (!m) return null;
  return m.slice(1);
}

function rebuildBackendPath(template: string, params: string[]): string {
  let i = 0;
  return template.replace(/:[a-zA-Z]+/g, () => params[i++] ?? '');
}

/**
 * 把 mock 风格的 `/api/...` 路径翻译到后端真实 `/v1/...` 路径。
 * 未命中 → { backendPath: 原路径, matched: false }。
 */
export function translateApiPath(
  path: string,
  method: HttpMethod = 'GET',
): TranslatedRoute {
  for (const { key, rule } of ROUTE_TABLE) {
    const params = matchExactOrWildcard(key, path);
    if (params !== null) {
      return {
        method: rule.method,
        backendPath: rebuildBackendPath(rule.backendPath, params),
        matched: true,
      };
    }
  }
  // 未命中：保持调用方原 method（GET/POST/PATCH…），仅给个标记便于打日志
  return { method, backendPath: path, matched: false };
}

/** 仅供单测使用：返回当前规则命中数（>=0 表示表非空） */
export function _routeTableSize(): number {
  return ROUTE_TABLE.length;
}