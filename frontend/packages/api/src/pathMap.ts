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
  // 注意:backend 列 runs 是 /v1/orchestration/runs(全局列表,用 query ?plan_id 过滤),
  // 不是 /v1/orchestration/plans/:id/runs —— 后者无对应端点
  { key: '/api/workflows/:id/runs/:runId/retry', rule: { method: 'POST', backendPath: '/v1/orchestration/runs/:runId/retry' } },
  { key: '/api/workflows/:id/runs/:runId/resume', rule: { method: 'POST', backendPath: '/v1/orchestration/runs/:runId/resume' } },
  { key: '/api/workflows/:id/runs', rule: { method: 'GET', backendPath: '/v1/orchestration/runs', note: 'backend 列全局 runs,?plan_id 过滤' } },
  { key: '/api/workflows/:id/run', rule: { method: 'POST', backendPath: '/v1/orchestration/plans/:id/runs' } },
  { key: '/api/workflows/:id/audit', rule: { method: 'GET', backendPath: '/v1/orchestration/plans/:id/audit' } },
  { key: '/api/workflows/:id/versions', rule: { method: 'GET', backendPath: '/v1/orchestration/plans/:id/versions' } },
  { key: '/api/workflows/:id/validate', rule: { method: 'POST', backendPath: '/v1/orchestration/plans/:id/validate' } },
  { key: '/api/workflows/:id/draft', rule: { method: 'PUT', backendPath: '/v1/orchestration/plans/:id/draft' } },
  { key: '/api/workflows/:id', rule: { method: 'GET', backendPath: '/v1/orchestration/plans/:id' } },
  { key: '/api/workflows', rule: { method: 'GET', backendPath: '/v1/orchestration/plans' } },

  // ── Phase B+ batch 5:agents(agent_factory: /v1/agents) ────────────────
  // 注:agent_factory router 只有 {aid}, {aid}/versions, {aid}/versions/{vid}/{publish,release,retire,notes} 等
  // 不暴露 :id/skills, :id/capabilities, :id/install, :id/uninstall, :id/publish(无 version_id)。
  // 这些 pathMap 规则全部删除,前端真模式调用时走 passthrough(404);
  // mock 模式自身也未实现这些路径,删除不影响 mock 行为。
  { key: '/api/agents/:id/versions', rule: { method: 'GET', backendPath: '/v1/agents/:id/versions' } },
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
  // 注:backend 的资源是 /v1/eval/datasets 和 /v1/eval/runs,顶层 /v1/eval 不存在
  // GET /api/evaluations → list runs(backend 无 datasets 列表的 mock 入口,统一映射到 runs)
  // GET /api/evaluations/:id → single run
  // /api/evaluations/:id/{run,stop,retry,report} 全部 fallback passthrough —— backend 无对应端点
  { key: '/api/evaluations', rule: { method: 'GET', backendPath: '/v1/eval/runs', note: 'list runs(backend 不暴露 datasets 列表)' } },
  { key: '/api/evaluations', rule: { method: 'POST', backendPath: '/v1/eval/runs', note: 'create run' } },
  { key: '/api/evaluations/:id', rule: { method: 'GET', backendPath: '/v1/eval/runs/:id' } },

  // ── Phase B+ batch 9:platform(platform module: /v1/platform) ────────
  { key: '/api/tenant/profile', rule: { method: 'PATCH', backendPath: '/v1/platform/tenants/me' } },
  { key: '/api/billing', rule: { method: 'GET', backendPath: '/v1/platform/subscriptions/me' } },

  // ── Phase B+ batch 10:governance(/v1/policies + /v1/approvals) ───────
  // 实际后端路径:approval 用 /deny 不是 /reject
  { key: '/api/release-approvals', rule: { method: 'GET', backendPath: '/v1/approvals' } },
  { key: '/api/release-approvals', rule: { method: 'POST', backendPath: '/v1/approvals' } },
  { key: '/api/release-approvals/:id/approve', rule: { method: 'POST', backendPath: '/v1/approvals/:id/approve' } },
  { key: '/api/release-approvals/:id/reject', rule: { method: 'POST', backendPath: '/v1/approvals/:id/deny' } },
  // zero-trust policies → backend 实际在 /v1/policies(无 zero-trust 子路径)
  { key: '/api/zero-trust/policies', rule: { method: 'GET', backendPath: '/v1/policies' } },
  { key: '/api/zero-trust/policies', rule: { method: 'POST', backendPath: '/v1/policies' } },
  { key: '/api/zero-trust/policies/:id', rule: { method: 'PATCH', backendPath: '/v1/policies/:id' } },
  // zero-trust/evaluate → backend governance 无此端点;fallback 透传
  // zero-trust/events → 同上

  // ── Phase B+ batch 11:observability(/v1/observability) ───────────────
  { key: '/api/observability/runs', rule: { method: 'GET', backendPath: '/v1/observability/runs' } },
  { key: '/api/observability/costs', rule: { method: 'GET', backendPath: '/v1/observability/costs' } },
  // 注意 backend 的 quality 端点需要 template_id + version_id,前端如果只传
  // /quality 时 fallback 透传(后续按需扩展 query 参数规则)

  // ── Phase B+ batch 12:tools(tool module: /v1/tools) ──────────────────
  { key: '/api/tools', rule: { method: 'POST', backendPath: '/v1/tools' } },
  { key: '/api/tools', rule: { method: 'GET', backendPath: '/v1/tools' } },
  { key: '/api/tools/:id', rule: { method: 'GET', backendPath: '/v1/tools/:id' } },
  { key: '/api/tools/:id', rule: { method: 'DELETE', backendPath: '/v1/tools/:id' } },
  { key: '/api/tools/:id', rule: { method: 'PATCH', backendPath: '/v1/tools/:id' } },
  { key: '/api/tools/:id/invoke', rule: { method: 'POST', backendPath: '/v1/tools/:id/invoke' } },

  // ── Phase B+ batch 13:models(model module: /v1/model-credentials + /v1/models + /v1/routing-policies) ─
  { key: '/api/model-providers', rule: { method: 'GET', backendPath: '/v1/model-credentials' } },
  { key: '/api/model-providers', rule: { method: 'POST', backendPath: '/v1/model-credentials' } },
  { key: '/api/model-providers/:id', rule: { method: 'PATCH', backendPath: '/v1/model-credentials/:id' } },
  { key: '/api/model-providers/:id', rule: { method: 'DELETE', backendPath: '/v1/model-credentials/:id' } },
  { key: '/api/model-providers/:id/rotate', rule: { method: 'POST', backendPath: '/v1/model-credentials/:id/rotate' } },
  { key: '/api/models', rule: { method: 'GET', backendPath: '/v1/models' } },
  { key: '/api/models/:id', rule: { method: 'GET', backendPath: '/v1/models/:id' } },
  { key: '/api/models/:id/invoke', rule: { method: 'POST', backendPath: '/v1/models/:id/invoke' } },
  { key: '/api/model-routing/policies', rule: { method: 'GET', backendPath: '/v1/routing-policies' } },
  { key: '/api/model-routing/policies', rule: { method: 'POST', backendPath: '/v1/routing-policies' } },
  { key: '/api/model-routing/policies/:id/draft', rule: { method: 'PATCH', backendPath: '/v1/routing-policies/:id/draft' } },
  { key: '/api/model-routing/policies/:id/validate', rule: { method: 'POST', backendPath: '/v1/routing-policies/:id/validate' } },
  { key: '/api/model-routing/policies/:id/publish', rule: { method: 'POST', backendPath: '/v1/routing-policies/:id/publish' } },

  // ── Phase B+ batch 14:self-evolution(/v1/evolve) ─────────────────────
  { key: '/api/evolve/candidates', rule: { method: 'GET', backendPath: '/v1/evolve/candidates' } },
  { key: '/api/evolve/candidates/:id/approve', rule: { method: 'POST', backendPath: '/v1/evolve/candidates/:id/approve' } },
  { key: '/api/evolve/candidates/:id/reject', rule: { method: 'POST', backendPath: '/v1/evolve/candidates/:id/reject' } },
  { key: '/api/evolve/candidates/:id/apply', rule: { method: 'POST', backendPath: '/v1/evolve/candidates/:id/apply' } },

  // ── TODO(后续 ticket):仍 mock-only 的路径 ──────────────────────────────
  // - /api/digital-employees/*        → 后端在 /v1/agents 但形状差异大
  // - /api/audit-center               → 后端只有分模块 audit,无 unified feed
  // - /api/audit-stream               → SSE endpoints in different modules
  // - /api/backups                    → 后端无对应
  // - /api/home/{kpis,events,team,...}→ 后端无 aggregate endpoint
  // - /api/copilot/*                  → agent_runtime 路径不一致
  // - /api/agents/{metrics,calls,alerts,trend} → agent_runtime 不暴露聚合
  // - /api/agents/:id/{publish,install,uninstall,skills,capabilities} → agent_factory 无对应端点(已从 pathMap 移除)
  // - /api/channel-control/*          → channel 路径不同
  // - /api/skill-integrations/*       → 需进一步核对
  // - /api/tasks                      → orchestration 无 /tasks 端点(只有 plans + runs)
  // - /api/zero-trust/{evaluate,events,authorizations} → governance 无专用端点
  // - /api/evaluations/:id/{run,stop,retry,report} → backend eval 仅 datasets + runs,无 lifecycle 端点(已从 pathMap 移除)
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