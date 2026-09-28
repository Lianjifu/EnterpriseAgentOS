import { Bot, Clock3, Heart, Network, Search, ShieldCheck, Sparkles, Wrench } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { NoticeBanner } from '@/components/feedback/NoticeBanner';
import { useCapabilities, useRecordUse, useToggleFavorite } from '@/api/user/skills';
import { mockRecentUse } from '@/mock/user/skills.fixtures';
import type { Capability, CapabilityType, SkillListParams } from '@/api/user/skills/schema';

interface RecentUseItem { id: string; name: string; type: CapabilityType; time: string }
import { FilterBar } from './components/FilterBar';
import { CapabilityDrawer } from './components/CapabilityDrawer';
import { UseModal } from './components/UseModal';

const TYPE_META = {
  Skill: { icon: Sparkles, tone: 'bg-violet-50 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300', label: '工作技能' },
  Tool: { icon: Wrench, tone: 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300', label: '受控工具' },
  MCP: { icon: Network, tone: 'bg-sky-50 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300', label: '外部连接' },
} as const;

const DEFAULT_PARAMS: SkillListParams = { type: 'all', q: '' };

export default function SkillsPage() {
  const navigate = useNavigate();
  const [params, setParams] = useState<SkillListParams>(DEFAULT_PARAMS);
  const [favorites, setFavorites] = useState<string[]>(['skill-summary', 'mcp-crm']);
  const [selected, setSelected] = useState<Capability | null>(null);
  const [useTarget, setUseTarget] = useState<Capability | null>(null);
  const [recent, setRecent] = useState<RecentUseItem[]>(mockRecentUse as RecentUseItem[]);
  const [notice, setNotice] = useState('');

  const { data: list = [], isLoading } = useCapabilities(params);
  const toggleFav = useToggleFavorite();
  const recordUse = useRecordUse();

  const visible = useMemo(() => {
    const q = params.q?.trim().toLowerCase() ?? '';
    return list.filter((item) =>
      (params.type === 'all' || params.type === undefined || item.type === params.type) &&
      (params.status === 'all' || params.status === undefined || item.status === params.status) &&
      (!params.onlyFavorites || favorites.includes(item.id)) &&
      (`${item.name} ${item.description} ${item.owner} ${item.tags.join(' ')}`.toLowerCase().includes(q)),
    );
  }, [list, params, favorites]);

  const toggleFavorite = (item: Capability) => {
    setFavorites((current) => current.includes(item.id) ? current.filter((id) => id !== item.id) : [...current, item.id]);
    toggleFav.mutate({ id: item.id, on: !favorites.includes(item.id) });
  };

  const openUse = (item: Capability) => {
    if (item.status === 'available') setUseTarget(item);
    else setNotice('这个能力当前不可用，请选择其他能力。');
  };

  const confirmUse = (goal: string) => {
    if (!useTarget) return;
    setRecent((current) => [{ id: `recent-${Date.now()}`, name: useTarget.name, type: useTarget.type, time: '刚刚 · 本地演示' }, ...current].slice(0, 5));
    setNotice(`「${useTarget.name}」已加入本地使用记录，未触发真实连接。`);
    recordUse.mutate({ id: useTarget.id, goal });
    setUseTarget(null);
  };

  const useToolInCopilot = (item: Capability) => navigate('/copilot', { state: { skillName: item.name } });

  return (
    <div className="mx-auto w-full max-w-[1440px] space-y-8 p-5 pb-16 sm:p-8 xl:px-10">
      <section className="relative overflow-hidden rounded-[28px] border border-[var(--border)] bg-[var(--surface-1)] px-6 py-8 shadow-[var(--shadow-sm)] sm:px-9 sm:py-10">
        <div aria-hidden="true" className="pointer-events-none absolute -right-20 -top-16 h-72 w-72 rounded-full border-[42px] border-violet-400/10" />
        <div className="relative grid gap-8 lg:grid-cols-[1fr_340px] lg:items-end">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-violet-700 dark:text-violet-300">CAPABILITIES / 我的技能</p>
            <h2 className="mt-4 max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">选择已经准备好的能力，直接开始工作。</h2>
            <p className="mt-4 max-w-xl text-sm leading-7 text-[var(--text-muted)]">Skill、Tool 和 MCP 由管理员统一配置。你可以查看用途、确认范围，然后将它用于当前任务。</p>
            <div className="mt-7 flex flex-wrap gap-3">
              <a href="#skills-catalog" className="inline-flex items-center gap-2 rounded-xl bg-[var(--brand)] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[var(--brand-hover)]">
                <Sparkles className="h-4 w-4" />浏览能力
              </a>
              <span className="rounded-xl border border-violet-400/25 bg-violet-50 px-3 py-2.5 text-xs text-violet-800 dark:bg-violet-500/10 dark:text-violet-200">管理员维护 · 用户使用</span>
            </div>
          </div>
          <div className="relative rounded-2xl border border-violet-400/20 bg-violet-50/80 p-5 dark:bg-violet-500/10">
            <div className="flex items-center gap-2 text-xs font-semibold text-violet-700 dark:text-violet-300">
              <ShieldCheck className="h-4 w-4" />使用前确认
            </div>
            <p className="mt-4 text-lg font-semibold leading-7 text-[var(--text)]">知道它做什么，也知道它不会做什么。</p>
            <p className="mt-2 text-xs leading-6 text-[var(--text-muted)]">每项能力都标注输入、输出和风险范围。</p>
          </div>
        </div>
      </section>

      {notice && <NoticeBanner tone="violet" onClose={() => setNotice('')}>{notice}</NoticeBanner>}

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-5">
          <p className="text-xs text-[var(--text-muted)]">可用 Skill</p>
          <p className="mt-3 text-3xl font-semibold">{list.filter((item) => item.type === 'Skill' && item.status === 'available').length}</p>
          <p className="mt-1 text-xs text-[var(--text-muted)]">把经验带入工作</p>
        </div>
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-5">
          <p className="text-xs text-[var(--text-muted)]">受控 Tool</p>
          <p className="mt-3 text-3xl font-semibold">{list.filter((item) => item.type === 'Tool').length}</p>
          <p className="mt-1 text-xs text-[var(--text-muted)]">需要确认后调用</p>
        </div>
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-5">
          <p className="text-xs text-[var(--text-muted)]">最近使用</p>
          <p className="mt-3 text-3xl font-semibold">{recent.length}</p>
          <p className="mt-1 text-xs text-[var(--text-muted)]">本地演示记录</p>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
        <section id="skills-catalog" aria-labelledby="skills-title" className="min-w-0">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--brand)]">READY CAPABILITIES</p>
              <h3 id="skills-title" className="mt-2 text-xl font-semibold">能力目录</h3>
              <p className="mt-1 text-xs text-[var(--text-muted)]">管理员已配置的可用能力 · {visible.length} 项结果</p>
            </div>
            <div className="relative w-full xl:max-w-xs">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
              <label className="sr-only" htmlFor="skills-search">搜索能力</label>
              <input
                id="skills-search"
                value={params.q ?? ''}
                onChange={(event) => setParams((p) => ({ ...p, q: event.target.value }))}
                placeholder="搜索 Skill、Tool 或 MCP"
                className="h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-1)] pl-10 pr-3 text-sm outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--brand)]"
              />
            </div>
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-2">
            <FilterBar params={params} onChange={setParams} />
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {visible.map((item) => {
              const meta = TYPE_META[item.type];
              const Icon = meta.icon;
              const fav = favorites.includes(item.id);
              return (
                <article key={item.id} className="group flex min-h-[250px] flex-col rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-5 transition hover:-translate-y-0.5 hover:border-[var(--brand)] hover:shadow-[var(--shadow-sm)]">
                  <div className="flex items-start justify-between">
                    <span className={`grid h-10 w-10 place-items-center rounded-xl ${meta.tone}`}><Icon className="h-5 w-5" /></span>
                    <button
                      type="button"
                      aria-label={`${fav ? '取消收藏' : '收藏'}${item.name}`}
                      aria-pressed={fav}
                      onClick={() => toggleFavorite(item)}
                      className={`rounded-lg p-2 ${fav ? 'text-rose-500' : 'text-[var(--text-muted)] hover:text-rose-500'}`}
                    >
                      <Heart className="h-4 w-4" fill={fav ? 'currentColor' : 'none'} />
                    </button>
                  </div>
                  <button type="button" onClick={() => setSelected(item)} className="mt-4 text-left">
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">{item.type} · {meta.label}</span>
                    <h4 className="mt-2 text-base font-semibold leading-6 group-hover:text-[var(--brand)]">{item.name}</h4>
                    <p className="mt-2 line-clamp-2 text-xs leading-6 text-[var(--text-muted)]">{item.description}</p>
                  </button>
                  <div className="mt-auto flex items-center justify-between gap-2 border-t border-[var(--border)] pt-4 text-[11px] text-[var(--text-muted)]">
                    <span className="truncate">{item.owner}</span>
                    <span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${item.status === 'available' ? 'bg-[var(--success-bg)] text-[var(--success)]' : 'bg-[var(--bg-hover)] text-[var(--text-muted)]'}`}>{item.status === 'available' ? '可使用' : '暂不可用'}</span>
                  </div>
                </article>
              );
            })}
          </div>
          {visible.length === 0 && (
            <div className="mt-5 rounded-2xl border border-dashed border-[var(--border-strong)] p-12 text-center">
              <Search className="mx-auto h-6 w-6 text-[var(--text-muted)]" />
              <p className="mt-3 text-sm font-semibold">没有匹配的能力</p>
              <p className="mt-1 text-xs text-[var(--text-muted)]">尝试其他关键词或清除筛选。</p>
            </div>
          )}
          {isLoading && !list.length && <p className="mt-3 text-xs text-[var(--text-muted)]">加载中…</p>}
        </section>

        <aside className="space-y-5">
          <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-5">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Clock3 className="h-4 w-4 text-[var(--brand)]" />最近使用
            </div>
            <p className="mt-2 text-xs text-[var(--text-muted)]">你最近带入工作中的能力。</p>
            <ol className="mt-5 space-y-3">
              {recent.map((item) => (
                <li key={item.id} className="flex items-center gap-3">
                  <span className="grid h-8 w-8 place-items-center rounded-lg bg-[var(--bg-elevated)] text-[var(--brand)]">
                    <Sparkles className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-semibold">{item.name}</span>
                    <span className="mt-1 block text-[10px] text-[var(--text-muted)]">{item.type} · {item.time}</span>
                  </span>
                </li>
              ))}
            </ol>
          </section>
          <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-5">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-[var(--brand-light)] text-[var(--brand)]"><Bot className="h-4 w-4" /></span>
            <h3 className="mt-4 text-sm font-semibold">在对话里使用</h3>
            <p className="mt-2 text-xs leading-6 text-[var(--text-muted)]">Tool 和 MCP 会在确认后进入对话上下文，不会在这里修改连接配置。</p>
          </section>
        </aside>
      </div>

      <CapabilityDrawer
        selected={selected}
        onClose={() => setSelected(null)}
        favorited={selected ? favorites.includes(selected.id) : false}
        onToggleFavorite={toggleFavorite}
        onUse={openUse}
        onUseInCopilot={useToolInCopilot}
      />
      <UseModal target={useTarget} onClose={() => setUseTarget(null)} onConfirm={confirmUse} />
    </div>
  );
}