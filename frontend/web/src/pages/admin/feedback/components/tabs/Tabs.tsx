/**
 * AdminFeedback — 5 个子模块内容。
 * OverviewTab / ListTab / TicketTab / TopicTab / RuleTab。
 */
import { Plus, Search, Smile, ThumbsDown, ThumbsUp, Trash2, User, Clock, Workflow } from 'lucide-react';
import type { Feedback, FeedbackSentiment, FeedbackStatus, RoutingRule, Ticket, TopicCluster } from '@/api/admin/feedback/schema';
import { PRIORITY_BADGE, PRIORITY_FILTER, ROUTING_ACTION_LABEL, SENTIMENT_FILTER, SENTIMENT_META, STATUS_BADGE, STATUS_FILTER } from '../constants';
import { Sparkline } from '../Primitives';
import { FeedbackCard } from '../FeedbackCard';
import { BatchToolbar } from '../BatchToolbar';

const sentimentIconMap: Record<string, typeof ThumbsUp> = {
  ThumbsUp, ThumbsDown, Smile,
};

interface OverviewTabProps {
  visibleFeedback: Feedback[];
  feedback: Feedback[];
  topics: TopicCluster[];
  tickets: Ticket[];
  counts: { total: number; negative: number; positive: number; newOnes: number };
  positivePct: number;
  negativePct: number;
  search: string;
  setSearch: (s: string) => void;
  statusFilter: 'all' | FeedbackStatus;
  setStatusFilter: (s: 'all' | FeedbackStatus) => void;
  sentimentFilter: 'all' | FeedbackSentiment;
  setSentimentFilter: (s: 'all' | FeedbackSentiment) => void;
  priorityFilter: 'all' | Feedback['priority'];
  setPriorityFilter: (s: 'all' | Feedback['priority']) => void;
  selectedIds: string[];
  setSelectedIds: (ids: string[]) => void;
  onSelect: (id: string) => void;
  onToggleSelect: (id: string) => void;
  onQuickTriage: (fb: Feedback) => void;
  onQuickResolve: (fb: Feedback) => void;
  onBatchTriage: () => void;
  onBatchResolve: () => void;
  onBatchDelete: () => void;
  onJumpToTickets: () => void;
}

