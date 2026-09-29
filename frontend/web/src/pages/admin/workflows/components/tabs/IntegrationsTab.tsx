/**
 * IntegrationsTab — 工作流 × 智能体 集成 tab。
 *
 * 显示:
 * - 顶部 KPI(总绑定数 / 有绑定的 flows / 未绑定 flows)
 * - 行表:每个 flow + 其 bound agents(行内 link 跳 /admin/agents/:id)
 * - 右上「绑定新智能体」按钮 → SelectFlowModal → 然后选智能体(简化:用本地 mockAgents 单选)
 */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Link2, Plus } from 'lucide-react';
import type { Flow } from '@/api/admin/workflows/schema';
import { mockAgents } from '@/mock/admin/agents.fixtures';
import { SelectFlowModal } from '../SelectFlowModal';

interface IntegrationsTabProps {
  flows: Flow[];
  onBindAgent: (flowId: string, agentId: string) => void;
}

export function IntegrationsTab({ flows, onBindAgent }: IntegrationsTabProps) {
  const [pickingFlow, setPickingFlow] = useState(false);
  const [agentPickFlow, setAgentPickFlow] = useState<Flow | null>(null);

  const totalBindings = flows.reduce((sum, f) => sum + f.boundAgents.length, 0);
  const flowsWithBindings = flows.filter((f) => f.boundAgents.length > 0).length;

  const agentsById = new Map(mockAgents.map((a) => [a.id, a]));

  const handleAgentPick = (agentId: string) => {
    if (!agentPickFlow) return;
    onBindAgent(agentPickFlow.id, agentId);
    setAgentPickFlow(null);
    setPickingFlow(false);
  };

  return (
    <div className="space-y-4">
      <section className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-4">
          <p className="text-[11px] uppercase tracking-wide text-[var(--text-muted)]">总绑定数</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">{totalBindings}</p>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-4">
          <p className="text-[11px] uppercase tracking-wide text-[var(--text-muted)]">有绑定的 flows</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">{flowsWithBindings}</p>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-4">
          <p className="text-[11px] uppercase tracking-wide text-[var(--text-muted)]">未绑定的 flows</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">{flows.length - flowsWithBindings}</p>
        </div>
      </section>

      <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-5">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h3 className="flex items-center gap-2 text-base font-semibold">
              <Link2 className="h-4 w-4 text-amber-600" />
              工作流 × 智能体 绑定
            </h3>
            <p className="mt-1 text-xs text-[var(--text-muted)]">
              一行一个工作流,展示其引用的智能体;点击智能体可跳转到详情页。
            </p>
          </div>
          <button
            type="button"
            onClick={() => setPickingFlow(true)}
            className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-[var(--brand)] px-3 text-xs font-semibold text-white hover:bg-[var(--brand-hover)]"
          >
            <Plus className="h-3.5 w-3.5" />绑定新智能体
          </button>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[var(--border)] text-left text-[10px] uppercase tracking-wide text-[var(--text-muted)]">
                <th className="py-2 pr-3 font-semibold">工作流</th>
                <th className="py-2 pr-3 font-semibold">已绑定智能体</th>
                <th className="py-2 pr-3 font-semibold">触发器</th>
                <th className="py-2 font-semibold">调用次数</th>
              </tr>
            </thead>
            <tbody>
              {flows.map((f) => (
                <tr key={f.id} className="border-b border-[var(--border)] last:border-b-0">
                  <td className="py-3 pr-3 align-top">
                    <Link to={`/admin/workflows/${f.id}`} className="font-semibold text-[var(--text)] hover:text-[var(--brand)]">
                      {f.name}
                    </Link>
                    <p className="mt-0.5 text-[10px] text-[var(--text-muted)]">{f.scene}</p>
                  </td>
                  <td className="py-3 pr-3 align-top">
                    {f.boundAgents.length === 0 ? (
                      <span className="text-[var(--text-muted)]">—</span>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {f.boundAgents.map((aid) => {
                          const a = agentsById.get(aid);
                          return (
                            <Link
                              key={aid}
                              to={`/admin/agents/${aid}`}
                              className="inline-flex items-center gap-1 rounded-full bg-[var(--bg-elevated)] px-2 py-0.5 text-[10px] font-semibold text-[var(--text-secondary)] hover:bg-amber-100 dark:hover:bg-amber-500/15"
                            >
                              {a?.name ?? aid}
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </td>
                  <td className="py-3 pr-3 align-top text-[var(--text-secondary)]">{f.trigger}</td>
                  <td className="py-3 align-top tabular-nums">{f.callCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <SelectFlowModal
        open={pickingFlow}
        onClose={() => setPickingFlow(false)}
        flows={flows}
        title="选择要绑定智能体的工作流"
        description="下一步会弹出智能体选择。"
        onPick={(flow) => setAgentPickFlow(flow)}
      />

      {agentPickFlow && (
        <SelectAgentModal
          flowName={agentPickFlow.name}
          onClose={() => setAgentPickFlow(null)}
          onPick={handleAgentPick}
        />
      )}
    </div>
  );
}

function SelectAgentModal({ flowName, onClose, onPick }: { flowName: string; onClose: () => void; onPick: (agentId: string) => void }) {
  const [selectedId, setSelectedId] = useState(mockAgents[0]?.id ?? '');
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/45 p-4" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <form
        role="dialog"
        aria-modal="true"
        aria-label="选择要绑定的智能体"
        onSubmit={(e) => { e.preventDefault(); if (selectedId) onPick(selectedId); }}
        className="w-full max-w-lg rounded-2xl bg-[var(--surface-1)] p-6 shadow-2xl"
      >
        <h3 className="text-lg font-semibold">选择智能体</h3>
        <p className="mt-2 text-xs leading-6 text-[var(--text-muted)]">
          将智能体绑定到「{flowName}」。智能体可在详情页查看;绑定后工作流节点可调用此智能体。
        </p>
        <div className="mt-4 max-h-72 overflow-y-auto rounded-xl border border-[var(--border)] bg-[var(--bg-app)]">
          {mockAgents.map((a) => (
            <label
              key={a.id}
              className={`flex cursor-pointer items-center gap-3 border-b border-[var(--border)] px-3 py-2.5 text-xs last:border-b-0 hover:bg-[var(--bg-hover)] ${selectedId === a.id ? 'bg-[var(--brand-light)]' : ''}`}
            >
              <input type="radio" name="select-agent" value={a.id} checked={selectedId === a.id} onChange={() => setSelectedId(a.id)} className="accent-[var(--brand)]" />
              <span className="flex-1">
                <span className="font-medium text-[var(--text)]">{a.name}</span>
                <span className="ml-2 text-[10px] text-[var(--text-muted)]">{a.category}</span>
              </span>
            </label>
          ))}
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-lg border border-[var(--border)] px-3 py-2 text-xs font-semibold text-[var(--text-secondary)] hover:border-[var(--brand)] hover:text-[var(--brand)]">取消</button>
          <button type="submit" disabled={!selectedId} className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--brand)] px-4 py-2 text-xs font-semibold text-white hover:bg-[var(--brand-hover)] disabled:cursor-not-allowed disabled:opacity-50">
            确认绑定
          </button>
        </div>
      </form>
    </div>
  );
}