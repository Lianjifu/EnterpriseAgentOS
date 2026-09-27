import { Activity, AlertTriangle, ArrowDownRight, ArrowUpRight, BellRing, Brain, ChevronRight, Filter, Gauge, RefreshCw, ShieldCheck, Timer } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SideDrawer } from '@/components/feedback/SideDrawer';
import { useAuthStore } from '@/entities/auth';

type DeltaTone = 'up' | 'down' | 'flat';
type Severity = 'high' | 'medium' | 'low' | 'info';

const RANGES = ['1h', '6h', '24h', '7d'] as const;
type Range = typeof RANGES[number];

const kpis = [
  { label: '今日调用', value: '128,432', delta: '+12.4%', deltaTone: 'up' as DeltaTone, icon: Activity, tone: 'brand' as const, href: '/admin/metrics', sparkline: [62, 70, 55, 80, 72, 90, 85, 95, 100, 88, 92, 105] },
  { label: '可用率', value: '99.94%', delta: '-0.02%', deltaTone: 'flat' as DeltaTone, icon: ShieldCheck, tone: 'success' as const, href: '/admin/metrics', sparkline: [99.92, 99.93, 99.91, 99.94, 99.95, 99.93, 99.94, 99.95, 99.92, 99.94, 99.95, 99.94] },
  { label: 'P95 延迟', value: '1.82 s', delta: '-6.1%', deltaTone: 'down' as DeltaTone, icon: Timer, tone: 'info' as const, href: '/admin/metrics', sparkline: [2.4, 2.2, 2.1, 1.9, 2.0, 1.8, 1.7, 1.9, 2.0, 1.85, 1.82, 1.8] },
  { label: '错误率', value: '0.42%', delta: '+0.08%', deltaTone: 'up' as DeltaTone, icon: AlertTriangle, tone: 'danger' as const, href: '/admin/alerts', sparkline: [0.3, 0.32, 0.28, 0.35, 0.4, 0.38, 0.36, 0.42, 0.45, 0.4, 0.42, 0.42] },
  { label: '活跃智能体', value: '87 / 142', delta: '+5 个', deltaTone: 'up' as DeltaTone, icon: Brain, tone: 'purple' as const, href: '/admin/agents', sparkline: [70, 72, 75, 78, 80, 82, 84, 85, 86, 87, 87, 87] },
  { label: '告警事件', value: '3 待处理', delta: '+1 高优', deltaTone: 'up' as DeltaTone, icon: BellRing, tone: 'warn' as const, href: '/admin/alerts', sparkline: [1, 1, 0, 2, 2, 1, 1, 2, 3, 3, 3, 3] },
];

const trendByRange: Record<Range, { hours: string[]; calls: number[]; success: number[]; errors: number[] }> = {
  '1h': {
    hours: ['-60', '-50', '-40', '-30', '-20', '-10', '00'],
    calls: [8200, 9100, 8500, 9800, 9300, 9600, 9100],
    success: [99.96, 99.95, 99.94, 99.93, 99.95, 99.94, 99.94],
    errors: [0.30, 0.32, 0.28, 0.35, 0.40, 0.38, 0.42],
  },
  '6h': {
    hours: ['-6h', '-5h', '-4h', '-3h', '-2h', '-1h', '00'],
    calls: [48000, 52000, 58000, 54000, 61000, 59000, 56000],
    success: [99.95, 99.96, 99.93, 99.94, 99.92, 99.94, 99.94],
    errors: [0.30, 0.32, 0.34, 0.38, 0.42, 0.40, 0.42],
  },
  '24h': {
    hours: ['00', '02', '04', '06', '08', '10', '12', '14', '16', '18', '20', '22'],
    calls: [3200, 2800, 3100, 5400, 9200, 12400, 14800, 13200, 11900, 10500, 8800, 6400],
    success: [99.97, 99.96, 99.95, 99.94, 99.93, 99.94, 99.92, 99.93, 99.94, 99.95, 99.94, 99.94],
    errors: [0.30, 0.32, 0.34, 0.36, 0.38, 0.40, 0.42, 0.41, 0.40, 0.38, 0.40, 0.42],
  },
  '7d': {
    hours: ['周一', '周二', '周三', '周四', '周五', '周六', '周日'],
    calls: [98000, 112000, 124000, 118000, 132000, 76000, 64000],
    success: [99.94, 99.93, 99.92, 99.94, 99.95, 99.96, 99.96],
    errors: [0.42, 0.45, 0.48, 0.44, 0.40, 0.36, 0.34],
  },
};

