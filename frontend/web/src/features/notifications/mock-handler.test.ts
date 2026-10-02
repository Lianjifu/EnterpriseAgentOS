/**
 * Sanity check — verify admin-notifications-mock-handler returns fixture data
 * for each endpoint; mutations round-trip through the in-memory state.
 */
import { describe, expect, it } from 'vitest';
import { wrapMockHandlerWithAdminNotifications } from './mock-handler';

describe('admin-notifications-mock-handler', () => {
  it('returns channel/webhook/group/event lists', async () => {
    const fallback = async () => undefined;
    const wrap = wrapMockHandlerWithAdminNotifications(fallback);
    expect((await wrap('/api/admin/notifications/channels', { method: 'GET' })) as Array<unknown>).toHaveLength(7);
    expect((await wrap('/api/admin/notifications/webhooks', { method: 'GET' })) as Array<unknown>).toHaveLength(3);
    expect((await wrap('/api/admin/notifications/groups', { method: 'GET' })) as Array<unknown>).toHaveLength(3);
    expect((await wrap('/api/admin/notifications/events', { method: 'GET' })) as Array<unknown>).toHaveLength(6);
  });

  it('creates a channel via POST and returns it', async () => {
    const fallback = async () => undefined;
    const wrap = wrapMockHandlerWithAdminNotifications(fallback);
    const before = (await wrap('/api/admin/notifications/channels', { method: 'GET' })) as Array<unknown>;
    const created = (await wrap('/api/admin/notifications/channels', {
      method: 'POST',
      body: { name: 'X', kind: 'email', target: 'x@example.com' },
    })) as { id: string; name: string };
    expect(created.name).toBe('X');
    const after = (await wrap('/api/admin/notifications/channels', { method: 'GET' })) as Array<unknown>;
    expect(after.length).toBe(before.length + 1);
  });
});