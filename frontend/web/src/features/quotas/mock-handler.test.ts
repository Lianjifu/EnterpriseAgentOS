/**
 * Sanity check — admin-quotas-mock-handler returns fixtures for each list
 * endpoint;create / update / toggle round-trip through in-memory state.
 */
import { describe, expect, it } from 'vitest';
import { wrapMockHandlerWithAdminQuotas } from './mock-handler';

describe('admin-quotas-mock-handler', () => {
  it('returns four list endpoints with seed counts', async () => {
    const fallback = async () => undefined;
    const wrap = wrapMockHandlerWithAdminQuotas(fallback);
    expect((await wrap('/api/admin/quotas/budgets', { method: 'GET' })) as unknown[]).toHaveLength(4);
    expect((await wrap('/api/admin/quotas/departments', { method: 'GET' })) as unknown[]).toHaveLength(6);
    expect((await wrap('/api/admin/quotas/usage', { method: 'GET' })) as unknown[]).toHaveLength(4);
    expect((await wrap('/api/admin/quotas/alerts', { method: 'GET' })) as unknown[]).toHaveLength(5);
  });

  it('creates a budget and an alert', async () => {
    const fallback = async () => undefined;
    const wrap = wrapMockHandlerWithAdminQuotas(fallback);
    const createdBudget = (await wrap('/api/admin/quotas/budgets', {
      method: 'POST',
      body: { name: 'Q3 营销预算', period: 'quarterly', totalCap: 80000, alertThreshold: 80, rollover: false, owner: '周宁' },
    })) as { id: string; name: string; status: string };
    expect(createdBudget.name).toBe('Q3 营销预算');
    expect(createdBudget.status).toBe('healthy');

    const createdAlert = (await wrap('/api/admin/quotas/alerts', {
      method: 'POST',
      body: { name: '测试告警', scope: 'department', severity: 'warning', metric: '使用率', threshold: 75, cooldown: '12h', notify: 'oncall@' },
    })) as { id: string; enabled: boolean; notify: string[] };
    expect(createdAlert.enabled).toBe(true);
    expect(createdAlert.notify).toEqual(['oncall@']);
  });

  it('toggles an alert and patches a budget', async () => {
    const fallback = async () => undefined;
    const wrap = wrapMockHandlerWithAdminQuotas(fallback);
    const beforeAlerts = (await wrap('/api/admin/quotas/alerts', { method: 'GET' })) as Array<{ id: string; enabled: boolean }>;
    const enabledBefore = beforeAlerts[0].enabled;
    const toggled = (await wrap(`/api/admin/quotas/alerts/${beforeAlerts[0].id}/toggle`, { method: 'POST' })) as { enabled: boolean };
    expect(toggled.enabled).toBe(!enabledBefore);

    const beforeBudgets = (await wrap('/api/admin/quotas/budgets', { method: 'GET' })) as Array<{ id: string }>;
    const patched = (await wrap(`/api/admin/quotas/budgets/${beforeBudgets[0].id}`, {
      method: 'PATCH',
      body: { id: beforeBudgets[0].id, patch: { totalCap: 999999 } },
    })) as { totalCap: number };
    expect(patched.totalCap).toBe(999999);
  });
});