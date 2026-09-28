/**
 * 分页 + 过滤参数 helper — 集中约定传给后端的 query string。
 * 列表 hook 默认把 `{ page, pageSize, ...filters }` 传给 useApiQuery 的 query 参数,
 * 这里负责序列化与默认值。
 */
export interface PageQuery {
  page?: number;
  pageSize?: number;
}

export const DEFAULT_PAGE_SIZE = 20;

export function withDefaults<T extends Record<string, any>>(
  filters: T,
  options?: { page?: number; pageSize?: number },
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (options?.page !== undefined) out.page = options.page;
  if (options?.pageSize !== undefined) out.pageSize = options.pageSize;
  for (const [key, value] of Object.entries(filters)) {
    if (value === undefined || value === null) continue;
    if (typeof value === 'string' && value.trim() === '') continue;
    if (value === 'all') continue;
    out[key] = value;
  }
  return out;
}

export interface PageResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}