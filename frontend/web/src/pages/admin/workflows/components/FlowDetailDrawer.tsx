/**
 * FlowDetailDrawer — 流程详情侧抽屉(节点列表 + 元数据 + 绑定智能体)。
 */
import { Brain } from 'lucide-react';
import { SideDrawer } from '@/components/feedback/SideDrawer';
import type { Flow } from '@/api/admin/workflows/schema';
import { NODE_KIND_LABEL, STATUS_BADGE } from './constants';

export function FlowDetailDrawer({ flow, onClose }: { flow: Flow | null; onClose: () => void }) {
  return (
    <SideDrawer
      open={flow !== null}
      onClose={onClose}
      ariaLabel={flow ? `${flow.name}流程详情` : '流程详情'}
      eyebrow={<p className="text-[11px] font-semibold tracking-[0.2em] text-amber-700 dark:text-amber-300">流程详情 / {flow?.scene ?? ''}</p>}
      closeLabel="关闭流程详情"
    >
      {flow && (
        <div className="space-y-6 pb-10">
          <div>
            <h3 className="text-2xl font-semibold">{flow.name}</h3>
            <p className="mt-3 text-sm leading-7 text-[var(--text-muted)]">{flow.description}</p>
          </div>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="rounded-xl bg-[var(--bg-elevated)] p-4">
              <p className="text-[var(--text-muted)]">触发器</p>
              <p className="mt-2 font-semibold">{flow.trigger}</p>
            </div>
            <div className="rounded-xl bg-[var(--bg-elevated)] p-4">
              <p className="text-[var(--text-muted)]">当前状态</p>
              <p className="mt-2 font-semibold">{STATUS_BADGE[flow.status].label}</p>
            </div>
            <div className="rounded-xl bg-[var(--bg-elevated)] p-4">
              <p className="text-[var(--text-muted)]">节点数</p>
              <p className="mt-2 font-semibold">{flow.initialNodes.length}</p>
            </div>
            <div className="rounded-xl bg-[var(--bg-elevated)] p-4">
              <p className="text-[var(--text-muted)]">连线数</p>
              <p className="mt-2 font-semibold">{flow.initialEdges.length}</p>
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold text-[var(--text-muted)]">节点列表</p>
            <ol className="mt-3 space-y-2">
              {flow.initialNodes.map((n, i) => (
                <li key={n.id} className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] px-4 py-3">
                  <span className="grid h-7 w-7 place-items-center rounded-md bg-[var(--bg-elevated)] text-xs font-semibold">{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">{n.data?.label}</p>
                    <p className="text-[11px] text-[var(--text-muted)]">{NODE_KIND_LABEL[n.data?.kind ?? 'tool']} · {n.data?.subtitle}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
          {flow.boundAgents.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-[var(--text-muted)]">已被以下智能体调用</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {flow.boundAgents.map((a) => (
                  <span key={a} className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
                    <Brain className="h-3.5 w-3.5" />{a}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </SideDrawer>
  );
}