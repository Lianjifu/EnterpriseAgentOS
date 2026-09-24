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
});