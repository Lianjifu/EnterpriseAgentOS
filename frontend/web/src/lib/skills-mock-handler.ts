/**
 * 本地 mock handler — 接管 demo 模式下的 /api/user/skills。
 * 技能管理 /api/admin/skills 在 features/skills/mock-handler.ts。
 */
import type { Capability } from '@/api/user/skills/schema';
import { mockCapabilities } from '@/mock/user/skills.fixtures';

const capabilities: Capability[] = [...mockCapabilities];

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

function withDelay<T>(value: T): Promise<T> {
  return sleep(60).then(() => value);
}

function matches(path: string, prefix: string) {
  return path === prefix || path.startsWith(`${prefix}/`);
}

export async function skillsMockHandler(
  path: string,
  opts: { method?: string; body?: unknown },
): Promise<unknown> {
  const method = opts.method?.toUpperCase() ?? 'GET';

  // User-side /api/user/skills
  if (matches(path, '/api/user/skills')) {
    if (method === 'GET' && path === '/api/user/skills') {
      return withDelay(capabilities.map((c) => ({ ...c })));
    }
    const favMatch = /^\/api\/user\/skills\/([^/]+)\/favorite$/.exec(path);
    if (favMatch && method === 'POST') {
      const id = favMatch[1];
      const body = (opts.body ?? {}) as { on?: boolean };
      const cap = capabilities.find((c) => c.id === id);
      if (cap) cap.lastUsed = body.on ? '已收藏' : cap.lastUsed;
      return withDelay({ id, on: Boolean(body.on) });
    }
    const useMatch = /^\/api\/user\/skills\/([^/]+)\/record-use$/.exec(path);
    if (useMatch && method === 'POST') {
      return withDelay({ id: useMatch[1], recordedAt: new Date().toISOString() });
    }
    const detailMatch = /^\/api\/user\/skills\/([^/]+)$/.exec(path);
    if (detailMatch && method === 'GET') {
      const cap = capabilities.find((c) => c.id === detailMatch[1]);
      if (!cap) throw new Error('E_NOT_FOUND: 能力不存在');
      return withDelay({ ...cap });
    }
  }

  return undefined;
}

/** 在 demo 模式下包裹默认 mockHandler,先试本地 skills handler,再 fallback */
export function wrapMockHandlerWithSkills(
  fallback: (path: string, opts: any) => Promise<unknown>,
) {
  return async (path: string, opts: any) => {
    const local = await skillsMockHandler(path, opts);
    if (local !== undefined) return local;
    return fallback(path, opts);
  };
}