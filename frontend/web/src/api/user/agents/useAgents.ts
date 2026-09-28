/**
 * 用户侧「智能体库」hooks — 列表 + 收藏切换。
 * 真实端点用 /api/agents (mock.ts 已覆盖)。
 */
import { useApiQuery, useApiMutation } from '@/services/query';
import { qk } from '@/api/shared/query-keys';
import { withDefaults } from '@/api/shared/pagination';
import type { Agent, AgentListParams, ToggleFavoriteVars } from './schema';

const PATH = '/api/agents';

export function useAgents(params: AgentListParams = {}) {
  const query = withDefaults(params);
  return useApiQuery<Agent[]>(
    [...qk.user.agents.list, query],
    PATH,
    { query },
    { staleTime: 30_000, placeholderData: (prev) => prev },
  );
}

export function useToggleAgentFavorite() {
  return useApiMutation<Agent, ToggleFavoriteVars>(
    (vars) => `${PATH}/${vars.id}/favorite`,
    { invalidateKeys: [qk.user.agents.root] },
    'POST',
  );
}