const alerts: Array<{ id: string; severity: Severity; title: string; time: string; affected: string; suggestion: string }> = [
  { id: 'a1', severity: 'high', title: '模型 eos-gpt-4o 错误率突增', time: '2 分钟前', affected: '客户沟通助手 · 销售支持', suggestion: '建议临时切换到 eos-deepseek-v3 并下发限流保护。' },
  { id: 'a2', severity: 'medium', title: '工具「企查查」连续 3 次超时', time: '8 分钟前', affected: '数据洞察助手', suggestion: '已自动重试 2 次，建议人工介入确认供应商限流。' },
  { id: 'a3', severity: 'low', title: '知识库「产品手册 v3」需要重建索引', time: '1 小时前', affected: '全平台', suggestion: '预计重建耗时 12 分钟，可在低峰期执行。' },
  { id: 'a4', severity: 'info', title: '3 个智能体版本待审核', time: '2 小时前', affected: '智能体管理', suggestion: '运营总览待办 → 智能体管理 → 待审核。' },
  { id: 'a5', severity: 'low', title: '审计日志归档已完成', time: '今天 03:00', affected: '平台', suggestion: '归档后可清理 30 天前的明细日志。' },
];

const services: Array<{ name: string; status: 'ok' | 'degraded' | 'down'; latency: string; detail: string }> = [
  { name: '模型服务', status: 'ok', latency: '42 ms', detail: '10 个模型 · 平均可用率 99.95%' },
  { name: '知识检索', status: 'ok', latency: '87 ms', detail: '32 个索引 · 平均召回 0.91' },
  { name: '工具网关', status: 'ok', latency: '23 ms', detail: '128 个工具在线' },
  { name: '模型降级池', status: 'degraded', latency: '—', detail: '1 个模型触发降级 · eos-gpt-4o 切到 eos-deepseek-v3' },
  { name: '审计服务', status: 'ok', latency: '—', detail: '实时落库 · 队列 12 / 10000' },
];

const topAgents: Array<{ name: string; calls: string; share: number; tone: 'brand' | 'success' | 'info' | 'purple' | 'warn' }> = [
  { name: '客户沟通助手', calls: '18.2k', share: 0.42, tone: 'brand' },
  { name: '销售支持', calls: '14.7k', share: 0.34, tone: 'success' },
  { name: '数据洞察助手', calls: '9.8k', share: 0.23, tone: 'info' },
  { name: '财务问答', calls: '6.1k', share: 0.14, tone: 'purple' },
  { name: '流程编排', calls: '5.4k', share: 0.12, tone: 'warn' },
];

const toneClass: Record<'brand' | 'info' | 'success' | 'warn' | 'danger' | 'purple', string> = {
  brand: 'bg-[var(--brand-light)] text-[var(--brand)]',
  info: 'bg-sky-50 text-sky-600 dark:bg-sky-500/15 dark:text-sky-300',
  success: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300',
  warn: 'bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300',
  danger: 'bg-rose-50 text-rose-600 dark:bg-rose-500/15 dark:text-rose-300',
  purple: 'bg-violet-50 text-violet-600 dark:bg-violet-500/15 dark:text-violet-300',
};

const barClass: Record<'brand' | 'success' | 'info' | 'purple' | 'warn', string> = {
  brand: 'bg-[var(--brand)]',
  success: 'bg-emerald-500',
  info: 'bg-sky-500',
  purple: 'bg-violet-500',
  warn: 'bg-amber-500',
};