export function OverviewTab({
  visibleFeedback, feedback: _feedback, topics, tickets, counts, positivePct, negativePct,
  search, setSearch, statusFilter, setStatusFilter, sentimentFilter, setSentimentFilter, priorityFilter, setPriorityFilter,
  selectedIds, setSelectedIds, onSelect, onToggleSelect, onQuickTriage, onQuickResolve,
  onBatchTriage, onBatchResolve, onBatchDelete, onJumpToTickets,
}: OverviewTabProps) {
  return (
    <>
      {selectedIds.length > 0 && (
        <BatchToolbar
          count={selectedIds.length}
          onClear={() => setSelectedIds([])}
          onBatchTriage={onBatchTriage}
          onBatchResolve={onBatchResolve}
          onBatchDelete={onBatchDelete}
        />
      )}
      <div className="grid gap-4 lg:grid-cols-3">
        <article className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">情感分布</p>
          <div className="mt-3 space-y-2">
            <div className="flex items-center gap-2 text-xs">
              <span className="grid h-6 w-6 place-items-center rounded-full bg-emerald-50 text-emerald-700"><ThumbsUp className="h-3 w-3" /></span>
              <span className="font-semibold">正面</span>
              <span className="ml-auto tabular-nums">{counts.positive}</span>
              <span className="text-[var(--text-muted)]">({positivePct.toFixed(0)}%)</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-[var(--bg-elevated)]">
              <div className="h-full bg-emerald-500" style={{ width: `${positivePct}%` }} />
            </div>
            <div className="flex items-center gap-2 pt-1 text-xs">
              <span className="grid h-6 w-6 place-items-center rounded-full bg-[var(--bg-elevated)] text-[var(--text-secondary)]"><Smile className="h-3 w-3" /></span>
              <span className="font-semibold">中性</span>
              <span className="ml-auto tabular-nums">{counts.total - counts.positive - counts.negative}</span>
            </div>
            <div className="flex items-center gap-2 pt-1 text-xs">
              <span className="grid h-6 w-6 place-items-center rounded-full bg-rose-50 text-rose-700"><ThumbsDown className="h-3 w-3" /></span>
              <span className="font-semibold">负面</span>
              <span className="ml-auto tabular-nums">{counts.negative}</span>
              <span className="text-[var(--text-muted)]">({negativePct.toFixed(0)}%)</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-[var(--bg-elevated)]">
              <div className="h-full bg-rose-500" style={{ width: `${negativePct}%` }} />
            </div>
          </div>
        </article>
        <article className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">高频主题</p>
          <ul className="mt-3 space-y-2">
            {topics.slice(0, 4).map((t) => {
              const sen = SENTIMENT_META[t.sentiment];
              const SenIcon = sentimentIconMap[sen.icon] ?? Smile;
              return (
                <li key={t.id} className="flex items-center gap-2">
                  <span className={`grid h-6 w-6 place-items-center rounded-full ${sen.tone}`}><SenIcon className="h-3 w-3" /></span>
                  <span className="text-xs font-semibold">{t.name}</span>
                  <span className="ml-auto text-[11px] text-[var(--text-muted)]">{t.count} 条</span>
                </li>
              );
            })}
          </ul>
        </article>
        <article className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">工单状态</p>
          <ul className="mt-3 space-y-2 text-xs">
            {(['new', 'triaged', 'in-progress', 'resolved'] as FeedbackStatus[]).map((s) => {
              const badge = STATUS_BADGE[s];
              const c = s === 'new' ? counts.newOnes : s === 'triaged' ? tickets.filter((t) => t.status === 'triaged').length : s === 'in-progress' ? tickets.filter((t) => t.status === 'in-progress').length : tickets.filter((t) => t.status === 'resolved').length;
              return (
                <li key={s} className="flex items-center gap-2">
                  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${badge.className}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${badge.dot}`} aria-hidden="true" />{badge.label}
                  </span>
                  <span className="ml-auto tabular-nums">{c}</span>
                </li>
              );
            })}
          </ul>
        </article>
      </div>
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-700 dark:text-amber-300">反馈总览</p>
            <h3 className="mt-2 text-lg font-semibold">最新反馈</h3>
            <p className="mt-1 text-xs text-[var(--text-muted)]">{visibleFeedback.length} 条结果 · 优先处理「紧急」与「负面」。</p>
          </div>
          <div className="relative w-full xl:max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
            <label className="sr-only" htmlFor="fb-search">搜索反馈</label>
            <input id="fb-search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="搜索反馈 / 用户 / 主题" className="h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-1)] pl-10 pr-3 text-sm outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--brand)]" />
          </div>
        </div>
        <div className="mt-5 flex flex-wrap items-center gap-2">
          <label className="sr-only" htmlFor="fb-status">按状态筛选</label>
          <select id="fb-status" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as 'all' | FeedbackStatus)} className="h-9 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] px-3 text-xs font-medium outline-none">
            {STATUS_FILTER.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
          </select>
          <label className="sr-only" htmlFor="fb-sentiment">按情感筛选</label>
          <select id="fb-sentiment" value={sentimentFilter} onChange={(e) => setSentimentFilter(e.target.value as 'all' | FeedbackSentiment)} className="h-9 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] px-3 text-xs font-medium outline-none">
            {SENTIMENT_FILTER.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
          </select>
          <label className="sr-only" htmlFor="fb-priority">按优先级筛选</label>
          <select id="fb-priority" value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value as 'all' | Feedback['priority'])} className="h-9 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] px-3 text-xs font-medium outline-none">
            {PRIORITY_FILTER.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
          </select>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-2">
          {visibleFeedback.map((fb) => (
            <FeedbackCard
              key={fb.id}
              fb={fb}
              selected={selectedIds.includes(fb.id)}
              onToggleSelect={onToggleSelect}
              onSelect={onSelect}
              onQuickTriage={onQuickTriage}
              onQuickResolve={onQuickResolve}
            />
          ))}
        </div>
        {visibleFeedback.length === 0 && (
          <div className="mt-5 rounded-2xl border border-dashed border-[var(--border-strong)] p-12 text-center">
            <Search className="mx-auto h-6 w-6 text-[var(--text-muted)]" />
            <p className="mt-3 text-sm font-semibold">没有匹配的反馈</p>
            <p className="mt-1 text-xs text-[var(--text-muted)]">尝试其他关键词或清除筛选。</p>
          </div>
        )}
      </div>
    </>
  );
}

interface ListTabProps {
  visibleFeedback: Feedback[];
  search: string;
  setSearch: (s: string) => void;
  selectedIds: string[];
  onSelect: (id: string) => void;
  onToggleSelect: (id: string) => void;
  onQuickTriage: (fb: Feedback) => void;
  onQuickResolve: (fb: Feedback) => void;
}

export function ListTab({ visibleFeedback, search, setSearch, selectedIds, onSelect, onToggleSelect, onQuickTriage, onQuickResolve }: ListTabProps) {
  return (
    <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-700 dark:text-amber-300">反馈列表</p>
          <h3 className="mt-2 text-lg font-semibold">所有反馈</h3>
          <p className="mt-1 text-xs text-[var(--text-muted)]">{visibleFeedback.length} 条结果</p>
        </div>
        <div className="relative w-full xl:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="搜索反馈" className="h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-1)] pl-10 pr-3 text-sm outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--brand)]" />
        </div>
      </div>
      <div className="mt-5 grid gap-3 md:grid-cols-2">
        {visibleFeedback.map((fb) => (
          <FeedbackCard
            key={fb.id}
            fb={fb}
            selected={selectedIds.includes(fb.id)}
            onToggleSelect={onToggleSelect}
            onSelect={onSelect}
            onQuickTriage={onQuickTriage}
            onQuickResolve={onQuickResolve}
          />
        ))}
      </div>
    </section>
  );
}

interface TicketTabProps {
  tickets: Ticket[];
  onCreate: () => void;
}

export function TicketTab({ tickets, onCreate }: TicketTabProps) {
  return (
    <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-700 dark:text-amber-300">工单管理</p>
          <h3 className="mt-2 text-lg font-semibold">所有工单</h3>
          <p className="mt-1 text-xs text-[var(--text-muted)]">共 {tickets.length} 张 · 已解决 {tickets.filter((t) => t.status === 'resolved').length}</p>
        </div>
        <button type="button" onClick={onCreate} className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-[var(--brand)] px-3 text-xs font-semibold text-white hover:bg-[var(--brand-hover)]">
          <Plus className="h-3.5 w-3.5" />新建工单
        </button>
      </div>
      <div className="mt-5 grid gap-3 md:grid-cols-2">
        {tickets.map((tk) => {
          const badge = STATUS_BADGE[tk.status];
          const prio = PRIORITY_BADGE[tk.priority];
          return (
            <article key={tk.id} className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-4 transition hover:border-[var(--brand)]">
              <header className="flex flex-wrap items-center gap-2">
                <h4 className="text-sm font-semibold">{tk.title}</h4>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${prio.className}`}>{prio.label}优先</span>
                <span className={`ml-auto inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold ${badge.className}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${badge.dot}`} aria-hidden="true" />{badge.label}
                </span>
              </header>
              <p className="mt-2 line-clamp-2 text-[11px] leading-5 text-[var(--text-muted)]">{tk.description}</p>
              <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px] text-[var(--text-muted)]">
                <span className="rounded-full bg-[var(--bg-elevated)] px-2 py-0.5 font-medium">{tk.topic}</span>
                <span>· {tk.feedbackIds.length} 条关联反馈</span>
                <span className="ml-auto inline-flex items-center gap-1"><User className="h-3 w-3" />{tk.owner}</span>
              </div>
              <div className="mt-3 flex items-center gap-3 text-[11px] text-[var(--text-muted)]">
                <Clock className="h-3 w-3" />{tk.createdAt}
                <span>· 截止 {tk.dueAt}</span>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

interface TopicTabProps {
  topics: TopicCluster[];
  onJumpToTickets: () => void;
}

export function TopicTab({ topics, onJumpToTickets }: TopicTabProps) {
  return (
    <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-5">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-700 dark:text-amber-300">反馈主题</p>
      <h3 className="mt-2 text-lg font-semibold">主题聚类</h3>
      <p className="mt-1 text-xs text-[var(--text-muted)]">根据反馈文本自动聚类,可按主题创建工单或配置规则。</p>
      <div className="mt-5 grid gap-4 md:grid-cols-2">
        {topics.map((t) => {
          const sen = SENTIMENT_META[t.sentiment];
          const SenIcon = sentimentIconMap[sen.icon] ?? Smile;
          return (
            <article key={t.id} className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-5 transition hover:border-[var(--brand)]">
              <header className="flex items-start gap-3">
                <span className={`grid h-10 w-10 place-items-center rounded-xl ${sen.tone}`}>
                  <SenIcon className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <h4 className="text-sm font-semibold">{t.name}</h4>
                  <p className="mt-1 line-clamp-2 text-[11px] leading-5 text-[var(--text-muted)]">{t.description}</p>
                </div>
                <Sparkline data={t.trend} stroke={t.sentiment === 'negative' ? '#f43f5e' : '#10b981'} />
              </header>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${sen.tone}`}>{sen.label}</span>
                <span className="rounded-full bg-[var(--bg-elevated)] px-2 py-0.5 text-[10px] font-semibold">{t.count} 条</span>
              </div>
              <ul className="mt-3 space-y-1 text-[11px] text-[var(--text-muted)]">
                {t.recentComments.slice(0, 2).map((c, idx) => <li key={idx}>· {c}</li>)}
              </ul>
              <div className="mt-3 flex items-center gap-2">
                <button type="button" onClick={onJumpToTickets} className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-[var(--brand)] bg-[var(--brand-light)] px-3 py-1.5 text-[11px] font-semibold text-[var(--brand)] hover:bg-white">
                  <Plus className="h-3 w-3" />基于主题建工单
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

interface RuleTabProps {
  rules: RoutingRule[];
  onCreate: () => void;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
}

export function RuleTab({ rules, onCreate, onToggle, onDelete }: RuleTabProps) {
  return (
    <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-700 dark:text-amber-300">规则模板</p>
          <h3 className="mt-2 text-lg font-semibold">反馈路由规则</h3>
          <p className="mt-1 text-xs text-[var(--text-muted)]">配置主题 / 情感 / 动作 / 目标团队的自动化路由</p>
        </div>
        <button type="button" onClick={onCreate} className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-[var(--brand)] px-3 text-xs font-semibold text-white hover:bg-[var(--brand-hover)]">
          <Plus className="h-3.5 w-3.5" />新建规则
        </button>
      </div>
      <div className="mt-5 space-y-3">
        {rules.map((r) => (
          <article key={r.id} className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-4">
            <header className="flex flex-wrap items-center gap-2">
              <button type="button" onClick={() => onToggle(r.id)} aria-pressed={r.enabled} className={`relative inline-flex h-5 w-9 items-center rounded-full transition ${r.enabled ? 'bg-[var(--brand)]' : 'bg-[var(--bg-elevated)]'}`}>
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition ${r.enabled ? 'translate-x-4' : 'translate-x-0.5'}`} />
              </button>
              <h4 className="text-sm font-semibold">{r.name}</h4>
              <span className="ml-auto flex items-center gap-2">
                <button type="button" onClick={() => onDelete(r.id)} aria-label="删除规则" className="grid h-7 w-7 place-items-center rounded-lg text-[var(--text-muted)] hover:bg-rose-50 hover:text-rose-600">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </span>
            </header>
            <p className="mt-2 text-[11px] text-[var(--text-muted)]">{r.description}</p>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px]">
              <span className="rounded-lg bg-[var(--bg-elevated)] px-2 py-1 font-semibold">主题:{r.matchTopic}</span>
              <span className="rounded-lg bg-[var(--bg-elevated)] px-2 py-1 font-semibold">情感:{r.matchSentiment === 'all' ? '全部' : SENTIMENT_META[r.matchSentiment].label}</span>
              <span className="rounded-lg bg-[var(--bg-elevated)] px-2 py-1 font-semibold">{ROUTING_ACTION_LABEL[r.action]}</span>
              <span className="ml-auto rounded-lg border border-[var(--border)] px-2 py-1 font-medium">目标:{r.target}</span>
            </div>
          </article>
        ))}
        {rules.length === 0 && (
          <div className="rounded-2xl border border-dashed border-[var(--border)] p-8 text-center">
            <Workflow className="mx-auto h-6 w-6 text-[var(--text-muted)]" />
            <p className="mt-3 text-sm font-semibold">暂无规则</p>
            <p className="mt-1 text-xs text-[var(--text-muted)]">所有规则都已删除。</p>
          </div>
        )}
      </div>
    </section>
  );
}

