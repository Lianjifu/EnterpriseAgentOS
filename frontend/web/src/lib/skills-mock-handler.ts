/**
 * 本地 mock handler — 在 web 端接管 demo 模式下的 /api/user/skills 与 /api/admin/skills 调用。
 * 其他路径走 `mockHandlerWithAdapters`(默认仓库内 mock)。
 * 装配见 `src/main.tsx → installApiClient`。
 */
import type { Capability } from '@/api/user/skills/schema';
import type {
  Skill,
  CreateSkillVars,
  UpdateSkillVars,
  BulkPublishVars,
} from '@/api/admin/skills/schema';
import { mockCapabilities } from '@/mock/user/skills.fixtures';
import { mockAdminSkills } from '@/mock/admin/skills.fixtures';

interface MockState {
  capabilities: Capability[];
  skills: Skill[];
}

const state: MockState = {
  capabilities: [...mockCapabilities],
  skills: [...mockAdminSkills],
};

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

function uid(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}`;
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
      return withDelay(state.capabilities.map((c) => ({ ...c })));
    }
    const favMatch = /^\/api\/user\/skills\/([^/]+)\/favorite$/.exec(path);
    if (favMatch && method === 'POST') {
      const id = favMatch[1];
      const body = (opts.body ?? {}) as { on?: boolean };
      const cap = state.capabilities.find((c) => c.id === id);
      if (cap) cap.lastUsed = body.on ? '已收藏' : cap.lastUsed;
      return withDelay({ id, on: Boolean(body.on) });
    }
    const useMatch = /^\/api\/user\/skills\/([^/]+)\/record-use$/.exec(path);
    if (useMatch && method === 'POST') {
      return withDelay({ id: useMatch[1], recordedAt: new Date().toISOString() });
    }
    const detailMatch = /^\/api\/user\/skills\/([^/]+)$/.exec(path);
    if (detailMatch && method === 'GET') {
      const cap = state.capabilities.find((c) => c.id === detailMatch[1]);
      if (!cap) throw new Error('E_NOT_FOUND: 能力不存在');
      return withDelay({ ...cap });
    }
  }

  // Admin-side /api/admin/skills
  if (matches(path, '/api/admin/skills')) {
    if (method === 'GET' && path === '/api/admin/skills') {
      return withDelay(state.skills.map((s) => ({ ...s })));
    }
    if (method === 'POST' && path === '/api/admin/skills') {
      const body = (opts.body ?? {}) as CreateSkillVars;
      const next: Skill = {
        id: uid('skill'),
        name: body.name,
        description: body.description,
        type: body.type,
        owner: body.owner,
        status: 'draft',
        version: 'draft',
        lastUpdate: '刚刚',
        calls: 0,
        successRate: 0,
        errorRate: 0,
        avgLatencyMs: 0,
        rating: 0,
        risk: body.risk,
        needConfirm: body.needConfirm || body.risk !== 'low',
        visibleScope: ['部门'],
        tags: [],
        starred: false,
        inputSchema: body.inputSchema ?? [],
        outputSchema: body.outputSchema ?? [],
        versions: [],
        trend: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        usedByAgents: [],
        auditLog: [{ time: '刚刚', actor: body.owner, action: '新建技能' }],
      };
      state.skills = [next, ...state.skills];
      return withDelay({ ...next });
    }
    if (method === 'POST' && path === '/api/admin/skills/bulk') {
      const body = (opts.body ?? {}) as BulkPublishVars;
      state.skills = state.skills.map((s) =>
        body.ids.includes(s.id)
          ? { ...s, status: body.action === 'publish' ? 'published' : 'retired', lastUpdate: '刚刚' }
          : s,
      );
      return withDelay({ affected: body.ids.length });
    }
    const detailMatch = /^\/api\/admin\/skills\/([^/]+)$/.exec(path);
    if (detailMatch) {
      const id = detailMatch[1];
      if (method === 'GET') {
        const skill = state.skills.find((s) => s.id === id);
        if (!skill) throw new Error('E_NOT_FOUND: 技能不存在');
        return withDelay({ ...skill });
      }
      if (method === 'PATCH') {
        const body = (opts.body ?? {}) as UpdateSkillVars;
        state.skills = state.skills.map((s) =>
          s.id === id ? { ...s, ...body.patch, lastUpdate: '刚刚' } : s,
        );
        return withDelay({ ...state.skills.find((s) => s.id === id)! });
      }
      if (method === 'DELETE') {
        state.skills = state.skills.filter((s) => s.id !== id);
        return withDelay({ ok: true as const, id });
      }
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