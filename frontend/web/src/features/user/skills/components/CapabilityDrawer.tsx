import { Bot, CircleAlert, Heart, Network, Sparkles, Wrench } from 'lucide-react';
import { SideDrawer } from '@/components/feedback/SideDrawer';
import type { Capability } from '../schema';

interface CapabilityDrawerProps {
  selected: Capability | null;
  onClose: () => void;
  favorited: boolean;
  onToggleFavorite: (cap: Capability) => void;
  onUse: (cap: Capability) => void;
  onUseInCopilot: (cap: Capability) => void;
  onUseWithAgent: (cap: Capability, agentName: string) => void;
}

export function CapabilityDrawer({
  selected, onClose, favorited, onToggleFavorite, onUse, onUseInCopilot, onUseWithAgent,
}: CapabilityDrawerProps) {
  return (
    <SideDrawer
      open={selected !== null}
      onClose={onClose}
      ariaLabel={selected ? `${selected.name}详情` : '能力详情'}
      eyebrow={<p className="text-[11px] font-semibold tracking-[0.2em] text-[var(--brand)]">{selected?.type ?? ''} / 能力详情</p>}
      closeLabel="关闭能力详情"
    >
      {selected && (
        <>
          <div className="mt-10 grid h-14 w-14 place-items-center rounded-2xl bg-[var(--brand-light)] text-[var(--brand)]">
            {selected.type === 'MCP' ? <Network className="h-7 w-7" /> : selected.type === 'Tool' ? <Wrench className="h-7 w-7" /> : <Sparkles className="h-7 w-7" />}
          </div>
          <h3 className="mt-5 text-2xl font-semibold">{selected.name}</h3>
          <p className="mt-3 text-sm leading-7 text-[var(--text-muted)]">{selected.description}</p>
          <div className="mt-7 flex flex-wrap gap-2">
            {selected.tags.map((tag) => (
              <span key={tag} className="rounded-full bg-[var(--bg-elevated)] px-3 py-1.5 text-xs text-[var(--text-secondary)]">{tag}</span>
            ))}
          </div>
          <div className="mt-7 grid grid-cols-2 gap-3 text-xs">
            <div className="rounded-xl bg-[var(--bg-elevated)] p-4">
              <p className="text-[var(--text-muted)]">输入</p>
              <p className="mt-2 font-semibold">{selected.input}</p>
            </div>
            <div className="rounded-xl bg-[var(--bg-elevated)] p-4">
              <p className="text-[var(--text-muted)]">输出</p>
              <p className="mt-2 font-semibold">{selected.output}</p>
            </div>
          </div>

          <div className="mt-5 rounded-xl border border-[var(--border)] p-4">
            <p className="text-xs font-semibold">关联智能体</p>
            {selected.relatedAgents.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {selected.relatedAgents.map((agentName) => (
                  <button
                    key={agentName}
                    type="button"
                    disabled={selected.status !== 'available'}
                    aria-label={`用${agentName}使用${selected.name}`}
                    onClick={() => onUseWithAgent(selected, agentName)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-medium hover:border-[var(--brand)] hover:text-[var(--brand)] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Bot className="h-3.5 w-3.5" />
                    {agentName}
                  </button>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-xs leading-6 text-[var(--text-muted)]">暂未绑定智能体，可直接使用该能力。</p>
            )}
          </div>

          <div className="mt-5 rounded-xl border border-amber-400/25 bg-amber-50 p-4 text-xs text-amber-900 dark:bg-amber-500/10 dark:text-amber-200">
            <div className="flex items-center gap-2 font-semibold">
              <CircleAlert className="h-4 w-4" />
              {selected.risk === 'low' ? '低风险' : '需确认'}
            </div>
            <p className="mt-2 leading-6">使用前确认输入范围，涉及外部系统时只会在授权范围内读取或执行。</p>
          </div>
          <div className="mt-7 flex gap-2">
            <button
              type="button"
              onClick={() => onToggleFavorite(selected)}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-[var(--border)] px-3 py-2.5 text-xs font-semibold"
            >
              <Heart className="h-3.5 w-3.5" fill={favorited ? 'currentColor' : 'none'} />
              {favorited ? '取消收藏' : '收藏'}
            </button>
            <button
              type="button"
              disabled={selected.status !== 'available'}
              onClick={() => selected.type === 'Tool' ? onUseInCopilot(selected) : onUse(selected)}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-[var(--brand)] px-3 py-2.5 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              {selected.type === 'Tool' ? '在对话中调用' : '使用能力'}
            </button>
          </div>
          <p className="mt-5 text-xs leading-6 text-[var(--text-muted)]">能力由管理员维护；用户侧只选择和使用，不修改配置。</p>
        </>
      )}
    </SideDrawer>
  );
}
