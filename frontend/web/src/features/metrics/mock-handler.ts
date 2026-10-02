/**
 * AdminMetrics mock handler — 5 个 GET 端点;状态变更(启停阈值/收藏看板/创建看板)在客户端完成。
 */
import {
  mockCostBreakdown, mockLatencyPoints, mockMetricsDashboards, mockModelMetrics, mockThresholdRules,
} from './fixtures';

const withDelay = <T>(value: T, ms = 120) =>
  new Promise<T>((resolve) => setTimeout(() => resolve(value), ms));

export function wrapMockHandlerWithAdminMetrics(fallback: (path: string, opts: any) => Promise<unknown> | unknown) {
  return async (path: string, opts: any = {}) => {
    const method = (opts?.method ?? 'GET').toUpperCase();
    if (method !== 'GET') return fallback(path, opts);
    if (path === '/api/admin/metrics/models') return withDelay(mockModelMetrics);
    if (path === '/api/admin/metrics/latency') return withDelay(mockLatencyPoints);
    if (path === '/api/admin/metrics/cost-breakdown') return withDelay(mockCostBreakdown);
    if (path === '/api/admin/metrics/dashboards') return withDelay(mockMetricsDashboards);
    if (path === '/api/admin/metrics/thresholds') return withDelay(mockThresholdRules);
    return fallback(path, opts);
  };
}