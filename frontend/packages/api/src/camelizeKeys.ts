/**
 * 把后端返回的 snake_case 响应字段递归转成前端约定的 camelCase。
 *
 * 后端所有 Pydantic DTO 都用 snake_case(tenant_id / workspace_id /
 * created_at / parameters_schema 等),前端 hooks/types 全用 camelCase
 * (tenantId / workspaceId / createdAt / parametersSchema)。每条路径都写
 * adapter 不现实,所以这里做一次**全响应**的递归改写。
 *
 * 设计要点:
 * - 只改 key,不改 value(值里若是嵌套 dict/array,继续递归)
 * - 已 camelCase 的 key 保持不变
 * - 顶层是数组时,数组每个元素都改
 * - 顶层是 null/undefined/string/number/boolean 时,原样返回
 *
 * 已知例外(不应被改写的字段):
 * - `_id` 结尾(例如 `user_id` → `userId`),由通用规则覆盖
 * - 大写缩写(例如 `HTTP_status` → `hTTPStatus`):后端不出现这种情况,跳过
 */

const SNAKE_RE = /_([a-z0-9])/g;

function camelizeKey(key: string): string {
  return key.replace(SNAKE_RE, (_, ch) => ch.toUpperCase());
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object') return false;
  if (Array.isArray(value)) return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

export function camelizeKeys<T = unknown>(input: T): T {
  if (input === null || input === undefined) return input;
  if (Array.isArray(input)) {
    return input.map((item) => camelizeKeys(item)) as unknown as T;
  }
  if (!isPlainObject(input)) return input;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(input)) {
    out[camelizeKey(k)] = camelizeKeys(v);
  }
  return out as T;
}