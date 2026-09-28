/**
 * 用户侧「我的知识」hooks — 资料列表 + 收藏切换 + 提问。
 * 真实端点 /api/knowledge/docs 在 demo 模式下由 user-knowledge-mock-handler.ts
 * 接管,返回 KnowledgeResource[];提问走本地的回放。
 */
import { useApiQuery, useApiMutation } from '@/services/query';
import { qk } from '@/api/shared/query-keys';
import { withDefaults } from '@/api/shared/pagination';
import type {
  KnowledgeResource,
  KnowledgeListParams,
  AskQuestionVars,
} from './schema';

const PATH = '/api/knowledge/docs';

export function useKnowledgeResources(params: KnowledgeListParams = {}) {
  const query = withDefaults(params);
  return useApiQuery<KnowledgeResource[]>(
    [...qk.user.knowledge.list, query],
    PATH,
    { query },
    { staleTime: 30_000, placeholderData: (prev) => prev },
  );
}

export function useAskQuestion() {
  return useApiMutation<{ question: string; resourceId: string }, AskQuestionVars>(
    () => `${PATH}/__noop__/ask`,
    { invalidateKeys: [qk.user.knowledge.history] },
    'POST',
  );
}