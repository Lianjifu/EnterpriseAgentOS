/**
 * 用户侧「我的知识」mock handler — 在 demo 模式下接管 /api/knowledge/docs。
 *
 * mock.ts 兜底返回的是 KnowledgeDoc[](知识工程运营工作台结构,字段为
 * id/title/source/sizeKb/chunks/citeCount/status/updatedAt/workspaceId 等),
 * 与用户侧 KnowledgeResource(必须有 tags/kind/description/owner/excerpt)不兼容。
 * 因此在 demo 链最前端拦截,返回 mockKnowledgeResources。
 *
 * 装配见 src/main.tsx → installApiClient。
 */
import type { KnowledgeResource } from './schema';
import { mockKnowledgeResources } from './fixtures';

function withDelay<T>(value: T, ms = 60): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

export function wrapMockHandlerWithUserKnowledge<F extends (path: string, opts: any) => Promise<unknown>>(fallback: F): F {
  const wrapped = (async (path: string, opts: any) => {
    const method = (opts?.method ?? 'GET').toUpperCase();
    if (method === 'GET' && path === '/api/knowledge/docs') {
      const list: KnowledgeResource[] = mockKnowledgeResources.map((r) => ({ ...r, tags: [...r.tags] }));
      return withDelay(list);
    }
    return fallback(path, opts);
  }) as F;
  return wrapped;
}