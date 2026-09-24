/**
 * 后端响应 → 前端约定的形状适配器。
 *
 * 仅覆盖 proof-of-pattern 阶段已知的形状缺口；其余路径默认 passthrough，
 * 由消费方在编译期（@de/web-types）看到字段差异。
 */
import type { HttpMethod } from './pathMap';

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

/**
 * 按 (method, path) 选 adapter。
 * `path` 应当是已 translate 过的后端路径，方便统一匹配。
 */
export function applyResponseAdapter(
  method: HttpMethod,
  path: string,
  rawData: unknown,
): unknown {
  if (method === 'POST' && path === '/v1/identity/login') {
    return adaptLogin(rawData);
  }
  // 占位：后续补其他形状适配时在这里加分支
  void PASSTHROUGH;
  return rawData;
}