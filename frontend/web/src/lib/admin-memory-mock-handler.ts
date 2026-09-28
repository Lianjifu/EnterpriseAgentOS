/**
 * AdminMemory mock handler — 5 个 GET 端点;L1/L2/L3 的状态变更 + 晋升 + 策略保存均在客户端做。
 */
import {
  mockL1Sessions, mockL2Facts, mockL3Entries, mockPromotions, mockRetentionPolicies,
} from '@/mock/admin/memory.fixtures';

const withDelay = <T>(value: T, ms = 120) =>
  new Promise<T>((resolve) => setTimeout(() => resolve(value), ms));

export function wrapMockHandlerWithAdminMemory(fallback: (path: string, opts: any) => Promise<unknown> | unknown) {
  return async (path: string, opts: any = {}) => {
    const method = (opts?.method ?? 'GET').toUpperCase();
    if (method !== 'GET') return fallback(path, opts);
    if (path === '/api/admin/memory/l1') return withDelay(mockL1Sessions);
    if (path === '/api/admin/memory/l2') return withDelay(mockL2Facts);
    if (path === '/api/admin/memory/l3') return withDelay(mockL3Entries);
    if (path === '/api/admin/memory/promotions') return withDelay(mockPromotions);
    if (path === '/api/admin/memory/policies') return withDelay(mockRetentionPolicies);
    return fallback(path, opts);
  };
}