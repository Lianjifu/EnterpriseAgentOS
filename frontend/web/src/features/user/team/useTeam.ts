/**
 * 用户侧「我的协作」hooks — 团队成员 + 共享内容 + 邀请协作者。
 * 端点 /api/user/team 由 features/user/team/mock-handler.ts 接管(全局 mock.ts 无覆盖)。
 */
import { useApiQuery, useApiMutation } from '@/services/query';
import { qk } from '@/api/shared/query-keys';
import type { Member, SharedItem, Team, InviteMemberVars } from './schema';

const PATH = '/api/user/team';

export function useTeams() {
  return useApiQuery<Team[]>(
    [qk.user.team.root, 'teams'],
    `${PATH}/teams`,
    undefined,
    { staleTime: 60_000 },
  );
}

export function useMembers() {
  return useApiQuery<Member[]>(
    [...qk.user.team.members],
    `${PATH}/members`,
    undefined,
    { staleTime: 30_000, placeholderData: (prev) => prev },
  );
}

export function useSharedItems() {
  return useApiQuery<SharedItem[]>(
    [...qk.user.team.shared],
    `${PATH}/shared`,
    undefined,
    { staleTime: 30_000, placeholderData: (prev) => prev },
  );
}

export function useInviteMember() {
  return useApiMutation<Member, InviteMemberVars>(
    () => `${PATH}/invite`,
    { invalidateKeys: [qk.user.team.root] },
    'POST',
  );
}