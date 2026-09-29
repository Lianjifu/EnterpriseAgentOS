/**
 * 用户侧「我的工作流」hooks — 列表 + 收藏 + 运行记录。
 * 端点 /api/user/automations 由 web/src/lib/automations-mock-handler.ts 接管,
 * 因为全局 mock.ts ladder 没有这个端点。
 */
import { useApiQuery, useApiMutation } from '@/services/query';
import { qk } from '@/api/shared/query-keys';
import { withDefaults } from '@/api/shared/pagination';
import type { Flow, FlowRun, FlowListParams, ToggleFavoriteVars, RecordRunVars } from './schema';

const PATH = '/api/user/automations';

export function useFlows(params: FlowListParams = {}) {
  const query = withDefaults(params);
  return useApiQuery<Flow[]>(
    [...qk.user.automations.list, query],
    PATH,
    { query },
    { staleTime: 30_000, placeholderData: (prev) => prev },
  );
}

export function useFlowRuns() {
  return useApiQuery<FlowRun[]>(
    [...qk.user.automations.runs],
    `${PATH}/__runs__`,
    undefined,
    { staleTime: 30_000 },
  );
}

export function useToggleFlowFavorite() {
  return useApiMutation<Flow, ToggleFavoriteVars>(
    (vars) => `${PATH}/${vars.id}/favorite`,
    { invalidateKeys: [qk.user.automations.root] },
    'POST',
  );
}

export function useRecordFlowRun() {
  return useApiMutation<FlowRun, RecordRunVars>(
    (vars) => `${PATH}/${vars.flowId}/run`,
    { invalidateKeys: [qk.user.automations.runs, qk.user.automations.root] },
    'POST',
  );
}