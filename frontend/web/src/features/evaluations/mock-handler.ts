/**
 * AdminEvaluations — 评测套件 / 结果的本地 mock wrap。
 * 演示模式下, 走 useApiQuery('/api/admin/evaluations/{suites|results}') 时由本 handler 兜底。
 */
import { mockEvalResults, mockEvalSuites } from './fixtures';

type Handler<F> = (path: string, opts: any) => Promise<unknown> | unknown;

export function wrapMockHandlerWithAdminEvaluations<F extends Handler<F>>(fallback: F): F {
  const wrapped = (async (path: string, opts: any) => {
    if (path === '/api/admin/evaluations/suites' && (!opts?.method || opts.method === 'GET')) {
      return mockEvalSuites;
    }
    if (path === '/api/admin/evaluations/results' && (!opts?.method || opts.method === 'GET')) {
      return mockEvalResults;
    }
    return fallback(path, opts);
  }) as F;
  return wrapped;
}