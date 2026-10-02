/**
 * OverviewTab — KPI / 结果分布 / 类别分布 / 7 日趋势 + 最近审计列表 + 搜索 + 批量工具栏。
 */
import { ArrowDown, ArrowUp, AlertTriangle, Ban, Clock, ShieldAlert, ShieldCheck, Search } from 'lucide-react';
import type { AuditEntry, AuditStats } from '../../schema';
import { AuditCard } from '../AuditCard';
import { BatchToolbar } from '../BatchToolbar';
import { CATEGORY_META } from '../constants';
import { Sparkline } from '../Primitives';

interface OverviewTabProps {
  entries: AuditEntry[];
  stats: AuditStats;
  unresolved: number;
  selectedIds: string[];
  search: string;
  setSearch: (s: string) => void;
  onToggleSelect: (id: string) => void;
  onToggleStar: (id: string) => void;
  onSelect: (e: AuditEntry) => void;
  onBatchExport: () => void;
  onBatchResolve: () => void;
  onClearSelection: () => void;
}

function StatsCard({ label, value, delta, tone }: { label: string; value: string; delta: string; tone: 'up' | 'down' | 'flat' | 'warn' }) {
  const Icon = tone === 'up' ? ArrowUp : tone === 'down' ? ArrowDown : null;
  const cls = tone === 'up' ? 'text-rose-600' : tone === 'down' ? 'text-emerald-600' : tone === 'warn' ? 'text-amber-600' : 'text-[var(--text-muted)]';
  return (
    <article className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-5">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">{label}</p>
      <p className="mt-2 text-2xl font-semibold tabular-nums">{value}</p>
      <p className={`mt-1 inline-flex items-center gap-1 text-[11px] ${cls}`}>
        {Icon && <Icon className="h-3 w-3" />}
        {delta}
      </p>
    </article>
  );
}

export function OverviewTab({
  entries, stats, unresolved, selectedIds, search, setSearch,
  onToggleSelect, onToggleStar, onSelect, onBatchExport, onBatchResolve, onClearSelection,
}: OverviewTabProps) {
  const visibleEntries = (() => {
    const q = search.trim().toLowerCase();
    if (q.length === 0) return entries;
    return entries.filter((s) => `${s.id} ${s.toolName} ${s.actor} ${s.sessionId}`.toLowerCase().includes(q));
  })();
  return (
    <>
      {selectedIds.length > 0 && (
        <BatchToolbar
          count={selectedIds.length}
          onClear={onClearSelection}
          onBatchExport={onBatchExport}
          onBatchResolve={onBatchResolve}
          onBatchMark={onBatchExport}
        />
      )}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatsCard label="今日审计" value={stats.total.toLocaleString('zh-CN')} delta="较昨日 +12.4%" tone="up" />
        <StatsCard label="阻断率" value={`${stats.denyRate}%`} delta="较昨日 -1.2%" tone="down" />
        <StatsCard label="严重事件" value={`${stats.critical}`} delta="未处置 2" tone="up" />
        <StatsCard label="敏感操作" value={stats.sensitive.toString()} delta="需审批 1" tone="warn" />
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <article className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">结果分布</p>
          <ul className="mt-3 space-y-2 text-xs">
            <li className="flex items-center gap-2">
              <span className="grid h-6 w-6 place-items-center rounded-full bg-emerald-50 text-emerald-700"><ShieldCheck className="h-3 w-3" /></span>
              <span className="font-semibold">允许</span>
              <span className="ml-auto tabular-nums">{stats.allowed}</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="grid h-6 w-6 place-items-center rounded-full bg-rose-50 text-rose-700"><Ban className="h-3 w-3" /></span>
              <span className="font-semibold">拒绝</span>
              <span className="ml-auto tabular-nums">{stats.denied}</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="grid h-6 w-6 place-items-center rounded-full bg-amber-50 text-amber-700"><AlertTriangle className="h-3 w-3" /></span>
              <span className="font-semibold">待审批</span>
              <span className="ml-auto tabular-nums">{stats.pending}</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="grid h-6 w-6 place-items-center rounded-full bg-sky-50 text-sky-700"><Clock className="h-3 w-3" /></span>
              <span className="font-semibold">超时</span>
              <span className="ml-auto tabular-nums">{stats.timeout}</span>
            </li>
          </ul>
        </article>
        <article className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">类别分布</p>
          <div className="mt-3 space-y-2">
            {(Object.keys(CATEGORY_META) as Array<keyof typeof CATEGORY_META>).map((k) => {
              const meta = CATEGORY_META[k];
              const Icon = meta.icon;
              const count = stats.byCategory[k];
              const pct = Math.round((count / Math.max(entries.length, 1)) * 100);
              return (
                <div key={k} className="flex items-center gap-2">
                  <span className={`inline-flex h-6 w-6 items-center justify-center rounded-md ${meta.tone}`}>
                    <Icon className="h-3 w-3" />
                  </span>
                  <span className="text-xs font-semibold">{meta.label}</span>
                  <div className="relative ml-2 h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--bg-elevated)]">
                    <div className="h-full bg-[var(--brand)]" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="w-8 text-right text-[10px] tabular-nums">{count}</span>
                </div>
              );
            })}
          </div>
        </article>
        <article className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">7 日趋势</p>
          <Sparkline data={[18, 22, 20, 24, 26, 24, 28, 30, 27, 25, 23, 20, 22, 26]} stroke="#f43f5e" />
          <div className="mt-2 flex items-center justify-between text-[10px] text-[var(--text-muted)]">
            <span>近 14 日审计量</span>
            <span>高峰 30</span>
          </div>
        </article>
      </div>
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-rose-700 dark:text-rose-300">最近审计</p>
            <h3 className="mt-2 text-lg font-semibold">最新审计记录</h3>
            <p className="mt-1 text-xs text-[var(--text-muted)]">{visibleEntries.length} 条记录 · {unresolved} 个未处置事件</p>
          </div>
          <div className="relative w-full xl:max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
            <label className="sr-only" htmlFor="audit-search">搜索审计</label>
            <input
              id="audit-search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="搜索记录 / 工具 / 调用方"
              className="h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-1)] pl-10 pr-3 text-sm outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--brand)]"
            />
          </div>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {visibleEntries.map((e) => (
            <AuditCard
              key={e.id}
              entry={e}
              selected={selectedIds.includes(e.id)}
              onToggleSelect={onToggleSelect}
              onSelect={onSelect}
              onToggleStar={onToggleStar}
              onExportOne={() => {}}
              onResolve={() => {}}
            />
          ))}
        </div>
      </div>
      <div className="flex items-center gap-1.5 text-[10px] text-[var(--text-muted)]">
        <ShieldAlert className="h-3 w-3" />
        今日审计 20,254 · 严重事件 3 条
      </div>
    </>
  );
}