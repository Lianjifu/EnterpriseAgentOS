/**
 * 管理侧「额度管理」mock handler — 接管 /api/admin/quotas/* 端点。
 * dev:demo 注入;prod 永不触达。
 */
import { mockBudgets, mockDepartments, mockUsage, mockAlerts } from '@/mock/admin/quotas.fixtures';
import type {
  EnterpriseBudget, AlertRule,
  CreateBudgetVars, CreateAlertVars, UpdateBudgetVars, ToggleAlertVars,
} from '@/api/admin/quotas/schema';

type MockOpts = { method?: string; body?: unknown; query?: Record<string, unknown> };
type MockFn = (path: string, opts: MockOpts) => Promise<unknown>;

const state = {
  budgets: [...mockBudgets] as EnterpriseBudget[],
  departments: [...mockDepartments],
  usage: [...mockUsage],
  alerts: [...mockAlerts] as AlertRule[],
};

function withDelay<T>(value: T, ms = 60): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

function uid(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

export async function adminQuotasMockHandler(path: string, opts: MockOpts): Promise<unknown> {
  const method = (opts.method ?? 'GET').toUpperCase();

  if (method === 'GET' && path === '/api/admin/quotas/budgets') return withDelay(state.budgets.slice());
  if (method === 'GET' && path === '/api/admin/quotas/departments') return withDelay(state.departments.slice());
  if (method === 'GET' && path === '/api/admin/quotas/usage') return withDelay(state.usage.slice());
  if (method === 'GET' && path === '/api/admin/quotas/alerts') return withDelay(state.alerts.slice());

  if (method === 'POST' && path === '/api/admin/quotas/budgets') {
    const v = (opts.body ?? {}) as CreateBudgetVars;
    const created: EnterpriseBudget = {
      id: uid('bg'),
      name: v.name,
      period: v.period,
      totalCap: v.totalCap,
      used: 0,
      forecast: 0,
      rollover: v.rollover,
      alertThreshold: v.alertThreshold,
      status: 'healthy',
      effectiveDate: new Date().toISOString().slice(0, 10),
      owner: v.owner || '未指定',
      description: '由管理员手动创建',
    };
    state.budgets.unshift(created);
    return withDelay(created);
  }

  if (method === 'POST' && path === '/api/admin/quotas/alerts') {
    const v = (opts.body ?? {}) as CreateAlertVars;
    const created: AlertRule = {
      id: uid('al'),
      name: v.name,
      scope: v.scope,
      severity: v.severity,
      metric: v.metric,
      threshold: v.threshold,
      enabled: true,
      cooldown: v.cooldown,
      notify: v.notify.split(',').map((s) => s.trim()).filter(Boolean),
      lastTriggered: '—',
      description: '由管理员手动创建',
    };
    state.alerts.unshift(created);
    return withDelay(created);
  }

  const updateBudgetMatch = path.match(/^\/api\/admin\/quotas\/budgets\/([^/]+)$/);
  if (method === 'PATCH' && updateBudgetMatch) {
    const id = updateBudgetMatch[1];
    const v = (opts.body ?? {}) as UpdateBudgetVars;
    const target = state.budgets.find((b) => b.id === id);
    if (!target) return withDelay({ error: 'not found' }, 200);
    Object.assign(target, v.patch);
    return withDelay(target);
  }

  const toggleAlertMatch = path.match(/^\/api\/admin\/quotas\/alerts\/([^/]+)\/toggle$/);
  if (method === 'POST' && toggleAlertMatch) {
    const id = toggleAlertMatch[1];
    const a = state.alerts.find((x) => x.id === id);
    if (!a) return withDelay({ error: 'not found' }, 200);
    a.enabled = !a.enabled;
    return withDelay(a);
  }

  return undefined;
}

export function wrapMockHandlerWithAdminQuotas(fallback: (path: string, opts: any) => Promise<unknown>): (path: string, opts: any) => Promise<unknown> {
  return async (path, opts) => {
    const r = await adminQuotasMockHandler(path, opts);
    return r === undefined ? fallback(path, opts) : r;
  };
}