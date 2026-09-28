/**
 * AdminWorkflows mock handler — 仅当 VITE_USE_DEMO 注入。
 * 真实链路走全局 mock.ts ladder;此 wrap 仅兜底 admin/workflows 端点。
 */
import type { Flow } from '@/api/admin/workflows/schema';
import { mockFlows } from '@/mock/admin/workflows.fixtures';

export function wrapMockHandlerWithAdminWorkflows<F extends (path: string, opts: any) => Promise<unknown>>(fallback: F): F {
  const wrapped = (async (path: string, opts: any) => {
    if (path === '/api/admin/workflows' && (!opts?.method || opts.method === 'GET')) {
      const list: Flow[] = mockFlows;
      return list;
    }
    return fallback(path, opts);
  }) as F;
  return wrapped;
}