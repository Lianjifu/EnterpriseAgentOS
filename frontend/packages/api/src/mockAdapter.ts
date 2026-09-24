/**
 * 把现有 mockHandler 包装一层，让 mock 模式与真模式走同一套 responseAdapters，
 * 保证两种模式下 Login.tsx 收到的形状完全一致。
 *
 * 注意：mockHandler 内部已经处理 `/api/auth/login`，但其返回的是 mock 自洽形状
 * （`{token, user}`），与后端不同；本包装层会在 translated 路径命中 login 时
 * 同样把它折形 —— 因为 mock 的 `{token, user}` 已是前端形状，adapter 是
 * idempotent 的（看到 access_token 才折，否则 passthrough），不影响。
 */
import { mockHandler } from './mock';
import type { RequestOptions } from './index';
import { applyResponseAdapter } from './responseAdapters';
import { translateApiPath, type HttpMethod } from './pathMap';

export async function mockHandlerWithAdapters(
  path: string,
  opts: RequestOptions = {},
): Promise<unknown> {
  const raw = await mockHandler(path, opts);
  // mock 模式下既要让原 `/api/...` 路径命中 mock 的 if/else ladder，
  // 又要把响应形状与真模式对齐。translateApiPath 在这里仅用来取 method
  // 和归一化 path（mock 内部很多用 `path.match(/^\/api\/.../i)`，
  // 翻译后的 `/v1/...` 不会被 mock 命中 —— 所以这里**故意传原 path**）。
  const method = (opts.method?.toUpperCase() ?? 'GET') as HttpMethod;
  return applyResponseAdapter(method, path, raw);
}

// 同时导出一个 noop 占位便于调试
export const _translateMockPath = (p: string) => translateApiPath(p);