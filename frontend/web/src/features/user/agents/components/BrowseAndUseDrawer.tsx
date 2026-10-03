import { Bot, Check, MessageSquareText, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { SideDrawer } from '@/components/feedback/SideDrawer';
import type { Agent, AgentCategory } from '../schema';

const CATEGORY_LABEL: Record<'all' | AgentCategory, string> = {
  all: '全部场景',
  销售支持: '销售支持',
  企业通用: '企业通用',
  客服应答: '客服应答',
  数据分析: '数据分析',
  文案创作: '文案创作',
};

interface BrowseAndUseDrawerProps {
  open: boolean;
  agents: Agent[];
  chosenIds: string[];
  loading?: boolean;
  onClose: () => void;
  onToggleChosen: (id: string) => void;
  onStartConversation: (agent: Agent) => void;
}

export function BrowseAndUseDrawer({
  open,
  agents,
  chosenIds,
  loading = false,
  onClose,
  onToggleChosen,
  onStartConversation,
}: BrowseAndUseDrawerProps) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<'all' | AgentCategory>('all');

  const categoryOptions = useMemo(() => {
    const present = Array.from(new Set(agents.map((agent) => agent.category))) as AgentCategory[];
    return ['all', ...present] as Array<'all' | AgentCategory>;
  }, [agents]);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return agents.filter((agent) => {
      const matchesCategory = category === 'all' || agent.category === category;
      const matchesQuery = !needle
        || `${agent.name} ${agent.description} ${agent.category} ${agent.owner}`.toLowerCase().includes(needle);
      return matchesCategory && matchesQuery;
    });
  }, [agents, category, query]);

  const chosenCount = chosenIds.length;

  const handleClose = () => {
    setQuery('');
    setCategory('all');
    onClose();
  };

  return (
    <SideDrawer
      open={open}
      onClose={handleClose}
      ariaLabel="浏览并选用智能体"
      eyebrow={<p className="text-[11px] font-semibold text-[var(--brand)]">从开放目录选用</p>}
      closeLabel="关闭浏览并选用"
      panelClassName="flex max-w-xl flex-col"
    >
      <div className="mt-6">
        <h2 className="text-xl font-semibold">浏览并选用</h2>
        <p className="mt-2 text-xs leading-6 text-[var(--text-muted)]">
          以下为管理员已发布并对工作区开放的智能体。勾选加入「已选用」，或直接开始对话。
        </p>
      </div>

      <div className="mt-5 flex flex-col gap-2 sm:flex-row">
        <label className="relative min-w-0 flex-1">
          <span className="sr-only">搜索可选用智能体</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索名称、场景或团队"
            className="h-9 w-full rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] pl-9 pr-3 text-sm outline-none focus:border-[var(--brand)]"
          />
        </label>
        <label className="shrink-0">
          <span className="sr-only">场景筛选</span>
          <select
            aria-label="选用场景"
            value={category}
            onChange={(event) => setCategory(event.target.value as 'all' | AgentCategory)}
            className="h-9 w-full rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] px-3 text-sm outline-none focus:border-[var(--brand)] sm:w-36"
          >
            {categoryOptions.map((item) => (
              <option key={item} value={item}>{CATEGORY_LABEL[item] ?? item}</option>
            ))}
          </select>
        </label>
      </div>

      <p className="mt-3 text-[11px] tabular-nums text-[var(--text-muted)]">
        {loading ? '同步中…' : `${visible.length} 项可浏览 · 已选用 ${chosenCount}`}
      </p>

      <ul className="mt-4 flex-1 space-y-3 overflow-y-auto pb-24">
        {visible.length === 0 ? (
          <li className="rounded-xl border border-dashed border-[var(--border)] px-4 py-10 text-center text-xs text-[var(--text-muted)]">
            {agents.length === 0 ? '管理员尚未开放智能体' : '没有符合条件的智能体'}
          </li>
        ) : (
          visible.map((agent) => {
            const chosen = chosenIds.includes(agent.id);
            return (
              <li key={agent.id} className="rounded-xl border border-[var(--border)] p-4">
                <div className="flex items-start gap-3">
                  <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${agent.tone}`}>
                    <Bot className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] text-[var(--text-muted)]">{agent.category} · {agent.owner}</p>
                    <p className="mt-1 text-sm font-semibold">{agent.name}</p>
                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-[var(--text-muted)]">{agent.description}</p>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    aria-pressed={chosen}
                    onClick={() => onToggleChosen(agent.id)}
                    className={`inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold transition ${
                      chosen
                        ? 'bg-[var(--brand-light)] text-[var(--brand)]'
                        : 'border border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--brand)] hover:text-[var(--brand)]'
                    }`}
                  >
                    {chosen ? <Check className="h-3.5 w-3.5" /> : null}
                    {chosen ? '已选用' : '选用'}
                  </button>
                  <button
                    type="button"
                    aria-label={`与${agent.name}开始对话`}
                    onClick={() => onStartConversation(agent)}
                    className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-[var(--brand)] px-3 text-xs font-semibold text-white hover:bg-[var(--brand-hover)]"
                  >
                    <MessageSquareText className="h-3.5 w-3.5" />开始对话
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
            {chosenCount > 0 ? `已选用 ${chosenCount} 个，将显示在智能体` : '勾选后会出现在智能体'}
          </p>
          <button
            type="button"
            onClick={handleClose}
            className="inline-flex h-9 items-center rounded-lg bg-[var(--brand)] px-4 text-xs font-semibold text-white hover:bg-[var(--brand-hover)]"
          >
            完成选用
          </button>
        </div>
      </div>
    </SideDrawer>
  );
}
