/**
 * AdminOverview — 运营总览编排:Hero + 6 KPI + 趋势图 + 告警 + 服务 + Top 智能体。
 */
import { useMemo, useState } from 'react';
import { BellRing, Filter, Gauge } from 'lucide-react';
import { SideDrawer } from '@/components/feedback/SideDrawer';
import { TimeRangeDropdown } from '@/components/TimeRangeDropdown';
import {
  useOverviewSummary,
  useOverviewTrend,
} from './useOverview';
import type { OverviewAlert, Range } from './schema';
import { KpiTileCard } from './components/KpiTileCard';
import { TrendChart } from './components/TrendChart';
import { AlertsPanel, ServicesPanel, TopAgentsPanel } from './components/Panels';
import { AlertDetail } from './components/AlertDetail';
import { SEVERITY_BADGE } from './components/Primitives';

const RANGE_OPTIONS: { id: Range; label: string }[] = [
  { id: '1h', label: '1 小时' },
  { id: '6h', label: '6 小时' },
  { id: '24h', label: '24 小时' },
  { id: '7d', label: '最近 7 天' },
];

export default function OverviewPage() {
  const [range, setRange] = useState<Range>('24h');
  const [activeAlert, setActiveAlert] = useState<OverviewAlert | null>(null);

  const summaryQuery = useOverviewSummary();
  const trendQuery = useOverviewTrend(range);

  const summary = summaryQuery.data;
  const alerts = summary?.alerts ?? [];
  const kpiTiles = summary?.kpis ?? [];
  const services = summary?.services ?? [];
  const topAgents = summary?.topAgents ?? [];

  const eyebrow = activeAlert
    ? (() => {
        const badge = SEVERITY_BADGE[activeAlert.severity];
        return (
          <span className={`inline-flex items-center rounded-full px-2 py-1 text-[10px] font-semibold ${badge.className}`}>
            {badge.label} · {activeAlert.time}
          </span>
        );
      })()
    : null;

  return (
    <div className="mx-auto w-full max-w-[1440px] space-y-6 p-5 pb-16 sm:p-8 xl:px-10">
      <section className="relative z-20 rounded-[28px] border border-[var(--border)] bg-[var(--surface-1)] px-6 py-8 shadow-[var(--shadow-sm)] sm:px-8">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden rounded-[28px]">
          <div className="absolute right-0 top-0 h-full w-1/2 bg-[radial-gradient(circle_at_top_right,var(--brand-light),transparent_68%)]" />
        </div>
        <div className="relative flex flex-col justify-between gap-6 xl:flex-row xl:items-end">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--brand)]">ADMIN / 运营总览</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">看调用量、可用率和告警。</h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--text-muted)]">6 个核心指标 · 实时告警 · 服务健康与 Top 智能体。</p>
          </div>
          <TimeRangeDropdown value={range} onChange={setRange} options={RANGE_OPTIONS} />
        </div>
      </section>

      <section aria-label="核心指标" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        {summaryQuery.isLoading && kpiTiles.length === 0
          ? Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-[148px] animate-pulse rounded-2xl border border-[var(--border)] bg-[var(--surface-1)]" />
            ))
          : kpiTiles.map((tile) => <KpiTileCard key={tile.label} tile={tile} />)}
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
        <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-5 sm:p-7">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Gauge className="h-5 w-5 text-[var(--brand)]" />
                <h3 className="text-base font-semibold">调用量 · 可用率 · 错误率</h3>
              </div>
              <p className="mt-1 text-xs text-[var(--text-muted)]">悬停曲线查看任意时间点的三项指标 · {range} 数据</p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[var(--brand)]" />调用量</span>
              <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[var(--chart-success)]" />可用率</span>
              <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[var(--danger)]" />错误率</span>
              <button type="button" className="inline-flex items-center gap-1 rounded-lg border border-[var(--border)] px-2 py-1 font-semibold text-[var(--text-secondary)] hover:border-[var(--brand)] hover:text-[var(--brand)]">
                <Filter className="h-3.5 w-3.5" />筛选
              </button>
            </div>
          </div>
          <div className="mt-6">
            {trendQuery.data
              ? <TrendChart series={trendQuery.data} />
              : <div className="h-[260px] animate-pulse rounded-2xl bg-[var(--bg-elevated)]" />}
          </div>
        </section>

        <div>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-base font-semibold">实时告警与待处理事件</h3>
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-[var(--danger-bg)] text-[var(--danger)]">
              <BellRing className="h-4 w-4" />
            </span>
          </div>
          <AlertsPanel alerts={alerts} onSelect={setActiveAlert} />
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
        <ServicesPanel
          services={services}
          onViewAll={() =>
            setActiveAlert({
              id: 'svc',
              severity: 'info',
              title: '查看全部服务',
              time: '现在',
              affected: '全部 5 项',
              suggestion: '点击进入 渠道配置 查看完整健康度。',
            })
          }
        />
        <TopAgentsPanel topAgents={topAgents} />
      </div>

      <SideDrawer
        open={activeAlert != null}
        onClose={() => setActiveAlert(null)}
        ariaLabel={activeAlert?.title ?? '告警详情'}
        eyebrow={eyebrow}
      >
        {activeAlert && <AlertDetail alert={activeAlert} />}
      </SideDrawer>

      <p className="text-center text-xs text-[var(--text-muted)]">本页为前端演示数据，生产环境将接入实时指标流。</p>
    </div>
  );
}