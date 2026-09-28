import { ArrowRight, Bot, FileText, Heart, MessageSquareText, Search, ShieldCheck, Sparkles, UsersRound } from 'lucide-react';
import { useMemo, useRef, useState, type MouseEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { SideDrawer } from '@/components/feedback/SideDrawer';
import { useAgents } from '@/api/user/agents';
import type { Agent, AgentCategory } from '@/api/user/agents/schema';
import { mockAgents } from '@/mock/user/agents.fixtures';

const ICON_BY_CATEGORY: Record<AgentCategory, typeof UsersRound> = {
  '销售支持': UsersRound,
  '企业通用': FileText,
  '客服应答': ShieldCheck,
  '数据分析': Bot,
  '文案创作': Sparkles,
};

const categories: Array<'all' | AgentCategory> = ['all', '销售支持', '企业通用', '客服应答', '数据分析', '文案创作'];
const CATEGORY_LABEL: Record<'all' | AgentCategory, string> = {
  all: '全部场景', '销售支持': '销售支持', '企业通用': '企业通用', '客服应答': '客服应答', '数据分析': '数据分析', '文案创作': '文案创作',
};

export default function AgentsPage() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { data: remoteList } = useAgents();
  const agents = (remoteList && remoteList.length > 0 ? remoteList : mockAgents) as Agent[];

  const [category, setCategory] = useState<'all' | AgentCategory>('all');
  const [query, setQuery] = useState('');
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [favorites, setFavorites] = useState<string[]>(['customer-followup']);
  const [selected, setSelected] = useState<Agent | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const isTeamView = pathname === '/team/agents';

  const visible = useMemo(() => agents.filter((agent) =>
    (category === 'all' || agent.category === category) &&
    (!onlyFavorites || favorites.includes(agent.id)) &&
    `${agent.name} ${agent.description} ${agent.category} ${agent.owner}`.toLowerCase().includes(query.trim().toLowerCase()),
  ), [agents, category, onlyFavorites, favorites, query]);

  const openDetails = (agent: Agent, event: MouseEvent<HTMLButtonElement>) => {
    triggerRef.current = event.currentTarget;
    setSelected(agent);
  };
  const closeDetails = () => {
    setSelected(null);
    triggerRef.current?.focus();
  };
  const toggleFavorite = (id: string) => setFavorites((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  const startConversation = (agent: Agent) => navigate('/copilot', { state: { agentId: agent.id, agentName: agent.name, agentExample: agent.example } });

  return (
    <div className="mx-auto w-full max-w-[1440px] space-y-8 p-5 pb-16 sm:p-8 xl:px-10">
      <section className="relative overflow-hidden rounded-[28px] border border-[var(--border)] bg-[var(--surface-1)] p-6 shadow-[var(--shadow-sm)] sm:p-9">
        <div aria-hidden="true" className="pointer-events-none absolute -right-14 -top-24 h-72 w-72 rounded-full border-[48px] border-[var(--brand-light)]" />
        <div className="relative grid gap-8 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-end">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--brand)]">AGENT LIBRARY / 智能体库</p>
            <h1 className="mt-4 max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">先选对助手,再开始对话。</h1>
            <p className="mt-4 max-w-xl text-sm leading-7 text-[var(--text-muted)]">{isTeamView ? '团队已开放的智能体都在这里。了解它擅长什么,选择后直接进入对话。' : '从团队已开放的智能体中挑选适合当前工作的助手,了解适用范围,再带着目标进入对话。'}</p>
            <a href="#agent-catalog" className="mt-7 inline-flex items-center gap-2 rounded-xl bg-[var(--brand)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[var(--brand-hover)]">浏览可用智能体<ArrowRight className="h-4 w-4" /></a>
          </div>
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-5">
            <div className="flex items-center gap-2 text-xs font-semibold text-[var(--brand)]"><ShieldCheck className="h-4 w-4" />使用边界</div>
            <p className="mt-3 text-base font-semibold leading-7">只选择和使用,不在这里配置。</p>
            <p className="mt-2 text-xs leading-6 text-[var(--text-muted)]">智能体由管理员维护。你可以查看用途、收藏常用助手,并在对话中提出任务。</p>
          </div>
        </div>
      </section>

      <section id="agent-catalog" aria-labelledby="agent-catalog-title" className="scroll-mt-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div><p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--brand)]">AVAILABLE TO YOU</p><h2 id="agent-catalog-title" className="mt-2 text-xl font-semibold">可用智能体</h2><p className="mt-1 text-xs text-[var(--text-muted)]">仅展示管理员已开放的智能体 · 当前为本地演示数据</p></div>
          <div className="relative w-full sm:max-w-xs"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" /><label className="sr-only" htmlFor="agent-search">搜索智能体</label><input id="agent-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索智能体、场景或团队" className="h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-1)] pl-10 pr-3 text-sm outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--brand)]" /></div>
        </div>
        <div className="mt-5 flex flex-wrap items-center gap-2">
          <div className="flex max-w-full gap-2 overflow-x-auto pb-1" aria-label="按场景筛选">{categories.map((item) => <button key={item} type="button" aria-pressed={category === item} onClick={() => setCategory(item)} className={`shrink-0 rounded-full px-3.5 py-2 text-xs font-semibold transition ${category === item ? 'bg-[var(--text)] text-[var(--surface-1)]' : 'border border-[var(--border)] bg-[var(--surface-1)] text-[var(--text-secondary)] hover:border-[var(--brand)] hover:text-[var(--brand)]'}`}>{CATEGORY_LABEL[item]}</button>)}</div>
          <button type="button" aria-pressed={onlyFavorites} onClick={() => setOnlyFavorites((value) => !value)} className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-xs font-semibold ${onlyFavorites ? 'border-rose-300 bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300' : 'border-[var(--border)] bg-[var(--surface-1)] text-[var(--text-secondary)]'}`}><Heart className="h-3.5 w-3.5" fill={onlyFavorites ? 'currentColor' : 'none'} />我的收藏</button>
        </div>
        <div className="mt-5 flex items-center justify-between text-xs text-[var(--text-muted)]"><span>找到 {visible.length} 位可用助手</span><span>选择后进入对话</span></div>
        {visible.length ? <div className="mt-3 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{visible.map((agent) => {
          const Icon = ICON_BY_CATEGORY[agent.category] ?? Bot;
          const favorite = favorites.includes(agent.id);
          return <article key={agent.id} className="group flex min-h-[248px] min-w-0 flex-col rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-5 transition hover:-translate-y-0.5 hover:border-[var(--brand)] hover:shadow-[var(--shadow-sm)]"><div className="flex items-start justify-between gap-3"><span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${agent.tone}`}><Icon className="h-5 w-5" /></span><button type="button" aria-label={`${favorite ? '取消收藏' : '收藏'}${agent.name}`} aria-pressed={favorite} onClick={() => toggleFavorite(agent.id)} className={`rounded-lg p-2 transition ${favorite ? 'text-rose-600' : 'text-[var(--text-muted)] hover:text-rose-600'}`}><Heart className="h-4 w-4" fill={favorite ? 'currentColor' : 'none'} /></button></div><p className="mt-4 text-[11px] font-medium text-[var(--text-muted)]">{agent.category} / {agent.owner}</p><button type="button" onClick={(event) => openDetails(agent, event)} className="mt-1 text-left text-base font-semibold hover:text-[var(--brand)]">{agent.name}</button><p className="mt-2 line-clamp-2 text-xs leading-6 text-[var(--text-muted)]">{agent.description}</p><div className="mt-auto flex items-center justify-between gap-2 border-t border-[var(--border)] pt-4"><button type="button" onClick={(event) => openDetails(agent, event)} className="text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--brand)]">了解适用范围</button><button type="button" aria-label={`与${agent.name}开始对话`} onClick={() => startConversation(agent)} className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-[var(--brand-light)] px-3 py-2 text-xs font-semibold text-[var(--brand)] hover:bg-[var(--brand)] hover:text-white"><MessageSquareText className="h-3.5 w-3.5" />开始对话</button></div></article>;
        })}</div> : <div className="mt-3 rounded-2xl border border-dashed border-[var(--border-strong)] p-10 text-center"><Search className="mx-auto h-6 w-6 text-[var(--text-muted)]" /><h3 className="mt-3 text-sm font-semibold">没有找到符合条件的智能体</h3><p className="mt-1 text-xs text-[var(--text-muted)]">试试其他关键词,或清除筛选后重新查看。</p><button type="button" onClick={() => { setQuery(''); setCategory('all'); setOnlyFavorites(false); }} className="mt-4 text-xs font-semibold text-[var(--brand)] hover:underline">清除筛选</button></div>}
      </section>

      <SideDrawer
        open={selected !== null}
        onClose={closeDetails}
        ariaLabel={selected ? `${selected.name}详情` : '智能体详情'}
        eyebrow={<p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--brand)]">AGENT PROFILE / 智能体详情</p>}
        closeLabel="关闭智能体详情"
      >
        {selected && (() => {
          const Icon = ICON_BY_CATEGORY[selected.category] ?? Bot;
          return (
            <>
              <div className={`mt-10 grid h-14 w-14 place-items-center rounded-2xl ${selected.tone}`}>
                <Icon className="h-7 w-7" />
              </div>
              <h2 className="mt-5 text-2xl font-semibold">{selected.name}</h2>
              <p className="mt-2 text-xs text-[var(--text-muted)]">{selected.category} · {selected.owner} · 可使用</p>
              <p className="mt-6 text-sm leading-7 text-[var(--text-secondary)]">{selected.description}</p>
              <div className="mt-7 grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl bg-[var(--bg-elevated)] p-4">
                  <p className="text-xs text-[var(--text-muted)]">适合处理</p>
                  <p className="mt-2 text-sm font-semibold leading-6">{selected.useCase}</p>
                </div>
                <div className="rounded-xl bg-[var(--bg-elevated)] p-4">
                  <p className="text-xs text-[var(--text-muted)]">预期产出</p>
                  <p className="mt-2 text-sm font-semibold leading-6">{selected.output}</p>
                </div>
              </div>
              <div className="mt-5 rounded-xl border border-[var(--border)] p-4">
                <p className="text-xs font-semibold">开始前准备</p>
                <p className="mt-2 text-xs leading-6 text-[var(--text-muted)]">{selected.input}。生成内容仅供参考,重要结果需人工核对;涉及外部发送或数据修改时应先确认。</p>
              </div>
              <div className="mt-7 flex flex-col gap-2 sm:flex-row">
                <button type="button" onClick={() => toggleFavorite(selected.id)} className="inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm font-semibold">
                  <Heart className="h-4 w-4" fill={favorites.includes(selected.id) ? 'currentColor' : 'none'} />
                  {favorites.includes(selected.id) ? '取消收藏' : '收藏'}
                </button>
                <button type="button" onClick={() => startConversation(selected)} className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-[var(--brand)] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[var(--brand-hover)]">
                  <MessageSquareText className="h-4 w-4" />与{selected.name}开始对话<ArrowRight className="h-4 w-4" />
                </button>
              </div>
              <p className="mt-5 text-xs text-[var(--text-muted)]">智能体由管理员维护。此页面仅演示选择与对话入口,未触发真实执行。</p>
            </>
          );
        })()}
      </SideDrawer>
    </div>
  );
}