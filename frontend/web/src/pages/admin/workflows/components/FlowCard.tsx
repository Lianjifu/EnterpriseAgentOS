/**
 * FlowCard — 工作流列表中的单张卡片。
 *
 * 4 入口:
 * - 查看 → onView(id)
 * - 编辑 → onEdit(id)
 * - + 添加节点 → onAddNode(flow, kind)(列表侧快速添加)
 * - 复制 / 发布为工具 / 下线 同前
 */
import { useEffect, useRef, useState } from 'react';
import {
  Brain, CheckCircle2, Copy, Edit, Eye, GitBranch, Pause, Plug,
  Plus, Rocket, Workflow,
} from 'lucide-react';
import type { Flow, NodeKind } from '@/api/admin/workflows/schema';
import { STATUS_BADGE, TRIGGER_BADGE } from './constants';

const NODE_KIND_OPTIONS: Array<{ kind: NodeKind; label: string; icon: typeof Plus; tone: string }> = [
  { kind: 'trigger', label: '触发器', icon: Plus, tone: 'text-sky-600 dark:text-sky-300' },
  { kind: 'tool', label: '工具', icon: Plug, tone: 'text-[var(--brand)]' },
  { kind: 'agent', label: '智能体', icon: Brain, tone: 'text-emerald-600 dark:text-emerald-300' },
  { kind: 'condition', label: '条件', icon: GitBranch, tone: 'text-amber-600 dark:text-amber-300' },
  { kind: 'end', label: '结束', icon: CheckCircle2, tone: 'text-violet-600 dark:text-violet-300' },
];

export function FlowCard({ flow, onView, onEdit, onCopy, onPublish, onRetire, onAddNode }: {
  flow: Flow;
  onView: (id: string) => void;
  onEdit: (id: string) => void;
  onCopy: (f: Flow) => void;
  onPublish: (f: Flow) => void;
  onRetire: (f: Flow) => void;
  onAddNode: (f: Flow, kind: NodeKind) => void;
}) {
  const TriggerIcon = TRIGGER_BADGE[flow.trigger].icon;
  const status = STATUS_BADGE[flow.status];
  const [addOpen, setAddOpen] = useState(false);
  const popRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!addOpen) return;
    const close = (e: MouseEvent) => {
      if (popRef.current && !popRef.current.contains(e.target as Node)) {
        setAddOpen(false);
      }
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [addOpen]);

  const canAddNode = flow.status !== 'retired';

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
          <button type="button" onClick={() => onView(flow.id)} className="mt-2 text-left text-base font-semibold hover:text-[var(--brand)]">{flow.name}</button>
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
        <button type="button" onClick={() => onView(flow.id)} className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface-1)] px-3 py-2 text-xs font-semibold text-[var(--text-secondary)] hover:border-[var(--brand)] hover:text-[var(--brand)]">
          <Eye className="h-3.5 w-3.5" />查看
        </button>
        <button type="button" onClick={() => onEdit(flow.id)} className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--brand)] px-3 py-2 text-xs font-semibold text-white hover:bg-[var(--brand-hover)]">
          <Edit className="h-3.5 w-3.5" />编辑
        </button>
        {canAddNode && (
          <div ref={popRef} className="relative">
            <button
              type="button"
              aria-haspopup="menu"
              aria-expanded={addOpen}
              onClick={() => setAddOpen((v) => !v)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface-1)] px-3 py-2 text-xs font-semibold text-[var(--text-secondary)] hover:border-[var(--brand)] hover:text-[var(--brand)]"
            >
              <Plus className="h-3.5 w-3.5" />添加节点
            </button>
            {addOpen && (
              <div role="menu" className="absolute left-0 top-[calc(100%+6px)] z-30 w-44 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-1 shadow-[var(--shadow-md)]">
                {NODE_KIND_OPTIONS.map((opt) => {
                  const OptIcon = opt.icon;
                  return (
                    <button
                      key={opt.kind}
                      type="button"
                      role="menuitem"
                      onClick={() => { onAddNode(flow, opt.kind); setAddOpen(false); }}
                      className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
                    >
                      <OptIcon className={`h-3.5 w-3.5 ${opt.tone}`} />{opt.label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
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