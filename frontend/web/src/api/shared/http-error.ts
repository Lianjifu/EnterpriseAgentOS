/**
 * HTTP 错误归一 — 把 useApiQuery / useApiMutation 抛出的任意错误(后端 ApiError /
 * axios / 普通 Error / 字符串)统一成可读的 `{ status, message }`。
 * 页面只需要 `normalizeError(err).message` 就能展示给用户。
 */
export interface NormalizedHttpError {
  status?: number;
  code?: string;
  message: string;
}

export function normalizeError(err: unknown): NormalizedHttpError {
  if (!err) return { message: '请求失败,请稍后再试' };
  if (typeof err === 'string') return { message: err };
  if (err instanceof Error) {
    const anyErr = err as Error & { status?: number; code?: string; data?: { message?: string } };
    return {
      status: anyErr.status,
      code: anyErr.code,
      message: anyErr.data?.message || anyErr.message || '请求失败,请稍后再试',
    };
  }
  if (typeof err === 'object') {
    const obj = err as { status?: number; code?: string; message?: string };
    return {
      status: obj.status,
      code: obj.code,
      message: obj.message || '请求失败,请稍后再试',
    };
  }
  return { message: '请求失败,请稍后再试' };
}