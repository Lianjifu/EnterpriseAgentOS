/**
 * Copilot 会话 hooks — 占位。`/api/sessions` 已在 mock.ts 注册但当前 UI
 * 仍以内置样例展示;`useSessions` 留作后续替换 useState 提供真实数据时使用。
 */
import { useApiQuery } from '@/services/query';
import { qk } from '@/api/shared/query-keys';
import { withDefaults } from '@/api/shared/pagination';
import type { CopilotSession, SessionsListParams } from './schema';

const PATH = '/api/sessions';

export function useSessions(params: SessionsListParams = {}) {
  const query = withDefaults(params);
  return useApiQuery<CopilotSession[]>(
    [...qk.user.copilot.sessions, query],
    PATH,
    { query },
    { staleTime: 30_000, placeholderData: (prev) => prev },
  );
}