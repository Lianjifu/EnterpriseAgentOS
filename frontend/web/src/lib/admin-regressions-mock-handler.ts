/**
 * AdminRegressions — 回归追踪的本地 mock wrap。
 * 演示模式下, 走 useApiQuery('/api/admin/regressions/{tracks|alerts|timeline}') 时由本 handler 兜底。
 */
import { mockRegressionAlerts, mockRegressionTimeline, mockRegressionTracks } from '@/mock/admin/regressions.fixtures';

type Handler<F> = (path: string, opts: any) => Promise<unknown> | unknown;

export function wrapMockHandlerWithAdminRegressions<F extends Handler<F>>(fallback: F): F {
  const wrapped = (async (path: string, opts: any) => {
    if (path === '/api/admin/regressions/tracks' && (!opts?.method || opts.method === 'GET')) {
      return mockRegressionTracks;
    }
    if (path === '/api/admin/regressions/alerts' && (!opts?.method || opts.method === 'GET')) {
      return mockRegressionAlerts;
    }
    if (path === '/api/admin/regressions/timeline' && (!opts?.method || opts.method === 'GET')) {
      return mockRegressionTimeline;
    }
    return fallback(path, opts);
  }) as F;
  return wrapped;
}