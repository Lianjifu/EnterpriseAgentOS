/**
 * AdminOperations mock handler — GET 5 个端点;写操作(state mutation)在客户端完成。
 */
import {
  mockIncidents, mockKindStats, mockSessions, mockSpans,
} from './fixtures';

const withDelay = <T>(value: T, ms = 120) =>
  new Promise<T>((resolve) => setTimeout(() => resolve(value), ms));

export function wrapMockHandlerWithAdminOperations(fallback: (path: string, opts: any) => Promise<unknown> | unknown) {
  return async (path: string, opts: any = {}) => {
    const method = (opts?.method ?? 'GET').toUpperCase();
    if (method !== 'GET') return fallback(path, opts);
    if (path === '/api/admin/operations/sessions') return withDelay(mockSessions);
    if (path === '/api/admin/operations/spans') return withDelay(mockSpans);
    if (path === '/api/admin/operations/incidents') return withDelay(mockIncidents);
    if (path === '/api/admin/operations/kind-stats') return withDelay(mockKindStats);
    return fallback(path, opts);
  };
}