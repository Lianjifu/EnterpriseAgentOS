/**
 * MetricsPage — 5-tab orchestrator + Hero + SideDrawer + 模态 + 批量工具栏 + 乐观更新。
 */
import { useEffect, useMemo, useState } from 'react';
import { BarChart3, Download, Hash, LineChart, Plus, RefreshCw, Settings2, Sparkles as SparklesIcon, Star } from 'lucide-react';
import { SideDrawer } from '@/components/feedback/SideDrawer';
import {
  useModelMetrics, useLatencyPoints, useCostBreakdown, useMetricsDashboards, useThresholdRules,
} from '@/api/admin/metrics';
import type {
  CostBreakdown, LatencyPoint, MetricsDashboard, MetricsTabId, ModelMetric, ThresholdRule,
} from '@/api/admin/metrics/schema';
import { TABS, DRAWER_NAV, TIME_RANGES } from './components/constants';
import { ModelDetailDrawer } from './components/ModelDetailDrawer';
import { CreateDashboardModal } from './components/CreateDashboardModal';
import { ExportMetricModal } from './components/ExportMetricModal';
import { BatchToolbar } from './components/BatchToolbar';
import { OverviewTab } from './components/tabs/OverviewTab';
import { AvailabilityTab } from './components/tabs/AvailabilityTab';
import { LatencyTab } from './components/tabs/LatencyTab';
import { TokenTab } from './components/tabs/TokenTab';
import { DashboardTab } from './components/tabs/DashboardTab';

const EMPTY_MODELS: ModelMetric[] = [];
const EMPTY_DASHBOARDS: MetricsDashboard[] = [];
const EMPTY_RULES: ThresholdRule[] = [];
const EMPTY_LATENCY: LatencyPoint[] = [];
const EMPTY_BREAKDOWN: CostBreakdown[] = [];

const TAB_ICON: Record<MetricsTabId, typeof BarChart3> = {
  overview: BarChart3,
  availability: SparklesIcon,
  latency: LineChart,
  token: Hash,
  dashboard: Star,
};

