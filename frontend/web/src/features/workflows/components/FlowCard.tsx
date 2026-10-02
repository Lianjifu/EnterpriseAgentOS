/**
 * FlowCard — 工作流列表卡片。
 *
 * 点击卡片进详情；底栏保留编辑 / 发布 / 复制 / 下线（已发布时）。
 * 「查看」「添加节点」已去掉：查看走卡片点击，加节点在详情编辑器里做。
 */
import {
  CheckCircle2, Copy, Edit3, Pause, Rocket, Workflow,
} from 'lucide-react';
import type { Flow } from '../schema';
import { STATUS_BADGE, TRIGGER_BADGE } from './constants';

export function FlowCard({ flow, onView, onEdit, onCopy, onPublish, onRetire }: {
  flow: Flow;
  onView: (id: string) => void;
  onEdit: (id: string) => void;
  onCopy: (f: Flow) => void;
  onPublish: (f: Flow) => void;
  onRetire: (f: Flow) => void;
}) {
  const TriggerIcon = TRIGGER_BADGE[flow.trigger].icon;
  const status = STATUS_BADGE[flow.status];
  const isPublished = flow.status === 'published';
  const isRetired = flow.status === 'retired';

  return (
    <article
      className={`group relative flex flex-col gap-4 rounded-2xl border bg-[var(--surface-1)] p-5 text-left transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-sm)] ${
        'border-[var(--border)] hover:border-[var(--brand)]'
      }`}
    >
      <div
        role="button"
        tabIndex={0}
        onClick={() => onView(flow.id)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onView(flow.id);
          }
        }}
        aria-label={`查看 ${flow.name} 详情`}
        className="absolute inset-0 z-0 cursor-pointer rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)]"
      />

      <div className="pointer-events-none relative z-10 flex items-start gap-4">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
          <Workflow className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">{flow.scene}</span>
            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${status.className}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />{status.label}
            </span>
            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${TRIGGER_BADGE[flow.trigger].className}`}>
              <TriggerIcon className="h-3 w-3" />{TRIGGER_BADGE[flow.trigger].label}
            </span>
          </div>
          <h3 className="mt-2 text-base font-semibold group-hover:text-[var(--brand)]">{flow.name}</h3>
          <p className="mt-2 text-xs leading-6 text-[var(--text-muted)]">{flow.description}</p>
          <div className="mt-4 grid grid-cols-3 gap-3 text-[11px]">
            <div className="rounded-lg bg-[var(--bg-elevated)] px-3 py-2">
              <p className="text-[var(--text-muted)]">节点</p>
              <p className="mt-1 font-semibold tabular-nums">{flow.initialNodes.length}</p>
            </div>
            <div className="rounded-lg bg-[var(--bg-elevated)] px-3 py-2">
              <p className="text-[var(--text-muted)]">连线</p>
              <p className="mt-1 font-semibold tabular-nums">{flow.initialEdges.length}</p>
            </div>
            <div className="rounded-lg bg-[var(--bg-elevated)] px-3 py-2">
              <p className="text-[var(--text-muted)]">本月调用</p>
              <p className="mt-1 font-semibold tabular-nums">{flow.callCount}</p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-[var(--text-muted)]">
            <span>{flow.owner}</span>
            <span>· 更新于 {flow.updatedAt}</span>
            {flow.boundAgents.length > 0 && (
              <span>· 绑定到 {flow.boundAgents.length} 个智能体</span>
            )}
          </div>
        </div>
      </div>

      <div className="relative z-10 flex flex-wrap gap-1.5 border-t border-[var(--border)] pt-3">
        <button
          type="button"
          onClick={(event) => { event.stopPropagation(); onEdit(flow.id); }}
          className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg border border-[var(--border)] px-1.5 py-1.5 text-[11px] font-semibold text-[var(--text-secondary)] hover:border-[var(--brand)] hover:text-[var(--brand)]"
        >
          <Edit3 className="h-3.5 w-3.5" />编辑
        </button>
        <button
          type="button"
          disabled={isPublished || isRetired}
          onClick={(event) => { event.stopPropagation(); onPublish(flow); }}
          className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg border border-[var(--border)] px-1.5 py-1.5 text-[11px] font-semibold text-[var(--text-secondary)] hover:border-[var(--brand)] hover:text-[var(--brand)] disabled:cursor-default disabled:opacity-40 disabled:hover:border-[var(--border)] disabled:hover:text-[var(--text-secondary)]"
        >
          {isPublished ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Rocket className="h-3.5 w-3.5" />}
          {isPublished ? '已发布' : isRetired ? '已下线' : '发布'}
        </button>
        <button
          type="button"
          onClick={(event) => { event.stopPropagation(); onCopy(flow); }}
          className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg border border-[var(--border)] px-1.5 py-1.5 text-[11px] font-semibold text-[var(--text-secondary)] hover:border-[var(--brand)] hover:text-[var(--brand)]"
        >
          <Copy className="h-3.5 w-3.5" />复制
        </button>
        {isPublished && (
          <button
            type="button"
            onClick={(event) => { event.stopPropagation(); onRetire(flow); }}
            className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg border border-rose-200 px-1.5 py-1.5 text-[11px] font-semibold text-rose-600 hover:bg-rose-50 dark:border-rose-500/30 dark:text-rose-300 dark:hover:bg-rose-500/10"
          >
            <Pause className="h-3.5 w-3.5" />下线
          </button>
        )}
      </div>
    </article>
  );
}
