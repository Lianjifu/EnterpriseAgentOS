/**
 * 后端响应 → 前端约定的形状适配器。
 *
 * 适配分两层:
 * 1. **Per-path 适配** — 已知形状缺口(如 login)在这里写专门分支
 * 2. **通用 snake_case → camelCase** — 所有响应过一遍 camelizeKeys,
 *    避免每条路径单独写 adapter
 */
import type { HttpMethod } from './pathMap';
import { camelizeKeys } from './camelizeKeys';

type AnyRecord = Record<string, unknown>;

/**
 * 把后端 `{access_token, expires_at}` 折成前端 `Login.tsx` 期望的 `{token, user}`。
 * `user` 字段在登录响应中并不存在 —— 调用方应在收到此结果后立即
 * `GET /v1/identity/users/me` 二次拉取。本 adapter 仅保证字段名 + 形状对得上，
 * user.id/email/role/permissions 等具体值由前端 useAuthStore 合并。
 */
export interface LoginAdapterOutput {
  token: string;
  user: {
    id: string;
    email: string;
    role: string;
    tenantId: string;
    name: string;
    permissions: string[];
  };
  expiresAt: string;
}

function adaptLogin(rawData: unknown): LoginAdapterOutput | unknown {
  if (!rawData || typeof rawData !== 'object') return rawData;
  const r = rawData as AnyRecord;
  // 后端字段：access_token, expires_at；宽松接受 camelCase 也行
  const tokenRaw = r.access_token ?? r.accessToken;
  const expiresRaw = r.expires_at ?? r.expiresAt;
  if (typeof tokenRaw !== 'string') return rawData;
  return {
    token: tokenRaw,
    user: {
      id: '',
      email: '',
      role: 'user',
      tenantId: '',
      name: '',
      permissions: [],
    },
    expiresAt: typeof expiresRaw === 'string' ? expiresRaw : '',
  };
}

const PASSTHROUGH = (raw: unknown): unknown => raw;
void PASSTHROUGH;

/**
 * 按 (method, path) 选 adapter。
 * `path` 应当是已 translate 过的后端路径,方便统一匹配。
 */
export function applyResponseAdapter(
  method: HttpMethod,
  path: string,
  rawData: unknown,
): unknown {
  let adapted: unknown = rawData;
  // Per-path 适配(数量少且形状特殊的端点)
  if (method === 'POST' && path === '/v1/identity/login') {
    adapted = adaptLogin(rawData);
  }
  // 通用 snake_case → camelCase,适配后的对象再递归改 key
  // (login adapter 已经是 camelCase 形状,这里 idempotent)
  return camelizeKeys(adapted);
}