const severityBadge: Record<Severity, { label: string; className: string }> = {
  high: { label: '高', className: 'bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300' },
  medium: { label: '中', className: 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300' },
  low: { label: '低', className: 'bg-sky-50 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300' },
  info: { label: '提示', className: 'bg-[var(--bg-elevated)] text-[var(--text-secondary)]' },
};

function Sparkline({ data, stroke }: { data: number[]; stroke: string }) {
  const width = 96;
  const height = 28;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = Math.max(max - min, 0.01);
  const x = (index: number) => (index * width) / Math.max(data.length - 1, 1);
  const y = (value: number) => height - ((value - min) / range) * height;
  const line = data.map((value, index) => `${index === 0 ? 'M' : 'L'} ${x(index)} ${y(value)}`).join(' ');
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-7 w-24" preserveAspectRatio="none" aria-hidden="true">
      <path d={line} fill="none" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function KpiTile({ tile }: { tile: (typeof kpis)[number] }) {
  const navigate = useNavigate();
  const Icon = tile.icon;
  const deltaClass = tile.deltaTone === 'up' ? 'text-emerald-600 dark:text-emerald-300' : tile.deltaTone === 'down' ? 'text-rose-600 dark:text-rose-300' : 'text-[var(--text-muted)]';
  const DeltaIcon = tile.deltaTone === 'down' ? ArrowDownRight : ArrowUpRight;
  const stroke = tile.tone === 'success' ? 'var(--success)' : tile.tone === 'danger' ? 'var(--danger)' : tile.tone === 'warn' ? 'var(--warning)' : tile.tone === 'info' ? 'var(--chart-info)' : tile.tone === 'purple' ? 'var(--chart-purple)' : 'var(--brand)';
  return (
    <button
      type="button"
      onClick={() => navigate(tile.href)}
      className="group flex flex-col gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-5 text-left transition hover:-translate-y-0.5 hover:border-[var(--brand)] hover:shadow-[var(--shadow-sm)]"
    >
      <div className="flex items-start justify-between">
        <span className={`grid h-10 w-10 place-items-center rounded-lg ${toneClass[tile.tone]}`}>
          <Icon className="h-5 w-5" />
        </span>
        <Sparkline data={tile.sparkline} stroke={stroke} />
      </div>
      <div>
        <p className="text-xs text-[var(--text-muted)]">{tile.label}</p>
        <p className="mt-1.5 text-2xl font-semibold tracking-tight tabular-nums">{tile.value}</p>
      </div>
      <p className={`inline-flex items-center gap-1 text-xs font-medium ${deltaClass}`}>
        <DeltaIcon className="h-3.5 w-3.5" />{tile.delta} 较昨日
      </p>
    </button>
  );
}

function TrendChart({ range }: { range: Range }) {
  const data = trendByRange[range];
  const width = 720;
  const height = 260;
  const padding = { top: 16, right: 56, bottom: 28, left: 48 };
  const callsMax = Math.ceil(Math.max(...data.calls) / 20000) * 20000;
  const xCount = data.hours.length;
  const xStep = (width - padding.left - padding.right) / Math.max(xCount - 1, 1);
  const xAt = (index: number) => padding.left + index * xStep;
  const yCalls = (value: number) => padding.top + ((callsMax - value) / callsMax) * (height - padding.top - padding.bottom);
  const yPct = (value: number) => padding.top + ((100 - value) / 1) * (height - padding.top - padding.bottom);
  const pathFor = (series: number[], y: (v: number) => number) => series.map((value, index) => `${index === 0 ? 'M' : 'L'} ${xAt(index)} ${y(value)}`).join(' ');
  const callPath = pathFor(data.calls, yCalls);
  const successPath = pathFor(data.success, yPct);
  const errorPath = pathFor(data.errors, yPct);
  const callArea = `${callPath} L ${xAt(xCount - 1)} ${height - padding.bottom} L ${xAt(0)} ${height - padding.bottom} Z`;
  const gridValues = [0, 0.25, 0.5, 0.75, 1];
  const [hover, setHover] = useState<number | null>(null);

  const onMove = (event: React.MouseEvent<SVGSVGElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const scale = width / rect.width;
    const localX = (event.clientX - rect.left) * scale;
    const index = Math.round((localX - padding.left) / xStep);
    setHover(Math.min(Math.max(index, 0), xCount - 1));
  };
  const onLeave = () => setHover(null);
  const hoverX = hover == null ? null : xAt(hover);

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${width} ${height}`} className="min-w-[640px] w-full" role="img" aria-label={`${range} 调用量与质量趋势`} onMouseMove={onMove} onMouseLeave={onLeave}>
        <defs>
          <linearGradient id="overviewCallFill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="var(--brand)" stopOpacity="0.22" />
            <stop offset="100%" stopColor="var(--brand)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {gridValues.map((g) => {
          const y = padding.top + g * (height - padding.top - padding.bottom);
          return <g key={g}>
            <line x1={padding.left} x2={width - padding.right} y1={y} y2={y} stroke="var(--chart-grid)" strokeDasharray="3 5" />
            <text x={padding.left - 8} y={y + 4} textAnchor="end" fill="var(--text-muted)" fontSize="11">{(callsMax * (1 - g) / 1000).toFixed(0)}k</text>
          </g>;
        })}
        <text x={padding.left} y={padding.top - 4} fill="var(--text-muted)" fontSize="10">调用量</text>
        <text x={width - padding.right} y={padding.top - 4} textAnchor="end" fill="var(--text-muted)" fontSize="10">可用率 / 错误率 %</text>
        <path d={callArea} fill="url(#overviewCallFill)" />
        <path d={callPath} fill="none" stroke="var(--brand)" strokeWidth="2.5" strokeLinecap="round" />
        <path d={successPath} fill="none" stroke="var(--chart-success)" strokeWidth="2" strokeLinecap="round" strokeDasharray="0" />
        <path d={errorPath} fill="none" stroke="var(--chart-danger)" strokeWidth="2" strokeLinecap="round" />
        {data.hours.map((label, index) => (
          <text key={label} x={xAt(index)} y={height - 10} textAnchor="middle" fill="var(--text-muted)" fontSize="11">{label}</text>
        ))}
        {hoverX != null && (
          <line x1={hoverX} x2={hoverX} y1={padding.top} y2={height - padding.bottom} stroke="var(--border-strong)" strokeDasharray="2 3" />
        )}
        {hover != null && (
          <g>
            <circle cx={xAt(hover)} cy={yCalls(data.calls[hover])} r="5" fill="var(--surface-1)" stroke="var(--brand)" strokeWidth="2.5" />
            <circle cx={xAt(hover)} cy={yPct(data.success[hover])} r="4" fill="var(--surface-1)" stroke="var(--chart-success)" strokeWidth="2" />
            <circle cx={xAt(hover)} cy={yPct(data.errors[hover])} r="4" fill="var(--surface-1)" stroke="var(--chart-danger)" strokeWidth="2" />
          </g>
        )}
      </svg>
      {hover != null && (
        <div className="mt-3 flex flex-wrap items-center gap-4 rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] px-4 py-3 text-xs">
          <span className="font-semibold tabular-nums">{data.hours[hover]}</span>
          <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[var(--brand)]" />调用量 {data.calls[hover].toLocaleString()}</span>
          <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[var(--chart-success)]" />可用率 {data.success[hover].toFixed(2)}%</span>
          <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[var(--chart-danger)]" />错误率 {data.errors[hover].toFixed(2)}%</span>
        </div>
      )}
    </div>
  );
}

function StatusDot({ status }: { status: 'ok' | 'degraded' | 'down' }) {
  const cls = status === 'ok' ? 'bg-[var(--success)]' : status === 'degraded' ? 'bg-[var(--warning)]' : 'bg-[var(--danger)]';
  return <span className={`grid h-2.5 w-2.5 place-items-center rounded-full ${cls}`} aria-hidden="true" />;
}

export default function AdminOverview() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const [range, setRange] = useState<Range>('24h');
  const [activeAlert, setActiveAlert] = useState<(typeof alerts)[number] | null>(null);
  const adminName = useMemo(() => user?.name ?? '平台管理员', [user?.name]);
  const adminEmail = useMemo(() => user?.email ?? 'admin@acme.com', [user?.email]);

  return (
    <div className="mx-auto w-full max-w-[1440px] space-y-6 p-5 pb-16 sm:p-8 xl:px-10">
      <section className="relative overflow-hidden rounded-[28px] border border-[var(--border)] bg-[var(--surface-1)] px-6 py-8 shadow-[var(--shadow-sm)] sm:px-8">
        <div aria-hidden="true" className="pointer-events-none absolute right-0 top-0 h-full w-1/2 bg-[radial-gradient(circle_at_top_right,var(--brand-light),transparent_68%)]" />
        <div className="relative flex flex-col justify-between gap-6 xl:flex-row xl:items-end">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--brand)]">ADMIN / 运营总览</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">把平台健康一眼说清楚。</h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--text-muted)]">6 个核心指标 · 3 条趋势曲线 · 实时告警与待处理事件 · 服务健康与 Top 智能体一屏可查。</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-1">
              {RANGES.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setRange(item)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${range === item ? 'bg-[var(--brand-light)] text-[var(--brand)]' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'}`}
                  aria-pressed={range === item}
                >
                  {item}
                </button>
              ))}
            </div>
            <button type="button" className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] px-3 py-2 text-xs font-semibold text-[var(--text-secondary)] hover:border-[var(--brand)] hover:text-[var(--brand)]">
              <RefreshCw className="h-4 w-4" />刷新
            </button>
            <div className="flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--brand-light)] text-base font-semibold text-[var(--brand)]">{adminName.slice(0, 1)}</span>
              <div>
                <p className="text-sm font-semibold">{adminName}</p>
                <p className="text-xs text-[var(--text-muted)]">{adminEmail}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section aria-label="核心指标" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        {kpis.map((tile) => <KpiTile key={tile.label} tile={tile} />)}
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
              <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[var(--chart-danger)]" />错误率</span>
              <button type="button" className="inline-flex items-center gap-1 rounded-lg border border-[var(--border)] px-2 py-1 font-semibold text-[var(--text-secondary)] hover:border-[var(--brand)] hover:text-[var(--brand)]">
                <Filter className="h-3.5 w-3.5" />筛选
              </button>
            </div>
          </div>
          <div className="mt-6">
            <TrendChart range={range} />
          </div>
        </section>

        <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-5 sm:p-7">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold">实时告警与待处理事件</h3>
              <p className="mt-1 text-xs text-[var(--text-muted)]">按严重度排序 · 点击查看详情</p>
            </div>
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-rose-50 text-rose-600 dark:bg-rose-500/15 dark:text-rose-300">
              <BellRing className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-5 divide-y divide-[var(--border)]">
            {alerts.map((alert) => {
              const badge = severityBadge[alert.severity];
              return (
                <button key={alert.id} type="button" onClick={() => setActiveAlert(alert)} className="flex w-full items-start gap-3 py-3 text-left transition hover:bg-[var(--bg-hover)]">
                  <span className={`mt-0.5 inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${badge.className}`}>{badge.label}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">{alert.title}</span>
                    <span className="mt-1 block text-xs text-[var(--text-muted)]">{alert.affected} · {alert.time}</span>
                  </span>
                  <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-[var(--text-muted)]" />
                </button>
              );
            })}
          </div>
          <button type="button" onClick={() => navigate('/admin/alerts')} className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-[var(--brand)] hover:underline">
            查看全部告警 <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </section>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
        <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-5 sm:p-7">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold">系统状态</h3>
              <p className="mt-1 text-xs text-[var(--text-muted)]">核心服务的健康检查 · 平均 30s 刷新</p>
            </div>
            <button type="button" onClick={() => setActiveAlert({ id: 'svc', severity: 'info', title: '查看全部服务', time: '现在', affected: '全部 5 项', suggestion: '点击进入 渠道管理 查看完整健康度。' })} className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--brand)] hover:underline">
              详情 <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="mt-5 divide-y divide-[var(--border)]">
            {services.map((service) => (
              <div key={service.name} className="flex items-center gap-4 py-3 first:pt-0 last:pb-0">
                <StatusDot status={service.status} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">{service.name}</p>
                  <p className="mt-0.5 text-xs text-[var(--text-muted)]">{service.detail}</p>
                </div>
                <span className="rounded-full bg-[var(--bg-elevated)] px-2 py-1 text-[10px] font-semibold text-[var(--text-secondary)]">{service.status === 'ok' ? '健康' : service.status === 'degraded' ? '降级' : '异常'}</span>
                <span className="shrink-0 text-xs tabular-nums text-[var(--text-muted)]">{service.latency}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-5 sm:p-7">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold">Top 智能体</h3>
              <p className="mt-1 text-xs text-[var(--text-muted)]">按 24h 调用量排序</p>
            </div>
            <button type="button" onClick={() => navigate('/admin/agents')} className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--brand)] hover:underline">
              全部 <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="mt-5 space-y-4">
            {topAgents.map((agent, index) => (
              <button key={agent.name} type="button" onClick={() => navigate('/admin/agents')} className="block w-full text-left transition hover:opacity-90">
                <div className="flex items-center justify-between text-xs">
                  <span className="inline-flex items-center gap-2 font-semibold">
                    <span className="grid h-5 w-5 place-items-center rounded-md bg-[var(--bg-elevated)] text-[10px] font-semibold text-[var(--text-muted)]">{index + 1}</span>
                    {agent.name}
                  </span>
                  <span className="tabular-nums text-[var(--text-muted)]">{agent.calls}</span>
                </div>
                <div className="mt-2 h-1.5 rounded-full bg-[var(--bg-hover)]">
                  <div className={`h-1.5 rounded-full ${barClass[agent.tone]}`} style={{ width: `${Math.max(agent.share * 100, 6)}%` }} />
                </div>
              </button>
            ))}
          </div>
        </section>
      </div>

      <SideDrawer open={activeAlert != null} onClose={() => setActiveAlert(null)} ariaLabel={activeAlert?.title ?? '告警详情'}
        eyebrow={activeAlert ? <span className={`inline-flex items-center rounded-full px-2 py-1 text-[10px] font-semibold ${severityBadge[activeAlert.severity].className}`}>{severityBadge[activeAlert.severity].label} · {activeAlert.time}</span> : null}
      >
        {activeAlert && (
          <div className="mt-6 space-y-6">
            <div>
              <h3 className="text-xl font-semibold">{activeAlert.title}</h3>
              <p className="mt-2 text-sm text-[var(--text-muted)]">影响范围：{activeAlert.affected}</p>
            </div>
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-5">
              <p className="text-xs font-semibold text-[var(--brand)]">建议处理</p>
              <p className="mt-2 text-sm leading-6">{activeAlert.suggestion}</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-[var(--border)] p-4">
                <p className="text-xs text-[var(--text-muted)]">首次出现</p>
                <p className="mt-1 text-sm font-semibold">{activeAlert.time}</p>
              </div>
              <div className="rounded-xl border border-[var(--border)] p-4">
                <p className="text-xs text-[var(--text-muted)]">处理状态</p>
                <p className="mt-1 text-sm font-semibold">待处理</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" className="inline-flex items-center gap-2 rounded-xl bg-[var(--brand)] px-4 py-2 text-xs font-semibold text-white hover:bg-[var(--brand-hover)]">立即处理</button>
              <button type="button" className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] px-4 py-2 text-xs font-semibold hover:border-[var(--brand)]">分派同事</button>
              <button type="button" className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] px-4 py-2 text-xs font-semibold hover:border-[var(--brand)]">稍后处理</button>
            </div>
          </div>
        )}
      </SideDrawer>

      <p className="text-center text-xs text-[var(--text-muted)]">本页为前端演示数据,生产环境将接入实时指标流。</p>
    </div>
  );
}