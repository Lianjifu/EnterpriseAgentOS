/**
 * AdminOverview mock handler — 提供 /api/admin/overview/{summary,trend/:range,alerts} 端点。
 */
import type { OverviewSummary, Range } from './schema';
import { mockAlerts, mockOverviewSummary, mockTrendByRange } from './fixtures';

function withDelay<T>(value: T, ms = 120) {
  return new Promise<T>((resolve) => setTimeout(() => resolve(value), ms));
}

export function wrapMockHandlerWithAdminOverview(
  fallback: (path: string, opts: any) => Promise<unknown> | unknown,
) {
  return async (path: string, opts: any = {}) => {
    const method = (opts?.method ?? 'GET').toUpperCase();
    if (method !== 'GET') return fallback(path, opts);
    if (path === '/api/admin/overview/summary') return withDelay<OverviewSummary>(mockOverviewSummary);
    if (path === '/api/admin/overview/alerts') return withDelay(mockAlerts);
    const trendMatch = /^\/api\/admin\/overview\/trend\/([\w]+)$/.exec(path);
    if (trendMatch) {
      const range = trendMatch[1] as Range;
      return withDelay(mockTrendByRange[range] ?? mockTrendByRange['24h']);
    }
    return fallback(path, opts);
  };
}