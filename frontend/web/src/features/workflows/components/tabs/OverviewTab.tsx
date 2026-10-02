/**
 * OverviewTab — 工作流总览(FlowCard 网格 + 空态 + 分页)。
 *
 * 列表卡片顶部是搜索、状态和新建，和知识管理同一条工具栏。
 * 卡片点击进详情；底栏：编辑 / 发布 / 复制 / 下线。
 */
import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Plus, Search } from 'lucide-react';
import type { Flow, WorkflowTabId } from '../../schema';
import { FlowCard } from '../FlowCard';

const PAGE_SIZE = 8;

interface OverviewTabProps {
  flows: Flow[];
  statusTab: WorkflowTabId;
  onStatus: (next: WorkflowTabId) => void;
  search: string;
  onSearch: (next: string) => void;
  onCreate: () => void;
  onView: (id: string) => void;
  onEdit: (id: string) => void;
  onCopy: (f: Flow) => void;
  onPublish: (f: Flow) => void;
  onRetire: (f: Flow) => void;
}

export function OverviewTab({
  flows, statusTab, onStatus, search, onSearch, onCreate,
  onView, onEdit, onCopy, onPublish, onRetire,
}: OverviewTabProps) {
  const [page, setPage] = useState(1);

  // status 切换时重置 page 1
  useEffect(() => { setPage(1); }, [statusTab]);

  const total = flows.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageStart = total === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1;
  const pageEnd = Math.min(total, safePage * PAGE_SIZE);
  const pagedFlows = useMemo(() => flows.slice(pageStart - 1, pageEnd), [flows, pageStart, pageEnd]);

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
      <div className="grid gap-4 p-5 sm:grid-cols-2 xl:grid-cols-3">
        {pagedFlows.map((flow) => (
          <FlowCard
            key={flow.id}
            flow={flow}
            onView={onView}
            onEdit={onEdit}
            onCopy={onCopy}
            onPublish={onPublish}
            onRetire={onRetire}
          />
        ))}
      </div>
      {total === 0 && (
        <div className="border-t border-dashed border-[var(--border-strong)] p-12 text-center">
          <Search className="mx-auto h-6 w-6 text-[var(--text-muted)]" />
          <p className="mt-3 text-sm font-semibold">{emptyTitleForTab(statusTab)}</p>
          <p className="mt-1 text-xs text-[var(--text-muted)]">{emptyHintForTab(statusTab)}</p>
        </div>
      )}

      {total > 0 && totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-[var(--border)] px-5 py-3 text-xs">
          <p className="text-[var(--text-muted)]">
            第 <span className="font-semibold tabular-nums text-[var(--text-secondary)]">{pageStart}</span>-<span className="font-semibold tabular-nums text-[var(--text-secondary)]">{pageEnd}</span> 个 / 共 <span className="font-semibold tabular-nums text-[var(--text-secondary)]">{total}</span> 个
          </p>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setPage(Math.max(1, safePage - 1))}
              disabled={safePage <= 1}
              aria-label="上一页"
              className="inline-flex items-center gap-1 rounded-lg border border-[var(--border)] px-2.5 py-1 text-[11px] font-semibold text-[var(--text-secondary)] hover:border-[var(--brand)] hover:text-[var(--brand)] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft className="h-3 w-3" />上一页
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => {
              const active = n === safePage;
              return (
                <button
                  key={n}
                  type="button"
                  onClick={() => setPage(n)}
                  aria-current={active ? 'page' : undefined}
                  aria-label={`第 ${n} 页`}
                  className={`grid h-7 w-7 place-items-center rounded-lg text-[11px] font-semibold transition ${active ? 'bg-[var(--brand)] text-white' : 'border border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--brand)] hover:text-[var(--brand)]'}`}
                >
                  {n}
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => setPage(Math.min(totalPages, safePage + 1))}
              disabled={safePage >= totalPages}
              aria-label="下一页"
              className="inline-flex items-center gap-1 rounded-lg border border-[var(--border)] px-2.5 py-1 text-[11px] font-semibold text-[var(--text-secondary)] hover:border-[var(--brand)] hover:text-[var(--brand)] disabled:cursor-not-allowed disabled:opacity-40"
            >
              下一页<ChevronRight className="h-3 w-3" />
            </button>
          </div>
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