/**
 * 沉浸式工作区 — fixed inset-0 overlay 包裹完整的智能体编辑环境,内嵌 9 个 Drawer 面板与版本工具栏。
 */
import { X } from 'lucide-react';
import { useEffect } from 'react';
import type { AgentEntry } from '@/api/admin/agents/schema';
import { DrawerPanelBasic } from './DrawerPanels';
import { DrawerPanelEvaluation } from './DrawerPanels';
import { DrawerPanelFlow } from './DrawerPanels';
import { DrawerPanelKnowledge } from './DrawerPanels';
import { DrawerPanelMemory } from './DrawerPanels';
import { DrawerPanelPermission } from './DrawerPanels';
import { DrawerPanelPrompt } from './DrawerPanels';
import { DrawerPanelSkills } from './DrawerPanels';
import { DrawerPanelVersions } from './DrawerPanels';
import { DrawerSidebar } from './DrawerSidebar';
import type { DrawerPanel } from '@/api/admin/agents/schema';
import { statusBadge } from './constants';

export function FullscreenWorkspace({
  agent, panel, setPanel, onExit,
}: {
  agent: AgentEntry;
  panel: DrawerPanel;
  setPanel: (p: DrawerPanel) => void;
  onExit: () => void;
}) {
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onExit();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onExit]);

  const badge = statusBadge[agent.status];
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${agent.name} 沉浸式工作区`}
      className="fixed inset-0 z-50 flex flex-col bg-[var(--bg-app)]"
    >
      <header className="flex shrink-0 items-center justify-between border-b border-[var(--border)] bg-[var(--surface-1)] px-6 py-3 shadow-[var(--shadow-sm)]">
        <div className="flex items-center gap-3">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-[var(--brand-light)] text-[var(--brand)]">
            <span className="text-base font-semibold">{agent.name.slice(0, 1)}</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold tracking-tight">{agent.name}</h2>
              <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold ${badge.className}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${badge.dot}`} aria-hidden="true" />
                {badge.label}
              </span>
              <span className="rounded-md bg-[var(--surface-1)] px-2 py-0.5 text-[11px] text-[var(--text-muted)]">{agent.version}</span>
            </div>
            <p className="mt-0.5 text-[11px] text-[var(--text-muted)]">{agent.category} · {agent.owner} · 沉浸式编辑</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] px-3 py-1.5 text-xs font-semibold text-[var(--text-secondary)] hover:border-[var(--brand)] hover:text-[var(--brand)]"
          >
            暂存草稿
          </button>
          <button
            type="button"
            className="rounded-xl bg-[var(--brand)] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[var(--brand-hover)]"
          >
            保存并发布
          </button>
          <button
            type="button"
            onClick={onExit}
            aria-label="退出沉浸式工作区"
            className="grid h-9 w-9 place-items-center rounded-xl text-[var(--text-muted)] transition hover:bg-[var(--bg-hover)] hover:text-[var(--text)]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <DrawerSidebar panel={panel} setPanel={setPanel} />
        <main className="min-w-0 flex-1 overflow-auto bg-[var(--bg-app)] p-6">
          <div className="mx-auto max-w-3xl space-y-6">
            {panel === 'basic' && <DrawerPanelBasic draft={agent} onChange={() => undefined} />}
            {panel === 'prompt' && <DrawerPanelPrompt draft={agent} promptDoc="prompt" setPromptDoc={() => undefined} onChange={() => undefined} />}
            {panel === 'skills' && <DrawerPanelSkills draft={agent} />}
            {panel === 'knowledge' && <DrawerPanelKnowledge draft={agent} onChange={() => undefined} />}
            {panel === 'memory' && <DrawerPanelMemory draft={agent} onChange={() => undefined} />}
            {panel === 'flow' && <DrawerPanelFlow draft={agent} onChange={() => undefined} />}
            {panel === 'versions' && <DrawerPanelVersions draft={agent} />}
            {panel === 'evaluation' && <DrawerPanelEvaluation draft={agent} />}
            {panel === 'permission' && <DrawerPanelPermission draft={agent} />}
          </div>
        </main>
      </div>

      <footer className="flex shrink-0 items-center justify-between border-t border-[var(--border)] bg-[var(--surface-1)] px-6 py-2 text-[11px] text-[var(--text-muted)]">
        <span>沉浸式编辑 · 自动每 30 秒暂存一次</span>
        <span>按 Esc 退出</span>
      </footer>
    </div>
  );
}