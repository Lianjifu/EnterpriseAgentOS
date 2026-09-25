import { describe, expect, it } from 'vitest';
import { translateApiPath, _routeTableSize } from './pathMap';

describe('translateApiPath', () => {
  it('has at least one rule registered', () => {
    expect(_routeTableSize()).toBeGreaterThan(0);
  });

  it('rewrites POST /api/auth/login → POST /v1/identity/login', () => {
    const out = translateApiPath('/api/auth/login', 'POST');
    expect(out.matched).toBe(true);
    expect(out.method).toBe('POST');
    expect(out.backendPath).toBe('/v1/identity/login');
  });

  it('rewrites GET /api/workspaces → GET /v1/identity/workspaces', () => {
    const out = translateApiPath('/api/workspaces', 'GET');
    expect(out.matched).toBe(true);
    expect(out.backendPath).toBe('/v1/identity/workspaces');
  });

  it('rewrites GET /api/tenant/profile → GET /v1/identity/tenants/current', () => {
    const out = translateApiPath('/api/tenant/profile', 'GET');
    expect(out.backendPath).toBe('/v1/identity/tenants/current');
  });

  it('passes through unknown paths with matched=false', () => {
    const out = translateApiPath('/api/digital-employees/abc123', 'GET');
    expect(out.matched).toBe(false);
    expect(out.backendPath).toBe('/api/digital-employees/abc123');
    expect(out.method).toBe('GET');
  });

  it('defaults method to GET when none supplied', () => {
    const out = translateApiPath('/api/auth/me');
    expect(out.method).toBe('GET');
    expect(out.backendPath).toBe('/v1/identity/users/me');
  });

  it('returns backend method (not caller method) on a hit', () => {
    // 即使 caller 传 GET,命中后 method 应是 ROUTE_TABLE 里的 method
    const out = translateApiPath('/api/auth/login', 'GET');
    expect(out.method).toBe('POST');
  });

  it('matches the longest prefix first', () => {
    // /api/skills/governance/overview 应优先于 /api/skills/:id 命中
    const out = translateApiPath('/api/skills/governance/overview', 'GET');
    expect(out.backendPath).toBe('/v1/skills/governance/overview');
  });

  it('rewrites /api/skills/:id/install → /v1/skills/:id/install', () => {
    const out = translateApiPath('/api/skills/sk-1/install', 'POST');
    expect(out.backendPath).toBe('/v1/skills/sk-1/install');
    expect(out.matched).toBe(true);
  });

  it('rewrites /api/workflows/:id/run → /v1/orchestration/plans/:id/runs', () => {
    const out = translateApiPath('/api/workflows/wf-1/run', 'POST');
    expect(out.backendPath).toBe('/v1/orchestration/plans/wf-1/runs');
  });

  it('rewrites /api/knowledge/doc/:id → /v1/knowledge/assets/:id', () => {
    const out = translateApiPath('/api/knowledge/doc/kb-7', 'GET');
    expect(out.backendPath).toBe('/v1/knowledge/assets/kb-7');
  });

  it('picks method-aware rule for same path', () => {
    const get = translateApiPath('/api/memory/records', 'GET');
    expect(get.backendPath).toBe('/v1/memories');
    const post = translateApiPath('/api/memory/records', 'POST');
    expect(post.backendPath).toBe('/v1/memories');
    // GET /api/memory/records/:id/expire 没有单独条目,应 fallback 到 path 匹配
    // (即走到 POST 规则,这是已知的 fallback 行为 —— 不静默改写)
    const delete_ = translateApiPath('/api/memory/records', 'DELETE');
    expect(delete_.matched).toBe(true);
    expect(delete_.backendPath).toBe('/v1/memories');
  });

  it('rule count grows as we add batches', () => {
    expect(_routeTableSize()).toBeGreaterThan(60);
  });

  it('rewrites /api/release-approvals/:id/reject → /v1/approvals/:id/deny', () => {
    // 后端 governance 用 /deny 不是 /reject
    const out = translateApiPath('/api/release-approvals/req-1/reject', 'POST');
    expect(out.backendPath).toBe('/v1/approvals/req-1/deny');
  });

  it('rewrites /api/zero-trust/policies → /v1/policies (no ZT subpath in backend)', () => {
    const out = translateApiPath('/api/zero-trust/policies', 'GET');
    expect(out.backendPath).toBe('/v1/policies');
  });

  it('rewrites /api/model-providers → /v1/model-credentials', () => {
    const out = translateApiPath('/api/model-providers', 'GET');
    expect(out.backendPath).toBe('/v1/model-credentials');
  });

  it('rewrites /api/model-routing/policies → /v1/routing-policies', () => {
    const out = translateApiPath('/api/model-routing/policies', 'GET');
    expect(out.backendPath).toBe('/v1/routing-policies');
  });

  it('rewrites /api/tools/:id/invoke → /v1/tools/:id/invoke', () => {
    const out = translateApiPath('/api/tools/t-1/invoke', 'POST');
    expect(out.backendPath).toBe('/v1/tools/t-1/invoke');
  });

  it('does not invent /v1/orchestration/tasks (backend has no such endpoint)', () => {
    // backend orchestration 只有 plans + runs,无 /tasks
    const out = translateApiPath('/api/tasks', 'GET');
    expect(out.matched).toBe(false);
    expect(out.backendPath).toBe('/api/tasks');
  });

  // ── batch 4:evaluation 修正 ────────────────────────────────────────
  it('rewrites GET /api/evaluations → GET /v1/eval/runs (list runs)', () => {
    const out = translateApiPath('/api/evaluations', 'GET');
    expect(out.matched).toBe(true);
    expect(out.backendPath).toBe('/v1/eval/runs');
  });

  it('rewrites POST /api/evaluations → POST /v1/eval/runs (create run)', () => {
    const out = translateApiPath('/api/evaluations', 'POST');
    expect(out.backendPath).toBe('/v1/eval/runs');
  });

  it('rewrites GET /api/evaluations/:id → GET /v1/eval/runs/:id (single run)', () => {
    const out = translateApiPath('/api/evaluations/eval-7', 'GET');
    expect(out.backendPath).toBe('/v1/eval/runs/eval-7');
  });

  it('falls through /api/evaluations/:id/{run,stop,retry,report} (backend has no such lifecycle endpoints)', () => {
    // backend /v1/eval 只有 /datasets 和 /runs,没有 /run /stop /retry /report
    const actions = ['run', 'stop', 'retry', 'report'];
    for (const action of actions) {
      const out = translateApiPath(`/api/evaluations/eval-1/${action}`, 'POST');
      expect(out.matched).toBe(false);
      expect(out.backendPath).toBe(`/api/evaluations/eval-1/${action}`);
    }
  });

  // ── batch 4:orchestration runs 修正 ─────────────────────────────────
  it('rewrites GET /api/workflows/:id/runs → GET /v1/orchestration/runs (global list, ?plan_id filter)', () => {
    // backend 列 runs 是全局 /v1/orchestration/runs,用 query param ?plan_id 过滤
    // 不是 /v1/orchestration/plans/:id/runs(无此端点)
    const out = translateApiPath('/api/workflows/wf-1/runs', 'GET');
    expect(out.matched).toBe(true);
    expect(out.backendPath).toBe('/v1/orchestration/runs');
  });

  // ── batch 4:agents phantom rules 移除 ──────────────────────────────
  it('falls through /api/agents/:id/{publish,install,uninstall} (no backend endpoint)', () => {
    // agent_factory 无 /publish /install /uninstall 端点(publish 需要 vid,install 在 skill 模块)
    const actions = ['publish', 'install', 'uninstall'];
    for (const action of actions) {
      const out = translateApiPath(`/api/agents/a-1/${action}`, 'POST');
      expect(out.matched).toBe(false);
    }
  });

  it('falls through /api/agents/:id/skills[/:bindingId] (no backend endpoint)', () => {
    // agent_factory 不暴露 agent→skill 绑定
    const createOut = translateApiPath('/api/agents/a-1/skills', 'POST');
    expect(createOut.matched).toBe(false);
    const deleteOut = translateApiPath('/api/agents/a-1/skills/b-1', 'DELETE');
    expect(deleteOut.matched).toBe(false);
  });

  it('falls through /api/agents/:id/capabilities[/:bindingId] (no backend endpoint)', () => {
    const createOut = translateApiPath('/api/agents/a-1/capabilities', 'POST');
    expect(createOut.matched).toBe(false);
    const deleteOut = translateApiPath('/api/agents/a-1/capabilities/c-1', 'DELETE');
    expect(deleteOut.matched).toBe(false);
  });

  // ── batch 5:knowledge packages verb mismatch ─────────────────────────
  it('rewrites DELETE /api/knowledge/packages/:id/delete → DELETE /v1/knowledge/packages/:id', () => {
    // mock 走 /packages/:id/delete 子路径,backend 走 /packages/:id DELETE 动词
    const out = translateApiPath('/api/knowledge/packages/p-1/delete', 'DELETE');
    expect(out.matched).toBe(true);
    expect(out.method).toBe('DELETE');
    expect(out.backendPath).toBe('/v1/knowledge/packages/p-1');
  });
});