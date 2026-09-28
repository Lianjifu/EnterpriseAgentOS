/**
 * OverviewTab — 流程总览(搜索 + 状态过滤 + 卡片网格)。
 */
import { Plus, Search, Workflow } from 'lucide-react';
import type { Flow, FlowStatus, WorkflowStats } from '@/api/admin/workflows/schema';
import { FlowCard } from '../FlowCard';

const STATUSES: Array<{ id: FlowStatus | 'all'; label: string }> = [
  { id: 'all', label: '全部' },
  { id: 'draft', label: '草稿' },
  { id: 'graying', label: '灰度中' },
  { id: 'published', label: '已发布' },
  { id: 'retired', label: '已下线' },
];

interface OverviewTabProps {
  flows: Flow[];
  allFlows: Flow[];
  search: string;
  setSearch: (v: string) => void;
  statusFilter: FlowStatus | 'all';
  setStatusFilter: (v: FlowStatus | 'all') => void;
  onEnterEditor: (f: Flow) => void;
  onCopy: (f: Flow) => void;
  onPublish: (f: Flow) => void;
  onRetire: (f: Flow) => void;
  onView: (f: Flow) => void;
  onCreate: () => void;
  counts: WorkflowStats;
}

export function OverviewTab({
  flows, search, setSearch, statusFilter, setStatusFilter,
  onEnterEditor, onCopy, onPublish, onRetire, onView, onCreate, counts,
}: OverviewTabProps) {
  void counts;
  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h3 className="flex items-center gap-2 text-base font-semibold"><Workflow className="h-4 w-4 text-amber-600" />流程列表</h3>
            <p className="mt-1 text-xs text-[var(--text-muted)]">点击「编辑」进入画布,点击「查看」在右侧查看节点列表</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-full sm:max-w-xs">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="搜索流程名 / 团队 / 场景" className="h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-1)] pl-10 pr-3 text-sm outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--brand)]" />
            </div>
            <button type="button" onClick={onCreate} className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-[var(--brand)] px-4 text-xs font-semibold text-white hover:bg-[var(--brand-hover)]">
              <Plus className="h-4 w-4" />新建流程
            </button>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <div role="group" aria-label="流程状态筛选" className="flex gap-1 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-1">
            {STATUSES.map((s) => (
              <button key={s.id} type="button" aria-pressed={statusFilter === s.id} onClick={() => setStatusFilter(s.id)} className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${statusFilter === s.id ? 'bg-[var(--text)] text-[var(--surface-1)]' : 'text-[var(--text-muted)] hover:bg-[var(--bg-hover)]'}`}>
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          {flows.map((flow) => (
            <FlowCard
              key={flow.id}
              flow={flow}
              onEnterEditor={onEnterEditor}
              onCopy={onCopy}
              onPublish={onPublish}
              onRetire={onRetire}
              onView={onView}
            />
          ))}
        </div>
        {flows.length === 0 && (
          <div className="mt-5 rounded-2xl border border-dashed border-[var(--border-strong)] bg-[var(--surface-1)] p-12 text-center">
            <Search className="mx-auto h-6 w-6 text-[var(--text-muted)]" />
            <p className="mt-3 text-sm font-semibold">没有匹配的流程</p>
            <p className="mt-1 text-xs text-[var(--text-muted)]">尝试其他关键词或状态。</p>
          </div>
        )}
      </section>
    </div>
  );
}