/**
 * OverviewTab — 状态分布 / 平均耗时 / 今日 Token + 最近会话列表 + 搜索 + 批量工具栏。
 */
import { useMemo, useState } from 'react';
import {
  AlertCircle, AlertTriangle, ArrowDown, ArrowUp, CheckCircle2, RefreshCw, Search,
} from 'lucide-react';
import type { Incident, Session } from '@/api/admin/operations/schema';
import { SessionCard } from '../SessionCard';
import { BatchToolbar } from '../BatchToolbar';
import { Sparkline } from '../Sparkline';

export function OverviewTab({
  sessions,
  incidents,
  selectedIds,
  search,
  setSearch,
  onToggleSelect,
  onToggleStar,
  onSelect,
  onBatchExport,
  onBatchResolve,
  onClear,
}: {
  sessions: Session[];
  incidents: Incident[];
  selectedIds: string[];
  search: string;
  setSearch: (v: string) => void;
  onToggleSelect: (id: string) => void;
  onToggleStar: (id: string) => void;
  onSelect: (s: Session) => void;
  onBatchExport: () => void;
  onBatchResolve: () => void;
  onClear: () => void;
}) {
  const stats = useMemo(() => {
    const total = sessions.length;
    const success = sessions.filter((s) => s.status === 'success').length;
    const running = sessions.filter((s) => s.status === 'running').length;
    const failed = sessions.filter((s) => s.status === 'failed').length;
    const partial = sessions.filter((s) => s.status === 'partial').length;
    const errorRate = Math.round(((failed + partial) / Math.max(total, 1)) * 1000) / 10;
    const avgLatency = Math.round(sessions.reduce((s, x) => s + x.totalDurationMs, 0) / Math.max(total, 1));
    const totalTokens = sessions.reduce((s, x) => s + x.totalTokens, 0);
    return { total, success, running, failed, partial, errorRate, avgLatency, totalTokens };
  }, [sessions]);

  const visibleSessions = useMemo(() => {
    const q = search.trim().toLowerCase();
    return sessions.filter((s) =>
      q.length === 0 || `${s.id} ${s.user} ${s.agentName} ${s.summary}`.toLowerCase().includes(q),
    );
  }, [sessions, search]);

  return (
    <>
      {selectedIds.length > 0 && (
        <BatchToolbar
          count={selectedIds.length}
          onClear={onClear}
          onBatchExport={onBatchExport}
          onBatchResolve={onBatchResolve}
        />
      )}
      <div className="grid gap-4 lg:grid-cols-3">
        <article className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">会话状态</p>
          <ul className="mt-3 space-y-2 text-xs">
            <li className="flex items-center gap-2">
              <span className="grid h-6 w-6 place-items-center rounded-full bg-emerald-50 text-emerald-700">
                <CheckCircle2 className="h-3 w-3" />
              </span>
              <span className="font-semibold">完成</span>
              <span className="ml-auto tabular-nums">{stats.success}</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="grid h-6 w-6 place-items-center rounded-full bg-sky-50 text-sky-700">
                <RefreshCw className="h-3 w-3" />
              </span>
              <span className="font-semibold">执行中</span>
              <span className="ml-auto tabular-nums">{stats.running}</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="grid h-6 w-6 place-items-center rounded-full bg-amber-50 text-amber-700">
                <AlertCircle className="h-3 w-3" />
              </span>
              <span className="font-semibold">部分成功</span>
              <span className="ml-auto tabular-nums">{stats.partial}</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="grid h-6 w-6 place-items-center rounded-full bg-rose-50 text-rose-700">
                <AlertTriangle className="h-3 w-3" />
              </span>
              <span className="font-semibold">失败</span>
              <span className="ml-auto tabular-nums">{stats.failed}</span>
            </li>
          </ul>
        </article>
        <article className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">平均耗时</p>
          <p className="mt-2 text-2xl font-semibold tabular-nums">{(stats.avgLatency / 1000).toFixed(2)}s</p>
          <p className="mt-1 inline-flex items-center gap-1 text-[11px] text-amber-700">
            <ArrowUp className="h-3 w-3" />
            较上周上升 8.3%
          </p>
          <Sparkline data={[2.0, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.5, 2.7, 2.8, 2.9, 2.7]} stroke="#0ea5e9" />
        </article>
        <article className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">今日 Token</p>
          <p className="mt-2 text-2xl font-semibold tabular-nums">{stats.totalTokens.toLocaleString('zh-CN')}</p>
          <p className="mt-1 inline-flex items-center gap-1 text-[11px] text-emerald-600">
            <ArrowDown className="h-3 w-3" />
            较昨日下降 4.1%
          </p>
          <Sparkline data={[3.2, 3.0, 2.9, 3.1, 3.0, 2.8, 2.6, 2.7, 2.5, 2.4, 2.3, 2.2]} stroke="#0ea5e9" />
        </article>
      </div>
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-700 dark:text-sky-300">链路总览</p>
            <h3 className="mt-2 text-lg font-semibold">最近会话</h3>
            <p className="mt-1 text-xs text-[var(--text-muted)]">
              {visibleSessions.length} 个会话 · {incidents.filter((i) => !i.resolved).length} 个未解决事件
            </p>
          </div>
          <div className="relative w-full xl:max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
            <label className="sr-only" htmlFor="op-search">
              搜索会话
            </label>
            <input
              id="op-search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="搜索 session / 用户 / 智能体"
              className="h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-1)] pl-10 pr-3 text-sm outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--brand)]"
            />
          </div>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {visibleSessions.map((s) => (
            <SessionCard
              key={s.id}
              session={s}
              selected={selectedIds.includes(s.id)}
              onToggleSelect={onToggleSelect}
              onSelect={onSelect}
              onToggleStar={onToggleStar}
            />
          ))}
        </div>
      </div>
    </>
  );
}