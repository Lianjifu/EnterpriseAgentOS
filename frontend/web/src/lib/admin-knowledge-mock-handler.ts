/**
 * 管理侧「知识管理」mock handler — 接管 /api/admin/knowledge/* 全套端点。
 * dev:demo 模式下由 main.tsx 一次性 compose;prod 永不触达。
 */
import { mockKbs, mockDocs, mockSources, mockTasks, mockEvalCases } from '@/mock/admin/knowledge.fixtures';
import type {
  Kb, Doc, Source, Task, EvalCase,
  CreateKbVars, CreateSourceVars, ToggleKbStatusVars, BatchKbVars,
  KbStatus,
} from '@/api/admin/knowledge/schema';

type MockOpts = { method?: string; body?: unknown; query?: Record<string, unknown> };
type MockFn = (path: string, opts: MockOpts) => Promise<unknown>;

const state = {
  kbs: [...mockKbs] as Kb[],
  docs: [...mockDocs] as Doc[],
  sources: [...mockSources] as Source[],
  tasks: [...mockTasks] as Task[],
  evalCases: [...mockEvalCases] as EvalCase[],
};

function withDelay<T>(value: T, ms = 60): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

function uid(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

function nextKbStatus(current: KbStatus): KbStatus {
  switch (current) {
    case 'paused': return 'indexed';
    case 'failed': return 'indexing';
    case 'indexing': return 'paused';
    case 'indexed': return 'paused';
  }
}

export async function adminKnowledgeMockHandler(path: string, opts: MockOpts): Promise<unknown> {
  const method = (opts.method ?? 'GET').toUpperCase();

  // list
  if (method === 'GET' && path === '/api/admin/knowledge/kbs') return withDelay(state.kbs.slice());
  const kbDetailMatch = path.match(/^\/api\/admin\/knowledge\/kbs\/([^/]+)$/);
  if (method === 'GET' && kbDetailMatch) {
    const id = kbDetailMatch[1];
    if (id === '__noop__') return null;
    const kb = state.kbs.find((k) => k.id === id);
    if (!kb) throw Object.assign(new Error('kb not found'), { status: 404 });
    return withDelay(kb);
  }
  if (method === 'GET' && path === '/api/admin/knowledge/docs') return withDelay(state.docs.slice());
  if (method === 'GET' && path === '/api/admin/knowledge/sources') return withDelay(state.sources.slice());
  if (method === 'GET' && path === '/api/admin/knowledge/tasks') return withDelay(state.tasks.slice());
  if (method === 'GET' && path === '/api/admin/knowledge/eval') return withDelay(state.evalCases.slice());

  // create kb
  if (method === 'POST' && path === '/api/admin/knowledge/kbs') {
    const v = (opts.body ?? {}) as CreateKbVars;
    const created: Kb = {
      id: uid('kb'),
      name: v.name,
      description: v.description,
      owner: '我',
      scope: v.scope,
      status: 'indexing',
      docCount: 0,
      vectorCount: 0,
      updatedAt: '刚刚',
      tags: [],
      tone: 'info',
      evalHitRate: 0,
    };
    state.kbs.unshift(created);
    return withDelay(created);
  }

  // create source
  if (method === 'POST' && path === '/api/admin/knowledge/sources') {
    const v = (opts.body ?? {}) as CreateSourceVars;
    const created: Source = {
      id: uid('src'),
      name: v.name,
      type: v.type,
      status: 'online',
      lastSync: '刚刚',
      schedule: v.schedule,
      itemCount: 0,
    };
    state.sources.unshift(created);
    return withDelay(created);
  }

  // toggle kb status
  const toggleMatch = path.match(/^\/api\/admin\/knowledge\/kbs\/([^/]+)\/toggle-status$/);
  if (method === 'POST' && toggleMatch) {
    const id = toggleMatch[1];
    const kb = state.kbs.find((k) => k.id === id);
    if (!kb) return withDelay({ error: 'not found' }, 200);
    kb.status = nextKbStatus(kb.status);
    kb.updatedAt = '刚刚';
    return withDelay(kb);
  }

  // batch
  if (method === 'POST' && path === '/api/admin/knowledge/kbs/__batch__') {
    const v = (opts.body ?? {}) as BatchKbVars;
    let affected = 0;
    if (v.action === 'pause') {
      state.kbs.forEach((k) => {
        if (v.ids.includes(k.id) && k.status !== 'paused') {
          k.status = 'paused';
          affected += 1;
        }
      });
    } else if (v.action === 'rebuild') {
      state.kbs.forEach((k) => {
        if (v.ids.includes(k.id)) {
          k.status = 'indexing';
          k.updatedAt = '刚刚';
          affected += 1;
        }
      });
    } else if (v.action === 'export') {
      affected = v.ids.length;
    }
    return withDelay({ affected });
  }

  return undefined;
}

export function wrapMockHandlerWithAdminKnowledge(fallback: MockFn): MockFn {
  return async (path, opts) => {
    const r = await adminKnowledgeMockHandler(path, opts);
    return r === undefined ? fallback(path, opts) : r;
  };
}