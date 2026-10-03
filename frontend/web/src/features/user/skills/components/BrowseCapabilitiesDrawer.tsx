import { Bot, Check, Network, Search, Sparkles, Wrench } from 'lucide-react';
import { useMemo, useState } from 'react';
import { SideDrawer } from '@/components/feedback/SideDrawer';
import type { Capability, CapabilityType } from '../schema';

const TYPE_META = {
  Skill: { icon: Sparkles, tone: 'bg-violet-50 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300' },
  Tool: { icon: Wrench, tone: 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300' },
  MCP: { icon: Network, tone: 'bg-sky-50 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300' },
} as const;

interface BrowseCapabilitiesDrawerProps {
  open: boolean;
  capabilities: Capability[];
  chosenIds: string[];
  loading?: boolean;
  onClose: () => void;
  onToggleChosen: (id: string) => void;
  onUse: (cap: Capability) => void;
  onUseWithAgent: (cap: Capability, agentName: string) => void;
}

export function BrowseCapabilitiesDrawer({
  open,
  capabilities,
  chosenIds,
  loading = false,
  onClose,
  onToggleChosen,
  onUse,
  onUseWithAgent,
}: BrowseCapabilitiesDrawerProps) {
  const [query, setQuery] = useState('');
  const [type, setType] = useState<'all' | CapabilityType>('all');

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return capabilities.filter((item) => {
      const matchesType = type === 'all' || item.type === type;
      const matchesQuery = !needle
        || `${item.name} ${item.description} ${item.owner} ${item.tags.join(' ')} ${item.relatedAgents.join(' ')}`.toLowerCase().includes(needle);
      return matchesType && matchesQuery;
    });
  }, [capabilities, query, type]);

  const handleClose = () => {
    setQuery('');
    setType('all');
    onClose();
  };

  return (
    <SideDrawer
      open={open}
      onClose={handleClose}
      ariaLabel="浏览并选用能力"
      eyebrow={<p className="text-[11px] font-semibold text-[var(--brand)]">技能管理 · 已开放</p>}
      closeLabel="关闭浏览能力"
      panelClassName="flex max-w-xl flex-col"
    >
      <div className="mt-6">
        <h2 className="text-xl font-semibold">浏览能力</h2>
        <p className="mt-2 text-xs leading-6 text-[var(--text-muted)]">
          列表来自技能管理中已发布并对工作区开放的 Skill / Tool / MCP。加入后会出现在「我的技能」。
        </p>
      </div>

      <div className="mt-5 flex flex-col gap-2 sm:flex-row">
        <label className="relative min-w-0 flex-1">
          <span className="sr-only">搜索可选用能力</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索能力、标签或智能体"
            className="h-9 w-full rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] pl-9 pr-3 text-sm outline-none focus:border-[var(--brand)]"
          />
        </label>
        <label className="shrink-0">
          <span className="sr-only">类型筛选</span>
          <select
            aria-label="能力类型"
            value={type}
            onChange={(event) => setType(event.target.value as 'all' | CapabilityType)}
            className="h-9 w-full rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] px-3 text-sm outline-none focus:border-[var(--brand)] sm:w-32"
          >
            <option value="all">全部类型</option>
            <option value="Skill">Skill</option>
            <option value="Tool">Tool</option>
            <option value="MCP">MCP</option>
          </select>
        </label>
      </div>

      <p className="mt-3 text-[11px] tabular-nums text-[var(--text-muted)]">
        {loading ? '同步中…' : `${visible.length} 项可浏览 · 已选用 ${chosenIds.length}`}
      </p>

      <ul className="mt-4 flex-1 space-y-3 overflow-y-auto pb-24">
        {visible.length === 0 ? (
          <li className="rounded-xl border border-dashed border-[var(--border)] px-4 py-10 text-center text-xs text-[var(--text-muted)]">
            {capabilities.length === 0 ? '管理员尚未开放能力' : '没有符合条件的能力'}
          </li>
        ) : (
          visible.map((item) => {
            const meta = TYPE_META[item.type];
            const Icon = meta.icon;
            const chosen = chosenIds.includes(item.id);
            const available = item.status === 'available';
            return (
              <li key={item.id} className="rounded-xl border border-[var(--border)] p-4">
                <div className="flex items-start gap-3">
                  <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${meta.tone}`}>
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] text-[var(--text-muted)]">{item.type} · {item.owner}</p>
                    <p className="mt-1 text-sm font-semibold">{item.name}</p>
                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-[var(--text-muted)]">{item.description}</p>
                  </div>
                </div>

                {item.relatedAgents.length > 0 ? (
                  <div className="mt-3">
                    <p className="text-[10px] font-semibold text-[var(--text-muted)]">关联智能体</p>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {item.relatedAgents.map((agentName) => (
                        <button
                          key={agentName}
                          type="button"
                          disabled={!available}
                          aria-label={`用${agentName}使用${item.name}`}
                          onClick={() => onUseWithAgent(item, agentName)}
                          className="inline-flex items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--bg-elevated)] px-2.5 py-1 text-[10px] font-medium text-[var(--text-secondary)] hover:border-[var(--brand)] hover:text-[var(--brand)] disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <Bot className="h-3 w-3" />
                          {agentName}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="mt-3 text-[10px] text-[var(--text-muted)]">暂无绑定智能体，可直接使用能力。</p>
                )}

                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    aria-pressed={chosen}
                    onClick={() => onToggleChosen(item.id)}
                    className={`inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold transition ${
                      chosen
                        ? 'bg-[var(--brand-light)] text-[var(--brand)]'
                        : 'border border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--brand)] hover:text-[var(--brand)]'
                    }`}
                  >
                    {chosen ? <Check className="h-3.5 w-3.5" /> : null}
                    {chosen ? '已加入我的技能' : '加入我的技能'}
                  </button>
                  <button
                    type="button"
                    disabled={!available}
                    onClick={() => onUse(item)}
                    className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-[var(--brand)] px-3 text-xs font-semibold text-white hover:bg-[var(--brand-hover)] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    开始使用
                  </button>
                </div>
              </li>
            );
          })
        )}
      </ul>

      <div className="sticky bottom-0 -mx-6 mt-auto border-t border-[var(--border)] bg-[var(--surface-1)] px-6 py-4 sm:-mx-8 sm:px-8">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-[var(--text-muted)]">
            {chosenIds.length > 0 ? `已加入 ${chosenIds.length} 个到我的技能` : '选择后会出现在我的技能'}
          </p>
          <button
            type="button"
            onClick={handleClose}
            className="inline-flex h-9 items-center rounded-lg bg-[var(--brand)] px-4 text-xs font-semibold text-white hover:bg-[var(--brand-hover)]"
          >
            完成
          </button>
        </div>
      </div>
    </SideDrawer>
  );
}
