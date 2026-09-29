/**
 * AdminWorkflows hooks — useApiQuery 拉取工作流列表; mutation 走本地 mock 包装。
 */
import { useApiQuery } from '@/services/query';
import { qk } from '@/api/shared/query-keys';
import type { Flow, WorkflowStats } from './schema';

export function useWorkflows() {
  return useApiQuery<Flow[]>(
    [...qk.admin.workflows.list],
    '/api/admin/workflows',
    undefined,
    { staleTime: 60_000 },
  );
}

export function useWorkflow(id: string | null) {
  return useApiQuery<Flow | null>(
    [...qk.admin.workflows.list, id ?? 'none'],
    id ? `/api/admin/workflows/${id}` : '/api/admin/workflows/__noop__',
    undefined,
    { enabled: Boolean(id), staleTime: 60_000 },
  );
}

export function useWorkflowStats(flows: Flow[]): WorkflowStats {
  const total = flows.length;
  const published = flows.filter((f) => f.status === 'published').length;
  const draft = flows.filter((f) => f.status === 'draft').length;
  const calls = flows.reduce((sum, f) => sum + f.callCount, 0);
  return { total, published, draft, calls };
}