export default function MetricsPage() {
  const [tab, setTab] = useState<MetricsTabId>('overview');
  const [range, setRange] = useState<typeof TIME_RANGES[number]['id']>('24h');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [pickedDashboards, setPickedDashboards] = useState<Set<string>>(new Set());
  const [notice, setNotice] = useState<string | null>(null);

  const models = useModelMetrics();
  const latency = useLatencyPoints();
  const breakdown = useCostBreakdown();
  const dashboards = useMetricsDashboards();
  const rules = useThresholdRules();

  const remoteModels = models.data ?? EMPTY_MODELS;
  const remoteDashboards = useMemo(() => dashboards.data ?? EMPTY_DASHBOARDS, [dashboards.data]);
  const remoteRules = useMemo(() => rules.data ?? EMPTY_RULES, [rules.data]);
  const remoteLatency = latency.data ?? EMPTY_LATENCY;
  const remoteBreakdown = breakdown.data ?? EMPTY_BREAKDOWN;

  const [localDashboards, setLocalDashboards] = useState(remoteDashboards);
  const [localRules, setLocalRules] = useState(remoteRules);
  useEffect(() => { setLocalDashboards(remoteDashboards); }, [remoteDashboards]);
  useEffect(() => { setLocalRules(remoteRules); }, [remoteRules]);

  const toggleStar = (id: string) => {
    setLocalDashboards((prev) => prev.map((d) => (d.id === id ? { ...d, starred: !d.starred } : d)));
  };
  const toggleRule = (id: string) => {
    setLocalRules((prev) => prev.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r)));
  };
  const togglePick = (id: string) => {
    setPickedDashboards((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const flash = (text: string) => {
    setNotice(text);
    window.setTimeout(() => setNotice(null), 2400);
  };

  const refreshAll = () => {
    models.refetch();
    latency.refetch();
    breakdown.refetch();
    dashboards.refetch();
    rules.refetch();
    flash('已刷新数据');
  };

  const selected = remoteModels.find((m) => m.id === selectedId) ?? null;

  return (
    <div className="mx-auto w-full max-w-[1440px] space-y-6 p-5 pb-16 sm:p-8 xl:px-10">
      <section className="relative overflow-hidden rounded-[28px] border border-[var(--border)] bg-[var(--surface-1)] px-6 py-8 shadow-[var(--shadow-sm)] sm:px-8">
        <div aria-hidden="true" className="pointer-events-none absolute right-0 top-0 h-full w-1/2 bg-[radial-gradient(circle_at_top_right,var(--brand-light),transparent_68%)]" />
        <div className="relative flex flex-col justify-between gap-6 xl:flex-row xl:items-end">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--brand)]">ADMIN / <span>运行指标</span></p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">把模型健康与成本一眼说清楚。</h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--text-muted)]">{remoteModels.length} 个模型 · {remoteDashboards.length} 个看板 · {localRules.filter((r) => r.enabled).length} 条激活阈值 · 覆盖可用率、延迟、Token 成本、告警。</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-1">
              {TIME_RANGES.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setRange(r.id)}
                  aria-pressed={range === r.id}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${range === r.id ? 'bg-[var(--brand-light)] text-[var(--brand)]' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'}`}
                >
                  {r.label}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={refreshAll}
              className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] px-3 py-2 text-xs font-semibold text-[var(--text-secondary)] hover:border-[var(--brand)] hover:text-[var(--brand)]"
            >
              <RefreshCw className="h-4 w-4" />
              刷新
            </button>
            <button
              type="button"
              onClick={() => setExportOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] px-3 py-2 text-xs font-semibold text-[var(--text-secondary)] hover:border-[var(--brand)] hover:text-[var(--brand)]"
            >
              <Download className="h-4 w-4" />
              导出
            </button>
            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-[var(--brand)] px-4 py-2 text-xs font-semibold text-white hover:bg-[var(--brand-hover)]"
            >
              <Plus className="h-4 w-4" />
              新建看板
            </button>
          </div>
        </div>
      </section>

      <nav className="flex flex-wrap items-center gap-1 border-b border-[var(--border)]">
        {TABS.map((t) => {
          const Icon = TAB_ICON[t.id];
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              aria-pressed={tab === t.id}
              className={`inline-flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-xs font-semibold transition ${tab === t.id ? 'border-[var(--brand)] text-[var(--brand)]' : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--brand)]'}`}
            >
              <Icon className="h-4 w-4" />
              {t.label}
            </button>
          );
        })}
        <span className="ml-auto pb-2 text-[11px] text-[var(--text-muted)]">{TIME_RANGES.find((r) => r.id === range)?.label} 窗口</span>
      </nav>

      {notice && (
        <div className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          <RefreshCw className="h-4 w-4" />
          {notice}
        </div>
      )}

      <BatchToolbar
        count={pickedDashboards.size}
        onEnable={() => { flash(`已启用 ${pickedDashboards.size} 个看板`); setPickedDashboards(new Set()); }}
        onDisable={() => { flash(`已停用 ${pickedDashboards.size} 个看板`); setPickedDashboards(new Set()); }}
        onDelete={() => { flash(`已删除 ${pickedDashboards.size} 个看板`); setPickedDashboards(new Set()); }}
      />

      {tab === 'overview' && (
        <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-5 sm:p-7">
          <OverviewTab models={remoteModels} breakdown={remoteBreakdown} onSelect={setSelectedId} />
        </section>
      )}
      {tab === 'availability' && (
        <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-5 sm:p-7">
          <AvailabilityTab models={remoteModels} onSelect={setSelectedId} />
        </section>
      )}
      {tab === 'latency' && (
        <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-5 sm:p-7">
          <LatencyTab latency={remoteLatency} models={remoteModels} onSelect={setSelectedId} />
        </section>
      )}
      {tab === 'token' && (
        <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-5 sm:p-7">
          <TokenTab models={remoteModels} breakdown={remoteBreakdown} />
        </section>
      )}
      {tab === 'dashboard' && (
        <section className="space-y-6">
          <DashboardTab
            dashboards={localDashboards}
            rules={localRules}
            pickedIds={pickedDashboards}
            onTogglePick={togglePick}
            onToggleStar={toggleStar}
            onCreate={() => setCreateOpen(true)}
            onToggleRule={toggleRule}
          />
        </section>
      )}

      {selected && (
        <ModelDetailDrawer
          model={selected}
          latency={remoteLatency}
          breakdown={remoteBreakdown}
          rules={localRules}
          onClose={() => setSelectedId(null)}
        />
      )}
      <CreateDashboardModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSubmit={(d) => {
          setLocalDashboards((prev) => [...prev, { id: 'db-' + Math.random().toString(36).slice(2, 8), name: d.name, range: d.range, panels: 0, owner: '我', starred: false }]);
          setCreateOpen(false);
          flash(`看板「${d.name}」已创建`);
        }}
      />
      <ExportMetricModal
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        onExport={(sections) => { flash(`已导出 ${sections.length} 个区段`); setExportOpen(false); }}
      />

      <p className="text-center text-xs text-[var(--text-muted)]">本页为前端演示数据,生产环境将接入 EOS 指标中台。</p>
    </div>
  );
}