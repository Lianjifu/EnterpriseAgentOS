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
 * 顺序敏感:长前缀在前。
 *   key:    mock 路径或前缀
 *   value:  { method, backendPath }
 *
 * 当 `key` 含 `:` 时,整段做 regex match,参数顺序与 backendPath 一一对应。
 * backend 路径里的 `:{name}` 占位与 key 里的 `:id` 不必同名 ——
 * 替换按位置进行,只关心捕获顺序。
 */
const ROUTE_TABLE: Array<{ key: string; rule: RouteRule }> = [
  // ── Phase B proof-of-pattern:identity / workspaces ─────────────────────
  { key: '/api/auth/login', rule: { method: 'POST', backendPath: '/v1/identity/login', note: '响应折形见 responseAdapters.ts' } },
  { key: '/api/auth/me', rule: { method: 'GET', backendPath: '/v1/identity/users/me', note: '取当前用户 profile' } },
  { key: '/api/workspaces', rule: { method: 'GET', backendPath: '/v1/identity/workspaces', note: '租户下工作空间列表' } },
  { key: '/api/tenant/profile', rule: { method: 'GET', backendPath: '/v1/identity/tenants/current', note: '当前租户 profile + plan' } },

  // ── Phase B+ batch 1:skills(skill module: /v1/skills) ────────────────
  // 长前缀在前,避免 /api/skills 抢 /api/skills/:id/...
  { key: '/api/skills/governance/overview', rule: { method: 'GET', backendPath: '/v1/skills/governance/overview' } },
  { key: '/api/skills/governance/health', rule: { method: 'GET', backendPath: '/v1/skills/governance/health' } },
  { key: '/api/skills/governance/incidents', rule: { method: 'GET', backendPath: '/v1/skills/governance/incidents' } },
  { key: '/api/skills/governance/events', rule: { method: 'GET', backendPath: '/v1/skills/governance/events' } },
  { key: '/api/skills/governance/trends', rule: { method: 'GET', backendPath: '/v1/skills/governance/trends' } },
  { key: '/api/skills/governance/batch', rule: { method: 'POST', backendPath: '/v1/skills/governance/batch' } },
  { key: '/api/skills/catalog', rule: { method: 'GET', backendPath: '/v1/skills/catalog' } },
  { key: '/api/skills/catalog/publish', rule: { method: 'POST', backendPath: '/v1/skills/catalog/publish' } },
  { key: '/api/skills/catalog/sync', rule: { method: 'POST', backendPath: '/v1/skills/catalog/sync' } },
  { key: '/api/skills/audit', rule: { method: 'GET', backendPath: '/v1/skills/audit' } },
  { key: '/api/skills/perms', rule: { method: 'GET', backendPath: '/v1/skills/permissions' } },
  { key: '/api/skills/import', rule: { method: 'POST', backendPath: '/v1/skills/import' } },
  { key: '/api/skills/import-package', rule: { method: 'POST', backendPath: '/v1/skills/import-package' } },
  { key: '/api/skills/:id/preflight', rule: { method: 'POST', backendPath: '/v1/skills/:id/preflight' } },
  { key: '/api/skills/:id/install', rule: { method: 'POST', backendPath: '/v1/skills/:id/install' } },
  { key: '/api/skills/:id/impact', rule: { method: 'GET', backendPath: '/v1/skills/:id/impact' } },
  { key: '/api/skills/:id/uninstall', rule: { method: 'POST', backendPath: '/v1/skills/:id/uninstall' } },
  { key: '/api/skills/:id/lifecycle', rule: { method: 'PATCH', backendPath: '/v1/skills/:id/lifecycle' } },
  { key: '/api/skills/:id/governance', rule: { method: 'PATCH', backendPath: '/v1/skills/:id/governance' } },
  { key: '/api/skills/:id/runtime', rule: { method: 'PATCH', backendPath: '/v1/skills/:id/runtime' } },
  { key: '/api/skills/:id/permissions', rule: { method: 'PATCH', backendPath: '/v1/skills/:id/permissions' } },
  { key: '/api/skills/:id/test', rule: { method: 'POST', backendPath: '/v1/skills/:id/test' } },
  { key: '/api/skills/:id/versions', rule: { method: 'GET', backendPath: '/v1/skills/:id/versions' } },
  { key: '/api/skills/:id', rule: { method: 'GET', backendPath: '/v1/skills/:id' } },
  { key: '/api/skills', rule: { method: 'GET', backendPath: '/v1/skills' } },

  // ── Phase B+ batch 2:memory(memory module: /v1/memories) ──────────────
  { key: '/api/memory/records', rule: { method: 'GET', backendPath: '/v1/memories' } },
  { key: '/api/memory/records', rule: { method: 'POST', backendPath: '/v1/memories' } },
  { key: '/api/memory/records/:id', rule: { method: 'DELETE', backendPath: '/v1/memories/:id' } },
  { key: '/api/memory/records/:id/expire', rule: { method: 'POST', backendPath: '/v1/memories/:id/expire' } },
  { key: '/api/memory/recall', rule: { method: 'POST', backendPath: '/v1/memories/recall' } },
  { key: '/api/memory/audit', rule: { method: 'GET', backendPath: '/v1/memories/audit' } },
  { key: '/api/memory/policy', rule: { method: 'GET', backendPath: '/v1/memories/policy' } },
  { key: '/api/memory/policy', rule: { method: 'PATCH', backendPath: '/v1/memories/policy' } },

  // ── Phase B+ batch 3:knowledge(knowledge module: /v1/knowledge) ──────
  // 注意 mock 用 /api/knowledge/doc/:id(单数),backend 用 /v1/knowledge/assets/:id
  { key: '/api/knowledge/docs', rule: { method: 'GET', backendPath: '/v1/knowledge/assets' } },
  { key: '/api/knowledge/docs', rule: { method: 'POST', backendPath: '/v1/knowledge/assets' } },
  { key: '/api/knowledge/doc/:id', rule: { method: 'GET', backendPath: '/v1/knowledge/assets/:id' } },
  { key: '/api/knowledge/doc/:id', rule: { method: 'DELETE', backendPath: '/v1/knowledge/assets/:id' } },
  { key: '/api/knowledge/retrieve', rule: { method: 'POST', backendPath: '/v1/knowledge/search' } },
  { key: '/api/knowledge/reindex', rule: { method: 'POST', backendPath: '/v1/knowledge/reindex' } },
  { key: '/api/knowledge/sources', rule: { method: 'GET', backendPath: '/v1/knowledge/sources' } },
  { key: '/api/knowledge/sources', rule: { method: 'POST', backendPath: '/v1/knowledge/sources' } },
  { key: '/api/knowledge/sources/:id/sync', rule: { method: 'POST', backendPath: '/v1/knowledge/sources/:id/sync' } },
  { key: '/api/knowledge/governance', rule: { method: 'GET', backendPath: '/v1/knowledge/governance' } },
  { key: '/api/knowledge/governance', rule: { method: 'PATCH', backendPath: '/v1/knowledge/governance' } },
  { key: '/api/knowledge/packages', rule: { method: 'GET', backendPath: '/v1/knowledge/packages' } },
  { key: '/api/knowledge/packages', rule: { method: 'POST', backendPath: '/v1/knowledge/packages' } },
  { key: '/api/knowledge/packages/:id/publish', rule: { method: 'POST', backendPath: '/v1/knowledge/packages/:id/publish' } },
  { key: '/api/knowledge/packages/:id/process', rule: { method: 'POST', backendPath: '/v1/knowledge/packages/:id/process' } },
  { key: '/api/knowledge/audit', rule: { method: 'GET', backendPath: '/v1/knowledge/audit' } },
  { key: '/api/knowledge/eval', rule: { method: 'GET', backendPath: '/v1/knowledge/eval' } },

  // ── Phase B+ batch 4:workflows(orchestration module: /v1/orchestration) ──
  { key: '/api/workflows/:id/runs/:runId/retry', rule: { method: 'POST', backendPath: '/v1/orchestration/runs/:runId/retry' } },
  { key: '/api/workflows/:id/runs/:runId/resume', rule: { method: 'POST', backendPath: '/v1/orchestration/runs/:runId/resume' } },
  { key: '/api/workflows/:id/runs', rule: { method: 'GET', backendPath: '/v1/orchestration/plans/:id/runs' } },
  { key: '/api/workflows/:id/run', rule: { method: 'POST', backendPath: '/v1/orchestration/plans/:id/runs' } },
  { key: '/api/workflows/:id/audit', rule: { method: 'GET', backendPath: '/v1/orchestration/plans/:id/audit' } },
  { key: '/api/workflows/:id/versions', rule: { method: 'GET', backendPath: '/v1/orchestration/plans/:id/versions' } },
  { key: '/api/workflows/:id/validate', rule: { method: 'POST', backendPath: '/v1/orchestration/plans/:id/validate' } },
  { key: '/api/workflows/:id/draft', rule: { method: 'PUT', backendPath: '/v1/orchestration/plans/:id/draft' } },
  { key: '/api/workflows/:id', rule: { method: 'GET', backendPath: '/v1/orchestration/plans/:id' } },
  { key: '/api/workflows', rule: { method: 'GET', backendPath: '/v1/orchestration/plans' } },

  // ── Phase B+ batch 5:agents(agent_factory + agent_runtime) ───────────
  { key: '/api/agents/:id/skills/:bindingId', rule: { method: 'DELETE', backendPath: '/v1/agents/:id/skills/:bindingId' } },
  { key: '/api/agents/:id/skills', rule: { method: 'POST', backendPath: '/v1/agents/:id/skills' } },
  { key: '/api/agents/:id/versions', rule: { method: 'GET', backendPath: '/v1/agents/:id/versions' } },
  { key: '/api/agents/:id/capabilities/:bindingId', rule: { method: 'DELETE', backendPath: '/v1/agents/:id/capabilities/:bindingId' } },
  { key: '/api/agents/:id/capabilities', rule: { method: 'POST', backendPath: '/v1/agents/:id/capabilities' } },
  { key: '/api/agents/:id/install', rule: { method: 'POST', backendPath: '/v1/agents/:id/install' } },
  { key: '/api/agents/:id/uninstall', rule: { method: 'POST', backendPath: '/v1/agents/:id/uninstall' } },
  { key: '/api/agents/:id/publish', rule: { method: 'POST', backendPath: '/v1/agents/:id/versions/default/publish' } },
  { key: '/api/agents/:id', rule: { method: 'GET', backendPath: '/v1/agents/:id' } },
  { key: '/api/agents', rule: { method: 'GET', backendPath: '/v1/agents' } },

  // ── Phase B+ batch 6:sessions(agent_runtime sessions) ────────────────
  { key: '/api/sessions', rule: { method: 'GET', backendPath: '/v1/sessions' } },
  { key: '/api/sessions', rule: { method: 'POST', backendPath: '/v1/sessions' } },
  { key: '/api/sessions/:id', rule: { method: 'GET', backendPath: '/v1/sessions/:id' } },
  { key: '/api/sessions/:id', rule: { method: 'DELETE', backendPath: '/v1/sessions/:id/close' } },

  // ── Phase B+ batch 7:channels(channel module: /v1/channels) ──────────
  { key: '/api/channels/:id/toggle', rule: { method: 'PATCH', backendPath: '/v1/channels/:id' } },
  { key: '/api/channels/:id/test', rule: { method: 'POST', backendPath: '/v1/channels/:id/send' } },
  { key: '/api/channels/:id/config', rule: { method: 'PATCH', backendPath: '/v1/channels/:id' } },
  { key: '/api/channels/:id', rule: { method: 'GET', backendPath: '/v1/channels/:id' } },
  { key: '/api/channels', rule: { method: 'GET', backendPath: '/v1/channels' } },

  // ── Phase B+ batch 8:evaluations(evaluation module: /v1/eval) ────────
  { key: '/api/evaluations/:id/report', rule: { method: 'GET', backendPath: '/v1/eval/:id/report' } },
  { key: '/api/evaluations/:id/run', rule: { method: 'POST', backendPath: '/v1/eval/:id/run' } },
  { key: '/api/evaluations/:id/stop', rule: { method: 'POST', backendPath: '/v1/eval/:id/stop' } },
  { key: '/api/evaluations/:id/retry', rule: { method: 'POST', backendPath: '/v1/eval/:id/retry' } },
  { key: '/api/evaluations/:id', rule: { method: 'GET', backendPath: '/v1/eval/:id' } },
  { key: '/api/evaluations', rule: { method: 'GET', backendPath: '/v1/eval' } },

  // ── TODO(后续 ticket):仍 mock-only 的路径 ──────────────────────────────
  // - /api/digital-employees/*        → 后端在 /v1/agents 但形状差异大
  // - /api/audit-center               → 后端只有分模块 audit,无 unified feed
  // - /api/audit-stream               → 同上
  // - /api/backups                    → 后端无对应
  // - /api/billing                    → 后端无对应
  // - /api/home/{kpis,events,team,...}→ 后端无 aggregate endpoint
  // - /api/copilot/*                  → agent_runtime 路径不一致
  // - /api/agents/{metrics,calls,alerts,trend} → agent_runtime 不暴露聚合
  // - /api/channel-control/*          → channel 路径不同
  // - /api/zero-trust/*               → governance 无 zero-trust 专用端点
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
 *
 * 匹配策略:
 * 1. **method-aware**:先按 (path, method) 找完全匹配的条目
 * 2. **method-tolerant fallback**:没有 method 匹配时,按 path 找任意条目,
 *    仍返回 rule.method 作为方法提示(用于响应里)
 */
export function translateApiPath(
  path: string,
  method: HttpMethod = 'GET',
): TranslatedRoute {
  let fallback: { backendPath: string; method: HttpMethod } | null = null;
  for (const { key, rule } of ROUTE_TABLE) {
    const params = matchExactOrWildcard(key, path);
    if (params === null) continue;
    const backendPath = rebuildBackendPath(rule.backendPath, params);
    if (rule.method === method) {
      return { method: rule.method, backendPath, matched: true };
    }
    if (fallback === null) fallback = { method: rule.method, backendPath };
  }
  if (fallback !== null) {
    return { method: fallback.method, backendPath: fallback.backendPath, matched: true };
  }
  // 未命中:保持调用方原 method（GET/POST/PATCH…），仅给个标记便于打日志
  return { method, backendPath: path, matched: false };
}

/** 仅供单测使用：返回当前规则命中数（>=0 表示表非空） */
export function _routeTableSize(): number {
  return ROUTE_TABLE.length;
}