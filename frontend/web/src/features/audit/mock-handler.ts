/**
 * AdminToolAudit mock handler — 5 个 GET 端点;状态变更(收藏/解决/启停规则)在客户端完成。
 */
import {
  mockAuditEntries, mockAuditRisks, mockAuditRules, mockPermissionScopes,
} from './fixtures';

const withDelay = <T>(value: T, ms = 120) =>
  new Promise<T>((resolve) => setTimeout(() => resolve(value), ms));

export function wrapMockHandlerWithAdminAudit(fallback: (path: string, opts: any) => Promise<unknown> | unknown) {
  return async (path: string, opts: any = {}) => {
    const method = (opts?.method ?? 'GET').toUpperCase();
    if (method !== 'GET') return fallback(path, opts);
    if (path === '/api/admin/audit/entries') return withDelay(mockAuditEntries);
    if (path === '/api/admin/audit/risks') return withDelay(mockAuditRisks);
    if (path === '/api/admin/audit/rules') return withDelay(mockAuditRules);
    if (path === '/api/admin/audit/scopes') return withDelay(mockPermissionScopes);
    return fallback(path, opts);
  };
}