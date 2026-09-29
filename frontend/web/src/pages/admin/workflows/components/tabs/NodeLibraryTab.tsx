/**
 * NodeLibraryTab — 节点库 tab(原 trigger/action/condition 3 tab 合并)。
 *
 * 5 类节点卡片(trigger / tool / agent / condition / end),每张卡片「加入画布」:
 * 1. 打开 SelectFlowModal 选目标工作流;
 * 2. 选完后调 onAddToFlow(node, flow) — WorkflowsPage 把节点插入 flow.initialNodes。
 *
 * 本组件持有 local 「待加入节点」+ 「select modal open」state;真正持久化由 WorkflowsPage 负责。
 */
import { useState } from 'react';
import { Plus } from 'lucide-react';
import type { Flow, NodeKind } from '@/api/admin/workflows/schema';
import { NODE_KIND_LABEL, NODE_TEMPLATES, nodeKindIcon } from '../constants';
import { SelectFlowModal } from '../SelectFlowModal';

interface NodeTemplateSeed {
  kind: NodeKind;
  label: string;
  subtitle: string;
  defaults: Record<string, string>;
}

interface NodeLibraryTabProps {
  flows: Flow[];
  onAddToFlow: (node: NodeTemplateSeed, flow: Flow) => void;
}

export function NodeLibraryTab({ flows, onAddToFlow }: NodeLibraryTabProps) {
  const [pending, setPending] = useState<NodeTemplateSeed | null>(null);

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-5">
        <div>
          <h3 className="text-base font-semibold">节点库</h3>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            5 类节点统一管理。点击「加入画布」选择目标工作流,节点会自动追加到画布末尾。
          </p>
        </div>

        <div className="mt-5 grid gap-3 lg:grid-cols-2">
          {NODE_TEMPLATES.map((tpl) => {
            const Icon = nodeKindIcon(tpl.kind);
            return (
              <article
                key={tpl.kind}
                className="rounded-2xl border border-[var(--border)] bg-[var(--bg-app)] p-4 transition hover:border-amber-400/50"
              >
                <div className="flex items-start gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
                    <Icon className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-sm font-semibold">{tpl.label}</h4>
                      <span className="rounded-md bg-[var(--bg-elevated)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--text-muted)]">
                        {NODE_KIND_LABEL[tpl.kind]}
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] text-[var(--text-muted)]">{tpl.subtitle}</p>
                    <p className="mt-2 text-xs leading-5 text-[var(--text-secondary)]">{tpl.description}</p>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between border-t border-[var(--border)] pt-3">
                  <span className="text-[10px] text-[var(--text-muted)]">默认配置 · {Object.keys(tpl.defaults).length} 项</span>
                  <button
                    type="button"
                    onClick={() => setPending({ kind: tpl.kind, label: tpl.label, subtitle: tpl.subtitle, defaults: tpl.defaults })}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--brand)] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[var(--brand-hover)]"
                  >
                    <Plus className="h-3.5 w-3.5" />加入画布
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <SelectFlowModal
        open={!!pending}
        onClose={() => setPending(null)}
        flows={flows}
        title="加入画布 — 选择目标工作流"
        description="选完后节点会自动追加到该工作流画布的末尾。"
        onPick={(flow) => {
          if (!pending) return;
          onAddToFlow(pending, flow);
          setPending(null);
        }}
      />
    </div>
  );
}