/**
 * AdminFeedback — 用户反馈的本地 mock wrap。
 * 演示模式下, 走 useApiQuery('/api/admin/feedback/{list|tickets|topics|rules}') 时由本 handler 兜底。
 */
import { mockFeedbackList, mockFeedbackRules, mockFeedbackTickets, mockFeedbackTopics } from './fixtures';

type Handler<F> = (path: string, opts: any) => Promise<unknown> | unknown;

export function wrapMockHandlerWithAdminFeedback<F extends Handler<F>>(fallback: F): F {
  const wrapped = (async (path: string, opts: any) => {
    if (path === '/api/admin/feedback/list' && (!opts?.method || opts.method === 'GET')) {
      return mockFeedbackList;
    }
    if (path === '/api/admin/feedback/tickets' && (!opts?.method || opts.method === 'GET')) {
      return mockFeedbackTickets;
    }
    if (path === '/api/admin/feedback/topics' && (!opts?.method || opts.method === 'GET')) {
      return mockFeedbackTopics;
    }
    if (path === '/api/admin/feedback/rules' && (!opts?.method || opts.method === 'GET')) {
      return mockFeedbackRules;
    }
    return fallback(path, opts);
  }) as F;
  return wrapped;
}