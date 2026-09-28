/**
 * AdminOperations 编排 — 5 tab + Hero + NoticeBanner + 3 modal + 批量工具栏 + 详情抽屉。
 * 数据来自 useOperations hooks;本地 state 处理收藏/选中/导出/批量等乐观更新。
 */
import { useEffect, useMemo, useState } from 'react';
import { Activity, FileText, Filter, RefreshCw } from 'lucide-react';
import { NoticeBanner } from '@/components/feedback/NoticeBanner';
import {
  useIncidents,
  useKindStats,
  useSessions,
  useSpans,
} from '@/api/admin/operations';
import type { ExchangeFormat, Incident, Session } from '@/api/admin/operations/schema';
import { TABS } from './components/constants';
import { SessionDetailDrawer } from './components/SessionDetailDrawer';
import { FilterModal, type FilterSelection } from './components/FilterModal';
import { ExportTraceModal } from './components/ExportModal';
import { OverviewTab } from './components/tabs/OverviewTab';
import { SessionTab } from './components/tabs/SessionTab';
import { TraceTab } from './components/tabs/TraceTab';
import { KindTab } from './components/tabs/KindTab';
import { IncidentTab } from './components/tabs/IncidentTab';
import type { TabId } from '@/api/admin/operations/schema';

function downloadBlob(blob: Blob, filename: string) {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function OperationsPage() {
  const sessionsQuery = useSessions();
  const spansQuery = useSpans();
  const incidentsQuery = useIncidents();
  const kindStatsQuery = useKindStats();

  const baseSessions = sessionsQuery.data ?? [];
  const baseSpans = spansQuery.data ?? [];
  const baseIncidents = incidentsQuery.data ?? [];
  const baseKindStats = kindStatsQuery.data ?? [];

  const [sessions, setSessions] = useState<Session[]>(baseSessions);
  const [incidents, setIncidents] = useState<Incident[]>(baseIncidents);
  const [tab, setTab] = useState<TabId>('overview');
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [detail, setDetail] = useState<Session | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [notice, setNotice] = useState('');

  // Sync query cache → local state when data first arrives.
  useEffect(() => {
    if (sessions.length === 0 && baseSessions.length > 0) setSessions(baseSessions);
  }, [baseSessions, sessions.length]);
  useEffect(() => {
    if (incidents.length === 0 && baseIncidents.length > 0) setIncidents(baseIncidents);
  }, [baseIncidents, incidents.length]);

  const tabCounts = useMemo(
    () => ({
      overview: sessions.length,
      session: sessions.length,
      trace: 1,
      kind: baseKindStats.reduce((s, k) => s + k.count, 0),
      incident: incidents.length,
    }),
    [sessions.length, incidents.length, baseKindStats],
  );

  const stats = useMemo(() => {
    const total = sessions.length;
    const success = sessions.filter((s) => s.status === 'success').length;
    const failed = sessions.filter((s) => s.status === 'failed').length;
    const partial = sessions.filter((s) => s.status === 'partial').length;
    const errorRate = Math.round(((failed + partial) / Math.max(total, 1)) * 1000) / 10;
    return { total, errorRate };
  }, [sessions]);

  const toggleSelect = (id: string) =>
    setSelectedIds((current) => (current.includes(id) ? current.filter((x) => x !== id) : [...current, id]));

  const toggleStar = (id: string) =>
    setSessions((current) => current.map((s) => (s.id === id ? { ...s, starred: !s.starred } : s)));

  const handleBatchExport = () => setNotice(`已批量导出 ${selectedIds.length} 条会话。`);

  const handleBatchResolve = () => {
    setIncidents((current) =>
      current.map((i) => (selectedIds.includes(i.sessionId) ? { ...i, resolved: true } : i)),
    );
    setNotice(`已批量标记 ${selectedIds.length} 个事件为已解决。`);
    setSelectedIds([]);
  };

  const handleExport = (format: ExchangeFormat) => {
    const list = selectedIds.length > 0 ? sessions.filter((s) => selectedIds.includes(s.id)) : sessions;
    const payload = list.map((s) => ({ id: s.id, user: s.user, agent: s.agentName, status: s.status, durationMs: s.totalDurationMs }));
    if (format === 'json') {
      downloadBlob(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }), 'traces.json');
    } else {
      const yaml = payload.map((s) => `- id: "${s.id}"\n  user: "${s.user}"\n  agent: "${s.agent}"\n  status: "${s.status}"`).join('\n');
      downloadBlob(new Blob([`${yaml}\n`], { type: 'text/yaml' }), 'traces.yaml');
    }
    setNotice(`已导出 ${list.length} 条会话为 ${format.toUpperCase()} 文件。`);
  };

  const handleResolve = (id: string) =>
    setIncidents((current) => current.map((i) => (i.id === id ? { ...i, resolved: !i.resolved } : i)));

  const handleFilter = (f: FilterSelection) =>
    setNotice(`已应用筛选 · 状态 ${f.status} · 智能体 ${f.agent} · 级别 ${f.severity}`);

  return (
    <div className="operations-page mx-auto w-full max-w-[1440px] space-y-6 p-5 pb-16 sm:p-8 xl:px-10">
      <section className="relative overflow-hidden rounded-[28px] border border-[var(--border)] bg-[var(--surface-1)] px-6 py-8 shadow-[var(--shadow-sm)] sm:px-8">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden rounded-[28px]">
          <div className="absolute right-0 top-0 h-full w-1/2 bg-[radial-gradient(circle_at_top_right,rgba(14,165,233,0.10),transparent_68%)]" />
        </div>
        <div className="relative flex flex-col justify-between gap-6 xl:flex-row xl:items-end">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-sky-700 dark:text-sky-300">
              ADMIN / 调用链路
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
              把每一次会话还原成可追溯的证据链。
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--text-muted)]">
              还原智能体 / 工具 / MCP / 记忆 / 检索的完整调用链与上下文,快速定位异常与性能瓶颈。
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setFilterOpen(true)}
                className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] px-3 text-xs font-semibold text-[var(--text-secondary)] transition hover:border-[var(--brand)] hover:text-[var(--brand)]"
              >
                <Filter className="h-3.5 w-3.5" />
                筛选
              </button>
              <button
                type="button"
                onClick={() => setExportOpen(true)}
                className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] px-3 text-xs font-semibold text-[var(--text-secondary)] transition hover:border-[var(--brand)] hover:text-[var(--brand)]"
              >
                <FileText className="h-3.5 w-3.5" />
                导出
              </button>
              <button
                type="button"
                onClick={() => {
                  sessionsQuery.refetch();
                  spansQuery.refetch();
                  incidentsQuery.refetch();
                  kindStatsQuery.refetch();
                  setNotice('已开启实时刷新');
                }}
                className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-[var(--brand)] px-4 text-xs font-semibold text-white transition hover:bg-[var(--brand-hover)]"
              >
                <RefreshCw className="h-4 w-4" />
                实时刷新
              </button>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-[var(--text-muted)]">
              <Activity className="h-3 w-3" />
              今日会话 {stats.total} · 异常率 {stats.errorRate}%
            </div>
          </div>
        </div>
      </section>

      {notice && (
        <NoticeBanner tone="violet" onClose={() => setNotice('')}>
          {notice}
        </NoticeBanner>
      )}

      <section aria-label="子模块导航" className="flex flex-wrap items-center gap-2 overflow-x-auto pb-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            aria-pressed={tab === t.id}
            className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-4 py-2 text-xs font-semibold transition ${tab === t.id ? 'border-[var(--brand)] bg-[var(--brand-light)] text-[var(--brand)]' : 'border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--brand)] hover:text-[var(--brand)]'}`}
          >
            {t.label}
            <span className="rounded bg-[var(--bg-elevated)] px-1.5 py-0.5 text-[10px] tabular-nums">{tabCounts[t.id]}</span>
          </button>
        ))}
      </section>

      {tab === 'overview' && (
        <OverviewTab
          sessions={sessions}
          incidents={incidents}
          selectedIds={selectedIds}
          search={search}
          setSearch={setSearch}
          onToggleSelect={toggleSelect}
          onToggleStar={toggleStar}
          onSelect={setDetail}
          onBatchExport={handleBatchExport}
          onBatchResolve={handleBatchResolve}
          onClear={() => setSelectedIds([])}
        />
      )}

      {tab === 'session' && (
        <SessionTab
          sessions={sessions}
          selectedIds={selectedIds}
          onToggleSelect={toggleSelect}
          onToggleStar={toggleStar}
          onSelect={setDetail}
        />
      )}

      {tab === 'trace' && <TraceTab spans={baseSpans} />}

      {tab === 'kind' && (
        <KindTab
          kindStats={baseKindStats}
          total={baseKindStats.reduce((s, k) => s + k.count, 0)}
        />
      )}

      {tab === 'incident' && <IncidentTab incidents={incidents} onToggleResolve={handleResolve} />}

      <SessionDetailDrawer session={detail} spans={baseSpans} onClose={() => setDetail(null)} />
      <FilterModal open={filterOpen} onClose={() => setFilterOpen(false)} onApply={handleFilter} />
      <ExportTraceModal
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        onExport={handleExport}
        total={sessions.length}
        selectedCount={selectedIds.length}
      />
    </div>
  );
}