import { describe, expect, it } from 'vitest';
import { applyResponseAdapter } from './responseAdapters';

describe('applyResponseAdapter', () => {
  it('adapts POST /v1/identity/login from snake_case to frontend shape', () => {
    const out = applyResponseAdapter('POST', '/v1/identity/login', {
      access_token: 'tok-abc',
      expires_at: '2026-09-25T12:00:00Z',
    });
    expect(out).toEqual({
      token: 'tok-abc',
      user: {
        id: '',
        email: '',
        role: 'user',
        tenantId: '',
        name: '',
        permissions: [],
      },
      expiresAt: '2026-09-25T12:00:00Z',
    });
  });

  it('tolerates camelCase accessToken as well', () => {
    const out = applyResponseAdapter('POST', '/v1/identity/login', {
      accessToken: 'tok-xyz',
      expiresAt: '2026-09-25T13:00:00Z',
    });
    expect((out as { token: string }).token).toBe('tok-xyz');
    expect((out as { expiresAt: string }).expiresAt).toBe('2026-09-25T13:00:00Z');
  });

  it('passes through unknown paths', () => {
    const raw = { id: 'ws-1', name: 'Default', tenantId: 't-1' };
    const out = applyResponseAdapter('GET', '/v1/identity/workspaces', raw);
    expect(out).toEqual(raw);
  });

  it('passes through non-object data unchanged', () => {
    expect(applyResponseAdapter('GET', '/anything', null)).toBeNull();
    expect(applyResponseAdapter('GET', '/anything', 'hello')).toBe('hello');
    expect(applyResponseAdapter('GET', '/anything', 42)).toBe(42);
  });

  it('returns raw data when login response lacks access_token', () => {
    const raw = { code: 'E_AUTH_FAILED', message: 'bad password' };
    const out = applyResponseAdapter('POST', '/v1/identity/login', raw);
    // 不强行捏造，交给上游 error 分支
    expect(out).toEqual(raw);
  });
});