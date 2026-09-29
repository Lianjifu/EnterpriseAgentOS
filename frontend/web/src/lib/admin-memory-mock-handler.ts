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
    const policyDetailMatch = /^\/api\/admin\/memory\/policies\/(.+)$/.exec(path);
    if (policyDetailMatch) {
      const id = decodeURIComponent(policyDetailMatch[1]);
      if (id === '__noop__') return withDelay(null);
      const policy = mockRetentionPolicies.find((p) => p.label === id);
      if (!policy) throw Object.assign(new Error('policy not found'), { status: 404 });
      return withDelay(policy);
    }
    const l1DetailMatch = /^\/api\/admin\/memory\/l1\/(.+)$/.exec(path);
    if (l1DetailMatch) {
      const id = decodeURIComponent(l1DetailMatch[1]);
      if (id === '__noop__') return withDelay(null);
      const item = mockL1Sessions.find((s) => s.id === id);
      if (!item) throw Object.assign(new Error('l1 session not found'), { status: 404 });
      return withDelay(item);
    }
    const l2DetailMatch = /^\/api\/admin\/memory\/l2\/(.+)$/.exec(path);
    if (l2DetailMatch) {
      const id = decodeURIComponent(l2DetailMatch[1]);
      if (id === '__noop__') return withDelay(null);
      const item = mockL2Facts.find((f) => f.id === id);
      if (!item) throw Object.assign(new Error('l2 fact not found'), { status: 404 });
      return withDelay(item);
    }
    const l3DetailMatch = /^\/api\/admin\/memory\/l3\/(.+)$/.exec(path);
    if (l3DetailMatch) {
      const id = decodeURIComponent(l3DetailMatch[1]);
      if (id === '__noop__') return withDelay(null);
      const item = mockL3Entries.find((k) => k.id === id);
      if (!item) throw Object.assign(new Error('l3 entry not found'), { status: 404 });
      return withDelay(item);
    }
    return fallback(path, opts);
  };
}