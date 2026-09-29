/**
 * OverviewTab — 工作流总览(搜索 + FlowCard 网格 + 「新建工作流」入口)。
 *
 * 父级(WorkflowsPage)持有 5 个状态 tab 作为顶部导航,本组件根据 `statusTab`
 * 渲染对应标题与空态文案。
 *
 * 卡片入口:
 * - 查看 → onView(id)
 * - 编辑 → onEdit(id)
 * - + 添加节点 → onAddNode(flow, kind)(列表侧快速添加)
 */
import { Plus, Search, Workflow } from 'lucide-react';
import type { Flow, NodeKind, WorkflowTabId } from '@/api/admin/workflows/schema';
import { FlowCard } from '../FlowCard';

interface OverviewTabProps {
  flows: Flow[];
  search: string;
  setSearch: (v: string) => void;
  statusTab: WorkflowTabId;
  onView: (id: string) => void;
  onEdit: (id: string) => void;
  onCopy: (f: Flow) => void;
  onPublish: (f: Flow) => void;
  onRetire: (f: Flow) => void;
  onCreate: () => void;
  onAddNode: (f: Flow, kind: NodeKind) => void;
}

export function OverviewTab({
  flows, search, setSearch, statusTab,
  onView, onEdit, onCopy, onPublish, onRetire, onCreate, onAddNode,
}: OverviewTabProps) {
  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h3 className="flex items-center gap-2 text-base font-semibold">
              <Workflow className="h-4 w-4 text-amber-600" />
              {titleForTab(statusTab)}
            </h3>
            <p className="mt-1 text-xs text-[var(--text-muted)]">
              点击「查看」打开工作流详情页;点击「编辑」直接进入画布;点击右上「新建工作流」从空白开始。
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-full sm:max-w-xs">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="搜索工作流名 / 团队 / 场景"
                className="h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-1)] pl-10 pr-3 text-sm outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--brand)]"
              />
            </div>
            <button
              type="button"
              onClick={onCreate}
              className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-[var(--brand)] px-4 text-xs font-semibold text-white hover:bg-[var(--brand-hover)]"
            >
              <Plus className="h-4 w-4" />
              新建工作流
            </button>
          </div>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          {flows.map((flow) => (
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
        {flows.length === 0 && (
          <div className="mt-5 rounded-2xl border border-dashed border-[var(--border-strong)] bg-[var(--surface-1)] p-12 text-center">
            <Search className="mx-auto h-6 w-6 text-[var(--text-muted)]" />
            <p className="mt-3 text-sm font-semibold">{emptyTitleForTab(statusTab)}</p>
            <p className="mt-1 text-xs text-[var(--text-muted)]">{emptyHintForTab(statusTab)}</p>
          </div>
        )}
      </section>
    </div>
  );
}

function titleForTab(tab: WorkflowTabId): string {
  if (tab === 'all') return '工作流列表';
  if (tab === 'draft') return '草稿工作流';
  if (tab === 'graying') return '灰度中的工作流';
  if (tab === 'published') return '已发布的工作流';
  return '已下线的工作流';
}

function emptyTitleForTab(tab: WorkflowTabId): string {
  if (tab === 'draft') return '没有草稿工作流';
  if (tab === 'graying') return '没有灰度中的工作流';
  if (tab === 'published') return '没有已发布的工作流';
  if (tab === 'retired') return '没有已下线的工作流';
  return '没有匹配的工作流';
}

function emptyHintForTab(tab: WorkflowTabId): string {
  if (tab === 'draft') return '新建一个工作流开始设计。';
  if (tab === 'graying') return '从草稿发布为工具后会进入灰度。';
  if (tab === 'published') return '发布为工具后,工作流会出现在这里。';
  if (tab === 'retired') return '下线的工作流会在此处保留。';
  return '尝试其他关键词。';
}