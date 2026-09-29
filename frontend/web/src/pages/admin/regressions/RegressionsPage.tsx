/**
 * AdminRegressions — orchestrator。
 * 追踪 / 告警 / 时间线 走 useApiQuery 拉取;写操作(CRUD/批量/导入导出/告警)走本地乐观更新。
 */
import { Download, GitBranch, Plus, Upload } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { NoticeBanner } from '@/components/feedback/NoticeBanner';
import { useRegressionAlerts, useRegressionTimeline, useRegressionTracks } from '@/api/admin/regressions';
import type { AlertRule, ExchangeFormat, RegressionRisk, RegressionTrack, TabId } from '@/api/admin/regressions/schema';
import { TABS, uid } from './components/constants';
import { AlertEditModal, DeleteTrackModal, ExportTrackModal, ImportTrackModal } from './components/Modals';
import { AlertTab, BaselineTab, OverviewTab, RiskTab, TimelineTab } from './components/tabs/Tabs';

export default function RegressionsPage() {
  const navigate = useNavigate();
  const remoteTracks = useRegressionTracks();
  const remoteAlerts = useRegressionAlerts();
  const remoteTimeline = useRegressionTimeline();
  const tracksData = remoteTracks.data ?? [];
  const alertsData = remoteAlerts.data ?? [];
  const timelineData = remoteTimeline.data ?? [];

  const [tracks, setTracks] = useState<RegressionTrack[]>([]);
  const [alerts, setAlerts] = useState<AlertRule[]>([]);
  const [tab, setTab] = useState<TabId>('overview');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | RegressionTrack['status']>('all');
  const [riskFilter, setRiskFilter] = useState<'all' | RegressionRisk>('all');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<RegressionTrack | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [editingAlert, setEditingAlert] = useState<AlertRule | null>(null);
  const [notice, setNotice] = useState('');

  useEffect(() => { setTracks(tracksData); }, [tracksData]);
  useEffect(() => { setAlerts(alertsData); }, [alertsData]);

  const counts = useMemo(() => {
    const total = tracks.length;
    const regressed = tracks.filter((t) => t.status === 'regressed').length;
    const investigating = tracks.filter((t) => t.status === 'investigating').length;
    return { total, regressed, investigating };
  }, [tracks]);

  const tabCounts = useMemo(() => ({
    overview: tracks.length,
    baseline: tracks.length,
    risk: tracks.filter((t) => t.risk === 'high' || t.risk === 'critical').length,
    timeline: timelineData.length,
    alert: alerts.length,
  }), [tracks, timelineData.length, alerts.length]);

  const visibleTracks = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tracks.filter((t) =>
      (statusFilter === 'all' || t.status === statusFilter) &&
      (riskFilter === 'all' || t.risk === riskFilter) &&
      (q.length === 0 || `${t.name} ${t.agent} ${t.owner} ${t.tags.join(' ')}`.toLowerCase().includes(q)),
    );
  }, [tracks, statusFilter, riskFilter, search]);

  const toggleSelect = (id: string) => setSelectedIds((current) => current.includes(id) ? current.filter((x) => x !== id) : [...current, id]);
  const toggleStar = (id: string) => setTracks((current) => current.map((t) => t.id === id ? { ...t, starred: !t.starred } : t));

  const updateTrack = (id: string, patch: Partial<RegressionTrack>) => {
    setTracks((current) => current.map((t) => t.id === id ? { ...t, ...patch } : t));
  };

  const handleDuplicate = (track: RegressionTrack) => {
    const copy: RegressionTrack = { ...track, id: uid('track'), name: `${track.name} 副本`, starred: false, lastCheckedAt: '未运行', history: [], casesList: [] };
    setTracks((current) => [copy, ...current]);
    setNotice(`已复制追踪:${copy.name}`);
  };

  const handleDelete = (track: RegressionTrack) => {
    setTracks((current) => current.filter((t) => t.id !== track.id));
    setNotice(`已删除「${track.name}」。`);
    setDeleteTarget(null);
  };

  const handleInvestigate = (track: RegressionTrack) => {
    setTracks((current) => current.map((t) => t.id === track.id ? { ...t, status: 'investigating' } : t));
    setNotice(`已标记排查中:${track.name}`);
  };

  const handleResolve = (track: RegressionTrack) => {
    setTracks((current) => current.map((t) => t.id === track.id ? { ...t, status: 'stable' } : t));
    setNotice(`已标记已解决:${track.name}`);
  };

  const handleBatchInvestigate = () => {
    setTracks((current) => current.map((t) => selectedIds.includes(t.id) ? { ...t, status: 'investigating' } : t));
    setNotice(`已批量标记排查中 ${selectedIds.length} 条。`);
    setSelectedIds([]);
  };

  const handleBatchResolve = () => {
    setTracks((current) => current.map((t) => selectedIds.includes(t.id) ? { ...t, status: 'stable' } : t));
    setNotice(`已批量标记已解决 ${selectedIds.length} 条。`);
    setSelectedIds([]);
  };

  const handleBatchDelete = () => {
    setTracks((current) => current.filter((t) => !selectedIds.includes(t.id)));
    setNotice(`已批量删除 ${selectedIds.length} 条。`);
    setSelectedIds([]);
  };

  const handleCreate = (track: RegressionTrack) => {
    setTracks((current) => [track, ...current]);
    setNotice(`已创建回归追踪「${track.name}」。`);
    setTab('overview');
  };

  const handleImport = (count: number) => {
    for (let i = 0; i < count; i += 1) {
      const newTrack: RegressionTrack = {
        id: uid('track'),
        name: `导入追踪 ${i + 1}`,
        agent: '待指定', owner: '张敏',
        status: 'stable', risk: 'low',
        baselineVersion: 'v1.0', currentVersion: 'v1.0',
        passRateDelta: 0, latencyDelta: 0, costDelta: 0, scoreDelta: 0,
        baseline: { passRate: 95, avgScore: 4.4, latencyMs: 1200, cost: 10 },
        current: { passRate: 95, avgScore: 4.4, latencyMs: 1200, cost: 10 },
        passRateTrend: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        latencyTrend: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        costTrend: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        lastCheckedAt: '未运行', cases: 0, starred: false,
        schedule: '每次发布后', tags: [], notes: '从外部文件导入',
        history: [], casesList: [],
      };
      setTracks((current) => [newTrack, ...current]);
    }
    setNotice(`已导入 ${count} 条追踪。`);
  };

  const handleExport = (format: ExchangeFormat) => {
    const list = selectedIds.length > 0 ? tracks.filter((t) => selectedIds.includes(t.id)) : tracks;
    const payload = list.map((t) => ({ id: t.id, name: t.name, agent: t.agent, baselineVersion: t.baselineVersion, currentVersion: t.currentVersion, status: t.status }));
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    if (format === 'json') {
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      downloadBlob(blob, 'regression-tracks.json');
    } else {
      const yaml = payload.map((p) => `- id: "${p.id}"\n  name: "${p.name}"\n  agent: "${p.agent}"\n  baseline: "${p.baselineVersion}"\n  current: "${p.currentVersion}"`).join('\n');
      const blob = new Blob([`${yaml}\n`], { type: 'text/yaml' });
      downloadBlob(blob, 'regression-tracks.yaml');
    }
    setNotice(`已导出 ${list.length} 条追踪为 ${format.toUpperCase()} 文件。`);
  };

  const handleAlertSave = (rule: AlertRule) => {
    setAlerts((current) => current.map((a) => a.id === rule.id ? { ...rule } : a));
    setNotice(`已保存告警规则「${rule.name}」。`);
    setEditingAlert(null);
  };

  const handleAlertToggle = (id: string) => {
    const target = alerts.find((x) => x.id === id);
    setAlerts((current) => current.map((a) => a.id === id ? { ...a, enabled: !a.enabled } : a));
    if (target) setNotice(`已${target.enabled ? '停用' : '启用'}规则「${target.name}」`);
  };

  const handleAlertDelete = (id: string) => {
    const target = alerts.find((x) => x.id === id);
    setAlerts((current) => current.filter((x) => x.id !== id));
    if (target) setNotice(`已删除规则「${target.name}」`);
  };

  return (
    <div className="regressions-page mx-auto w-full max-w-[1440px] space-y-6 p-5 pb-16 sm:p-8 xl:px-10">
      <section className="relative overflow-hidden rounded-[28px] border border-[var(--border)] bg-[var(--surface-1)] px-6 py-8 shadow-[var(--shadow-sm)] sm:px-8">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden rounded-[28px]">
          <div className="absolute right-0 top-0 h-full w-1/2 bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,0.10),transparent_68%)]" />
        </div>
        <div className="relative flex flex-col justify-between gap-6 xl:flex-row xl:items-end">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-indigo-700 dark:text-indigo-300">ADMIN / 回归追踪</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">把版本变更变成可观测的回归。</h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--text-muted)]">每次发布后自动对比基线,在退化和异常出现的第一时间发现并响应。</p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setImportOpen(true)} className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] px-3 text-xs font-semibold text-[var(--text-secondary)] transition hover:border-[var(--brand)] hover:text-[var(--brand)]">
                <Upload className="h-3.5 w-3.5" />导入
              </button>
              <button type="button" onClick={() => setExportOpen(true)} className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] px-3 text-xs font-semibold text-[var(--text-secondary)] transition hover:border-[var(--brand)] hover:text-[var(--brand)]">
                <Download className="h-3.5 w-3.5" />导出
              </button>
              <button type="button" onClick={() => navigate('/admin/regressions/new')} className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-[var(--brand)] px-4 text-xs font-semibold text-white transition hover:bg-[var(--brand-hover)]">
                <Plus className="h-4 w-4" />新建追踪
              </button>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-[var(--text-muted)]">
              <GitBranch className="h-3 w-3" />{tracks.length} 个追踪 · {counts.regressed} 已退化 · {counts.investigating} 排查中
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
        {TABS.map((t) => {
          const count = tabCounts[t.id];
          return (
            <button key={t.id} type="button" onClick={() => setTab(t.id)} aria-pressed={tab === t.id} className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-4 py-2 text-xs font-semibold transition ${tab === t.id ? 'border-[var(--brand)] bg-[var(--brand-light)] text-[var(--brand)]' : 'border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--brand)] hover:text-[var(--brand)]'}`}>
              {t.label}
              <span className="rounded bg-[var(--bg-elevated)] px-1.5 py-0.5 text-[10px] tabular-nums">{count}</span>
            </button>
          );
        })}
      </section>

      {tab === 'overview' && (
        <OverviewTab
          visibleTracks={visibleTracks}
          tracks={tracks}
          selectedIds={selectedIds}
          setSelectedIds={setSelectedIds}
          openMenuId={openMenuId}
          setOpenMenuId={setOpenMenuId}
          search={search}
          setSearch={setSearch}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          riskFilter={riskFilter}
          setRiskFilter={setRiskFilter}
          onSelect={(t) => navigate('/admin/regressions/' + t.id)}
          onToggleStar={toggleStar}
          onToggleSelect={toggleSelect}
          onRun={() => undefined}
          onDuplicate={handleDuplicate}
          onRequestDelete={setDeleteTarget}
          onBatchInvestigate={handleBatchInvestigate}
          onBatchResolve={handleBatchResolve}
          onBatchDelete={handleBatchDelete}
        />
      )}
      {tab === 'baseline' && <BaselineTab tracks={tracks} />}
      {tab === 'risk' && <RiskTab tracks={tracks} />}
      {tab === 'timeline' && <TimelineTab events={timelineData} />}
      {tab === 'alert' && (
        <AlertTab
          alerts={alerts}
          onToggle={handleAlertToggle}
          onDelete={handleAlertDelete}
          onEdit={setEditingAlert}
        />
      )}

      <DeleteTrackModal open={deleteTarget !== null} onClose={() => setDeleteTarget(null)} onConfirm={() => deleteTarget && handleDelete(deleteTarget)} track={deleteTarget} />
      <ImportTrackModal open={importOpen} onClose={() => setImportOpen(false)} onImport={handleImport} />
      <ExportTrackModal open={exportOpen} onClose={() => setExportOpen(false)} onExport={handleExport} total={tracks.length} selectedCount={selectedIds.length} />
      <AlertEditModal open={editingAlert !== null} onClose={() => setEditingAlert(null)} onSave={handleAlertSave} rule={editingAlert} />
    </div>
  );
}

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