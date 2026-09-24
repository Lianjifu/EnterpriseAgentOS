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
});