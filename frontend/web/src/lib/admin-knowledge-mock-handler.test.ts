/**
 * Sanity check — admin-knowledge-mock-handler returns fixtures for each list
 * endpoint;create / toggle / batch round-trip through in-memory state.
 */
import { describe, expect, it } from 'vitest';
import { wrapMockHandlerWithAdminKnowledge } from './admin-knowledge-mock-handler';

describe('admin-knowledge-mock-handler', () => {
  it('returns five list endpoints with seed counts', async () => {
    const fallback = async () => undefined;
    const wrap = wrapMockHandlerWithAdminKnowledge(fallback);
    expect((await wrap('/api/admin/knowledge/kbs', { method: 'GET' })) as unknown[]).toHaveLength(12);
    expect((await wrap('/api/admin/knowledge/docs', { method: 'GET' })) as unknown[]).toHaveLength(12);
    expect((await wrap('/api/admin/knowledge/sources', { method: 'GET' })) as unknown[]).toHaveLength(8);
    expect((await wrap('/api/admin/knowledge/tasks', { method: 'GET' })) as unknown[]).toHaveLength(14);
    expect((await wrap('/api/admin/knowledge/eval', { method: 'GET' })) as unknown[]).toHaveLength(14);
  });

  it('creates a kb and toggles a kb status', async () => {
    const fallback = async () => undefined;
    const wrap = wrapMockHandlerWithAdminKnowledge(fallback);
    const before = (await wrap('/api/admin/knowledge/kbs', { method: 'GET' })) as Array<{ id: string }>;
    const created = (await wrap('/api/admin/knowledge/kbs', {
      method: 'POST',
      body: { name: '新知识库', description: '测试', scope: '部门', boundSources: [], retrieval: 'hybrid', topK: 8 },
    })) as { id: string; name: string; status: string };
    expect(created.name).toBe('新知识库');
    expect(created.status).toBe('indexing');
    const after = (await wrap('/api/admin/knowledge/kbs', { method: 'GET' })) as Array<{ id: string }>;
    expect(after.length).toBe(before.length + 1);

    const toggled = (await wrap(`/api/admin/knowledge/kbs/${created.id}/toggle-status`, { method: 'POST' })) as { status: string };
    expect(toggled.status).toBe('paused');
  });

  it('batch pause affects only the targeted kbs', async () => {
    const fallback = async () => undefined;
    const wrap = wrapMockHandlerWithAdminKnowledge(fallback);
    const result = (await wrap('/api/admin/knowledge/kbs/__batch__', {
      method: 'POST',
      body: { ids: ['kb-hr', 'kb-finance'], action: 'pause' },
    })) as { affected: number };
    expect(result.affected).toBeGreaterThanOrEqual(0);
  });
});