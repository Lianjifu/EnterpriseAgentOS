/**
 * 用户侧 Catalog 投影 mock — 从管理端内存 store 过滤并映射为用户 DTO。
 * 端点：/api/catalog/{agents,skills,workflows,knowledge}
 * 兼容旧用户路径，避免遗漏未改完的 hook。
 */
import { listAdminAgents } from '@/features/agents/mock-handler';
import { listAdminSkills } from '@/features/skills/mock-handler';
import { listAdminWorkflows } from '@/features/workflows/mock-handler';
import { listAdminKnowledge } from '@/features/knowledge/mock-handler';
import {
  projectOpenAgents,
  projectOpenSkills,
  projectOpenWorkflows,
  projectKnowledgeDocs,
} from './mappers';
import type { FlowRun } from '@/features/user/automations/schema';

type MockOpts = { method?: string; body?: unknown; query?: Record<string, unknown> };

const runState: { runs: FlowRun[] } = {
  runs: [
    { id: 'run-seed-1', name: '销售周报自动整理', time: '今天 09:42', result: '已完成' },
    { id: 'run-seed-2', name: '客户投诉自动分流', time: '昨天 16:18', result: '已完成' },
  ],
};

function withDelay<T>(value: T, ms = 40): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

function uid(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

function listAgents() {
  return projectOpenAgents(listAdminAgents());
}

function listSkills() {
  return projectOpenSkills(listAdminSkills());
}

function listWorkflows() {
  return projectOpenWorkflows(listAdminWorkflows());
}

function listKnowledge() {
  const { kbs, docs } = listAdminKnowledge();
  return projectKnowledgeDocs(kbs, docs);
}

export async function catalogMockHandler(path: string, opts: MockOpts): Promise<unknown> {
  const method = (opts.method ?? 'GET').toUpperCase();

  if (method === 'GET' && (path === '/api/catalog/agents' || path === '/api/agents')) {
    return withDelay(listAgents());
  }

  if (method === 'GET' && (path === '/api/catalog/skills' || path === '/api/user/skills')) {
    return withDelay(listSkills());
  }
  const skillDetail = /^\/api\/(?:catalog|user)\/skills\/([^/]+)$/.exec(path);
  if (method === 'GET' && skillDetail) {
    const skill = listSkills().find((item) => item.id === skillDetail[1]);
    if (!skill) throw Object.assign(new Error('skill not found'), { status: 404 });
    return withDelay(skill);
  }
  const skillFav = /^\/api\/(?:catalog|user)\/skills\/([^/]+)\/favorite$/.exec(path);
  if (method === 'POST' && skillFav) {
    return withDelay({ id: skillFav[1], on: Boolean((opts.body as { on?: boolean } | undefined)?.on) });
  }
  const skillUse = /^\/api\/(?:catalog|user)\/skills\/([^/]+)\/record-use$/.exec(path);
  if (method === 'POST' && skillUse) {
    return withDelay({ id: skillUse[1], recordedAt: new Date().toISOString() });
  }

  if (method === 'GET' && (path === '/api/catalog/workflows' || path === '/api/user/automations')) {
    return withDelay(listWorkflows());
  }
  if (method === 'GET' && (path === '/api/catalog/workflows/__runs__' || path === '/api/user/automations/__runs__')) {
    return withDelay(runState.runs.slice());
  }
  const flowRun = /^\/api\/(?:catalog\/workflows|user\/automations)\/([^/]+)\/run$/.exec(path);
  if (method === 'POST' && flowRun) {
    const flow = listWorkflows().find((item) => item.id === flowRun[1]);
    if (!flow) throw Object.assign(new Error('workflow not found'), { status: 404 });
    if (flow.availability !== 'available') throw Object.assign(new Error('workflow unavailable'), { status: 400 });
    const note = (opts.body as { note?: string } | undefined)?.note?.trim();
    const run: FlowRun = {
      id: uid('local'),
      name: flow.name,
      time: '刚刚 · 本地演示',
      result: note ? '已记录使用说明' : '演示完成',
    };
    runState.runs = [run, ...runState.runs];
    return withDelay(run);
  }
  const flowFav = /^\/api\/(?:catalog\/workflows|user\/automations)\/([^/]+)\/favorite$/.exec(path);
  if (method === 'POST' && flowFav) {
    return withDelay({ id: flowFav[1], on: Boolean((opts.body as { on?: boolean } | undefined)?.on) });
  }

  if (method === 'GET' && (path === '/api/catalog/knowledge' || path === '/api/knowledge/docs')) {
    return withDelay(listKnowledge());
  }
  const askMatch = /^\/api\/(?:catalog\/knowledge|knowledge\/docs)\/__noop__\/ask$/.exec(path);
  if (method === 'POST' && askMatch) {
    const question = (opts.body as { question?: string } | undefined)?.question ?? '';
    const resources = listKnowledge();
    const hit = resources.find((item) => `${item.title} ${item.tags.join(' ')} ${item.description}`.includes(question)) ?? resources[0];
    return withDelay({ question, resourceId: hit?.id ?? '' });
  }

  return undefined;
}

export function wrapMockHandlerWithCatalog(fallback: (path: string, opts: any) => Promise<unknown>) {
  return async (path: string, opts: any) => {
    const local = await catalogMockHandler(path, opts);
    if (local !== undefined) return local;
    return fallback(path, opts);
  };
}
