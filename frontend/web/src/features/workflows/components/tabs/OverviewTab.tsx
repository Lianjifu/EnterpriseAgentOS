/**
 * OverviewTab — 工作流列表 + 空态 + 分页（每页 10 条）。
 */
import { useEffect, useMemo, useState } from 'react';
import { Plus, Search } from 'lucide-react';
import { AdminListPagination, paginateItems } from '@/components/feedback/AdminListPagination';
import { AdminListHeader, AdminListHeaderMetrics } from '@/components/feedback/AdminListRow';
import type { Flow, WorkflowTabId } from '../../schema';
import { FlowCard } from '../FlowCard';

interface OverviewTabProps {
  flows: Flow[];
  statusTab: WorkflowTabId;
  onStatus: (next: WorkflowTabId) => void;
  search: string;
  onSearch: (next: string) => void;
  onCreate: () => void;
  onView: (id: string) => void;
  onCopy: (f: Flow) => void;
  onPublish: (f: Flow) => void;
  onRetire: (f: Flow) => void;
}

export function OverviewTab({
  flows, statusTab, onStatus, search, onSearch, onCreate,
  onView, onCopy, onPublish, onRetire,
}: OverviewTabProps) {
  const [page, setPage] = useState(1);
  useEffect(() => { setPage(1); }, [statusTab, search]);
  const paged = useMemo(() => paginateItems(flows, page), [flows, page]);

  return (
    <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)]">
      <div className="flex flex-col gap-2 border-b border-[var(--border)] px-4 py-3 sm:flex-row sm:items-center sm:px-5">
        <label className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            aria-label="搜索工作流"
            value={search}
            onChange={(event) => onSearch(event.target.value)}
            placeholder="搜索工作流名 / 团队 / 场景"
            className="h-9 w-full rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] pl-8 pr-3 text-sm outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--brand)]"
          />
        </label>
        <div className="flex shrink-0 items-center gap-2">
          <select
            aria-label="状态"
            value={statusTab}
            onChange={(event) => onStatus(event.target.value as WorkflowTabId)}
            className="h-9 rounded-lg border border-[var(--border)] bg-[var(--surface-1)] px-2.5 text-xs outline-none focus:border-[var(--brand)]"
          >
            <option value="all">全部</option>
            <option value="draft">草稿</option>
            <option value="published">已发布</option>
            <option value="retired">已下线</option>
          </select>
          <span className="text-xs tabular-nums text-[var(--text-muted)]">{flows.length} 个</span>
          <button type="button" onClick={onCreate} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[var(--brand)] px-3 text-xs font-semibold text-white hover:bg-[var(--brand-hover)]">
            <Plus className="h-3.5 w-3.5" />
            新建工作流
          </button>
        </div>
      </div>
      {paged.total > 0 ? (
        <>
          <AdminListHeader hasCheckbox={false} hasStar={false} metrics={<AdminListHeaderMetrics labels={['节点', '连线', '调用']} />} />
          <div className="divide-y divide-[var(--border)]">
            {paged.slice.map((flow) => (
              <FlowCard
                key={flow.id}
                flow={flow}
                onView={onView}
                onCopy={onCopy}
                onPublish={onPublish}
                onRetire={onRetire}
              />
            ))}
          </div>
          <AdminListPagination
            page={paged.safePage}
            totalPages={paged.totalPages}
            total={paged.total}
            pageStart={paged.pageStart}
            pageEnd={paged.pageEnd}
            onPageChange={setPage}
          />
        </>
      ) : (
        <div className="p-12 text-center">
          <Search className="mx-auto h-6 w-6 text-[var(--text-muted)]" />
          <p className="mt-3 text-sm font-semibold">{emptyTitleForTab(statusTab)}</p>
          <p className="mt-1 text-xs text-[var(--text-muted)]">{emptyHintForTab(statusTab)}</p>
        </div>
      )}
    </section>
  );
}

function emptyTitleForTab(tab: WorkflowTabId): string {
  if (tab === 'draft') return '没有草稿工作流';
  if (tab === 'published') return '没有已发布的工作流';
  if (tab === 'retired') return '没有已下线的工作流';
  return '没有匹配的工作流';
}

function emptyHintForTab(tab: WorkflowTabId): string {
  if (tab === 'draft') return '新建一个工作流开始设计。';
  if (tab === 'published') return '发布为工具后,工作流会出现在这里。';
  if (tab === 'retired') return '下线的工作流会在此处保留。';
  return '尝试其他关键词。';
}
