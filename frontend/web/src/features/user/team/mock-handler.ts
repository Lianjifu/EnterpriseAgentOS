/**
 * 本地 mock handler — 在 demo 模式下接管 /api/user/team 调用。
 * 其他路径走 mockHandlerWithAdapters。装配见 src/main.tsx → installApiClient。
 */
import type { Member, SharedItem, Team, InviteMemberVars } from './schema';
import { mockTeams, mockMembers, mockSharedItems } from './fixtures';

interface MockState {
  teams: Team[];
  members: Member[];
  shared: SharedItem[];
}

const state: MockState = {
  teams: [...mockTeams],
  members: [...mockMembers],
  shared: [...mockSharedItems],
};

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

function withDelay<T>(value: T): Promise<T> {
  return sleep(60).then(() => value);
}

function uid(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}`;
}

export async function teamMockHandler(
  path: string,
  opts: { method?: string; body?: unknown },
): Promise<unknown> {
  const method = opts.method?.toUpperCase() ?? 'GET';

  if (path === '/api/user/team/teams' && method === 'GET') {
    return withDelay(state.teams.map((team) => ({ ...team })));
  }
  if (path === '/api/user/team/members' && method === 'GET') {
    return withDelay(state.members.map((member) => ({ ...member })));
  }
  if (path === '/api/user/team/shared' && method === 'GET') {
    return withDelay(state.shared.map((item) => ({ ...item })));
  }
  if (path === '/api/user/team/invite' && method === 'POST') {
    const body = (opts.body ?? {}) as InviteMemberVars;
    const invitee = body.email.trim();
    if (!invitee) throw new Error('E_VALIDATION: 邮箱不能为空');
    const member: Member = {
      id: uid('local'),
      name: invitee,
      role: '待邀请 · 本地演示',
      team: body.team,
      initials: invitee.slice(0, 1).toUpperCase(),
      color: 'bg-[var(--brand-light)] text-[var(--brand)]',
    };
    state.members = [member, ...state.members];
    return withDelay({ ...member });
  }

  return undefined;
}

export function wrapMockHandlerWithTeam(
  fallback: (path: string, opts: any) => Promise<unknown>,
) {
  return async (path: string, opts: any) => {
    const local = await teamMockHandler(path, opts);
    if (local !== undefined) return local;
    return fallback(path, opts);
  };
}