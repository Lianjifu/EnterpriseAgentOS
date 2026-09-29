/**
 * OverviewTab — 工作流总览(FlowCard 网格 + 空态 + 分页)。
 *
 * 父级(WorkflowsPage)持有 5 个状态 tab + 搜索 + 「新建工作流」按钮
 * 作为顶部导航;本组件只渲染卡片网格和分页,状态 tab 通过 `statusTab`
 * 决定空态文案。
 *
 * 卡片入口:
 * - 查看 → onView(id)
 * - 编辑 → onEdit(id)
 * - + 添加节点 → onAddNode(flow, kind)(列表侧快速添加)
 */
import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Search, Workflow } from 'lucide-react';
import type { Flow, NodeKind, WorkflowTabId } from '@/api/admin/workflows/schema';
import { FlowCard } from '../FlowCard';

const PAGE_SIZE = 8;

interface OverviewTabProps {
  flows: Flow[];
  statusTab: WorkflowTabId;
  onView: (id: string) => void;
  onEdit: (id: string) => void;
  onCopy: (f: Flow) => void;
  onPublish: (f: Flow) => void;
  onRetire: (f: Flow) => void;
  onAddNode: (f: Flow, kind: NodeKind) => void;
}

export function OverviewTab({
  flows, statusTab,
  onView, onEdit, onCopy, onPublish, onRetire, onAddNode,
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
      <div className="border-b border-[var(--border)] px-5 py-4">
        <h3 className="flex items-center gap-2 text-base font-semibold">
          <Workflow className="h-4 w-4 text-amber-600" />
          {titleForTab(statusTab)}
        </h3>
        <p className="mt-1 text-xs text-[var(--text-muted)]">
          点击「查看」打开工作流详情页;点击「编辑」直接进入画布;点击右上「新建工作流」从空白开始。
        </p>
      </div>
      <div className="grid gap-4 p-5 lg:grid-cols-2">
        {pagedFlows.map((flow) => (
          <FlowCard
            key={flow.id}
            flow={flow}
            onView={onView}
            onEdit={onEdit}
            onCopy={onCopy}
            onPublish={onPublish}
            onRetire={onRetire}
            onAddNode={onAddNode}
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

function titleForTab(tab: WorkflowTabId): string {
  if (tab === 'all') return '工作流列表';
  if (tab === 'draft') return '草稿工作流';
  if (tab === 'published') return '已发布的工作流';
  return '已下线的工作流';
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