import { describe, expect, it } from 'vitest';
import { camelizeKeys } from './camelizeKeys';

describe('camelizeKeys', () => {
  it('camelizes a flat object', () => {
    const out = camelizeKeys({ tenant_id: 't', workspace_id: 'w', created_at: 'now' });
    expect(out).toEqual({ tenantId: 't', workspaceId: 'w', createdAt: 'now' });
  });

  it('leaves already-camelCase keys alone', () => {
    const out = camelizeKeys({ tenantId: 't', workspaceId: 'w' });
    expect(out).toEqual({ tenantId: 't', workspaceId: 'w' });
  });

  it('recurses into nested objects', () => {
    const out = camelizeKeys({
      skill_id: 's1',
      metadata: { installed_by: 'admin', last_run_at: '2026-09-25' },
    });
    expect(out).toEqual({
      skillId: 's1',
      metadata: { installedBy: 'admin', lastRunAt: '2026-09-25' },
    });
  });

  it('recurses into arrays', () => {
    const out = camelizeKeys({
      items: [
        { skill_id: 'a', created_at: 'x' },
        { skill_id: 'b', created_at: 'y' },
      ],
      total_count: 2,
    });
    expect(out).toEqual({
      items: [
        { skillId: 'a', createdAt: 'x' },
        { skillId: 'b', createdAt: 'y' },
      ],
      totalCount: 2,
    });
  });

  it('handles null/undefined/primitives', () => {
    expect(camelizeKeys(null)).toBeNull();
    expect(camelizeKeys(undefined)).toBeUndefined();
    expect(camelizeKeys('hello')).toBe('hello');
    expect(camelizeKeys(42)).toBe(42);
    expect(camelizeKeys(true)).toBe(true);
  });

  it('handles arrays of primitives', () => {
    expect(camelizeKeys([1, 2, 3])).toEqual([1, 2, 3]);
    expect(camelizeKeys(['a', 'b'])).toEqual(['a', 'b']);
  });

  it('does not descend into class instances', () => {
    class Foo { bar = 1; }
    const f = new Foo();
    const out = camelizeKeys({ x: f });
    expect((out as { x: unknown }).x).toBe(f);
  });

  it('handles deeply nested structures', () => {
    const out = camelizeKeys({
      skill_response: {
          install_response: { run_token: 't1', expires_at_ms: 1000 },
        },
    });
    expect(out).toEqual({
      skillResponse: {
        installResponse: { runToken: 't1', expiresAtMs: 1000 },
      },
    });
  });
});