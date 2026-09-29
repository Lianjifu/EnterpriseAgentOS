/**
 * FlowCard — 工作流总览 tab 中单个工作流卡片。
 */
import { Copy, Edit, Pause, Rocket, Workflow } from 'lucide-react';
import type { Flow } from '@/api/admin/workflows/schema';
import { STATUS_BADGE, TRIGGER_BADGE } from './constants';

export function FlowCard({ flow, onEnterEditor, onCopy, onPublish, onRetire, onView }: {
  flow: Flow;
  onEnterEditor: (f: Flow) => void;
  onCopy: (f: Flow) => void;
  onPublish: (f: Flow) => void;
  onRetire: (f: Flow) => void;
  onView: (f: Flow) => void;
}) {
  const TriggerIcon = TRIGGER_BADGE[flow.trigger].icon;
  const status = STATUS_BADGE[flow.status];
  return (
    <article className="group rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-5 transition hover:border-amber-400/50 hover:shadow-[var(--shadow-sm)]">
      <div className="flex items-start gap-4">
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
          <button type="button" onClick={() => onView(flow)} className="mt-2 text-left text-base font-semibold hover:text-[var(--brand)]">{flow.name}</button>
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
      <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-[var(--border)] pt-4">
        <button type="button" onClick={() => onEnterEditor(flow)} className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--brand)] px-3 py-2 text-xs font-semibold text-white hover:bg-[var(--brand-hover)]">
          <Edit className="h-3.5 w-3.5" />编辑
        </button>
        <button type="button" onClick={() => onView(flow)} className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface-1)] px-3 py-2 text-xs font-semibold text-[var(--text-secondary)] hover:border-[var(--brand)] hover:text-[var(--brand)]">
          查看
        </button>
        <button type="button" onClick={() => onCopy(flow)} className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface-1)] px-3 py-2 text-xs font-semibold text-[var(--text-secondary)] hover:border-[var(--brand)] hover:text-[var(--brand)]">
          <Copy className="h-3.5 w-3.5" />复制
        </button>
        {flow.status !== 'published' && flow.status !== 'retired' && (
          <button type="button" onClick={() => onPublish(flow)} className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-500/15 dark:text-emerald-300">
            <Rocket className="h-3.5 w-3.5" />发布为工具
          </button>
        )}
        {flow.status === 'published' && (
          <button type="button" onClick={() => onRetire(flow)} className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100 dark:bg-rose-500/15 dark:text-rose-300">
            <Pause className="h-3.5 w-3.5" />下线
          </button>
        )}
      </div>
    </article>
  );
}