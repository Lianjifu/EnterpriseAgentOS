import { ArrowDownRight, ArrowUpRight, BarChart3, CheckCircle2, ChevronDown, Clock3, Download, FileText, Filter, Gauge, MoreHorizontal, Sparkles, Target, TrendingUp } from 'lucide-react';
import { useMemo, useState } from 'react';

type Range = '近 7 天' | '近 30 天' | '本季度';

type TrendPoint = { label: string; value: number; tasks: number };

const trendByRange: Record<Range, TrendPoint[]> = {
  '近 7 天': [
    { label: '周一', value: 68, tasks: 8 }, { label: '周二', value: 74, tasks: 11 }, { label: '周三', value: 71, tasks: 9 }, { label: '周四', value: 83, tasks: 14 }, { label: '周五', value: 88, tasks: 16 }, { label: '周六', value: 79, tasks: 7 }, { label: '今天', value: 92, tasks: 18 },
  ],
  '近 30 天': [
    { label: '第 1 周', value: 64, tasks: 28 }, { label: '第 2 周', value: 72, tasks: 34 }, { label: '第 3 周', value: 79, tasks: 41 }, { label: '第 4 周', value: 88, tasks: 52 },
  ],
  本季度: [
    { label: '7 月', value: 61, tasks: 96 }, { label: '8 月', value: 76, tasks: 132 }, { label: '9 月', value: 88, tasks: 168 },
  ],
};

const scenarios = [
  { label: '资料整理', value: 96, detail: '32 次任务 · 节省 18.4 小时', color: 'bg-emerald-500' },
  { label: '客户跟进', value: 91, detail: '24 次任务 · 节省 12.8 小时', color: 'bg-sky-500' },
  { label: '周报与汇总', value: 84, detail: '18 次任务 · 节省 8.6 小时', color: 'bg-amber-500' },
  { label: '团队协作', value: 77, detail: '12 次任务 · 节省 5.1 小时', color: 'bg-violet-500' },
];

const outcomes = [
  { title: '销售周报自动整理', meta: '我的流程 · 今天 09:42', type: '流程', status: '已完成' },
  { title: '客户沟通助手', meta: '智能体 · 昨天 16:18', type: '智能体', status: '已完成' },
  { title: '九月用户反馈纪要', meta: '我的协作 · 周一 14:06', type: '产出物', status: '已保存' },
];

function formatDelta(value: number) {
  return `${value > 0 ? '+' : ''}${value}%`;
}

function TrendChart({ points, showTable }: { points: TrendPoint[]; showTable: boolean }) {
  const width = 720;
  const height = 240;
  const padding = { top: 24, right: 20, bottom: 38, left: 42 };
  const max = 100;
  const x = (index: number) => padding.left + (index * (width - padding.left - padding.right)) / Math.max(points.length - 1, 1);
  const y = (value: number) => padding.top + ((max - value) * (height - padding.top - padding.bottom)) / max;
  const line = points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${x(index)} ${y(point.value)}`).join(' ');
  const area = `${line} L ${x(points.length - 1)} ${height - padding.bottom} L ${x(0)} ${height - padding.bottom} Z`;
  const gridValues = [0, 25, 50, 75, 100];

  return (
    <div>
      {showTable ? <div className="overflow-hidden rounded-xl border border-[var(--border)]"><table className="w-full text-left text-xs"><caption className="sr-only">智能体任务完成率趋势数据</caption><thead className="bg-[var(--bg-elevated)] text-[var(--text-muted)]"><tr><th className="px-4 py-3 font-medium">时间</th><th className="px-4 py-3 font-medium">完成率</th><th className="px-4 py-3 font-medium">完成任务</th></tr></thead><tbody className="divide-y divide-[var(--border)]">{points.map((point) => <tr key={point.label}><td className="px-4 py-3 font-medium">{point.label}</td><td className="px-4 py-3">{point.value}%</td><td className="px-4 py-3 text-[var(--text-muted)]">{point.tasks} 次</td></tr>)}</tbody></table></div> : <div className="overflow-x-auto" role="img" aria-label="智能体任务完成率趋势图"><svg viewBox={`0 0 ${width} ${height}`} className="min-w-[620px]" preserveAspectRatio="none"><defs><linearGradient id="insightTrendFill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="var(--brand)" stopOpacity="0.24" /><stop offset="100%" stopColor="var(--brand)" stopOpacity="0" /></linearGradient></defs>{gridValues.map((value) => <g key={value}><line x1={padding.left} x2={width - padding.right} y1={y(value)} y2={y(value)} stroke="var(--border)" strokeDasharray="3 5" /><text x={padding.left - 10} y={y(value) + 4} textAnchor="end" fill="var(--text-muted)" fontSize="11">{value}%</text></g>)}<path d={area} fill="url(#insightTrendFill)" /><path d={line} fill="none" stroke="var(--brand)" strokeLinecap="round" strokeWidth="3" />{points.map((point, index) => <g key={point.label}><circle cx={x(index)} cy={y(point.value)} r="8" fill="var(--surface-1)" stroke="var(--brand)" strokeWidth="3" tabIndex={0}><title>{`${point.label}：${point.value}% · ${point.tasks} 次任务`}</title></circle><text x={x(index)} y={height - 12} textAnchor="middle" fill="var(--text-muted)" fontSize="11">{point.label}</text></g>)}</svg></div>}
    </div>
  );
}

export default function MyInsights({ embedded = false }: { embedded?: boolean }) {
  const [range, setRange] = useState<Range>('近 7 天');
  const [showTable, setShowTable] = useState(false);
  const [notice, setNotice] = useState('');
  const points = trendByRange[range];
  const average = Math.round(points.reduce((sum, point) => sum + point.value, 0) / points.length);
  const totalTasks = points.reduce((sum, point) => sum + point.tasks, 0);
  const bestDay = useMemo(() => points.reduce((best, point) => point.value > best.value ? point : best, points[0]), [points]);

  return (
    <div className={embedded ? 'w-full space-y-6' : 'mx-auto w-full max-w-[1440px] space-y-6 p-5 pb-16 sm:p-8 xl:px-10'}>
      {!embedded && <section className="relative overflow-hidden rounded-[28px] border border-[var(--border)] bg-[var(--surface-1)] px-6 py-7 shadow-[var(--shadow-sm)] sm:px-8"><div aria-hidden="true" className="pointer-events-none absolute right-0 top-0 h-full w-2/5 bg-[radial-gradient(circle_at_top_right,var(--brand-light),transparent_68%)]" /><div className="relative flex flex-col justify-between gap-6 xl:flex-row xl:items-end"><div><p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--brand)]">INSIGHTS / 效果看板</p><h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">你的工作，正在变得更轻。</h2><p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--text-muted)]">看见智能体真正帮你完成了什么，以及哪些工作最值得继续交给它。</p></div><div className="flex flex-wrap items-center gap-2"><label className="sr-only" htmlFor="insights-range">选择时间范围</label><select id="insights-range" value={range} onChange={(event) => setRange(event.target.value as Range)} className="h-10 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] px-3 text-xs font-semibold outline-none focus:border-[var(--brand)]">{Object.keys(trendByRange).map((item) => <option key={item}>{item}</option>)}</select><button type="button" onClick={() => setNotice('报告已准备好下载（本地演示）。')} className="inline-flex h-10 items-center gap-2 rounded-xl border border-[var(--border)] px-3.5 text-xs font-semibold text-[var(--text-secondary)] hover:border-[var(--brand)] hover:text-[var(--brand)]"><Download className="h-4 w-4" />导出报告</button></div></div></section>}
      {embedded && <div className="flex flex-col justify-between gap-4 rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-5 sm:flex-row sm:items-center"><div><p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--brand)]">WORK IMPACT / 工作效果</p><h3 className="mt-2 text-xl font-semibold">效果摘要</h3><p className="mt-1 text-xs text-[var(--text-muted)]">智能体和流程最近帮你完成了什么</p></div><div className="flex flex-wrap items-center gap-2"><label className="sr-only" htmlFor="embedded-insights-range">选择时间范围</label><select id="embedded-insights-range" value={range} onChange={(event) => setRange(event.target.value as Range)} className="h-10 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] px-3 text-xs font-semibold outline-none focus:border-[var(--brand)]">{Object.keys(trendByRange).map((item) => <option key={item}>{item}</option>)}</select><button type="button" onClick={() => setNotice('报告已准备好下载（本地演示）。')} className="inline-flex h-10 items-center gap-2 rounded-xl border border-[var(--border)] px-3.5 text-xs font-semibold text-[var(--text-secondary)] hover:border-[var(--brand)] hover:text-[var(--brand)]"><Download className="h-4 w-4" />导出摘要</button></div></div>}
      {notice && <div role="status" className="flex items-center justify-between rounded-xl border border-emerald-400/25 bg-emerald-50 p-3 text-xs text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-200"><span>{notice}</span><button type="button" onClick={() => setNotice('')} aria-label="关闭提示">×</button></div>}
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4"><div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-5"><div className="flex items-center justify-between"><span className="text-xs text-[var(--text-muted)]">完成任务</span><span className="grid h-8 w-8 place-items-center rounded-lg bg-[var(--brand-light)] text-[var(--brand)]"><CheckCircle2 className="h-4 w-4" /></span></div><p className="mt-4 text-3xl font-semibold tabular-nums">{totalTasks}</p><p className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-emerald-600"><ArrowUpRight className="h-3.5 w-3.5" />较上期 +18%</p></div><div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-5"><div className="flex items-center justify-between"><span className="text-xs text-[var(--text-muted)]">平均完成率</span><span className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300"><Gauge className="h-4 w-4" /></span></div><p className="mt-4 text-3xl font-semibold tabular-nums">{average}%</p><p className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-emerald-600"><ArrowUpRight className="h-3.5 w-3.5" />较上期 +12%</p></div><div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-5"><div className="flex items-center justify-between"><span className="text-xs text-[var(--text-muted)]">预计节省</span><span className="grid h-8 w-8 place-items-center rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300"><Clock3 className="h-4 w-4" /></span></div><p className="mt-4 text-3xl font-semibold tabular-nums">44.9<span className="ml-1 text-base font-medium">小时</span></p><p className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-emerald-600"><ArrowUpRight className="h-3.5 w-3.5" />较上期 +9.6 小时</p></div><div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-5"><div className="flex items-center justify-between"><span className="text-xs text-[var(--text-muted)]">活跃场景</span><span className="grid h-8 w-8 place-items-center rounded-lg bg-sky-50 text-sky-600 dark:bg-sky-500/15 dark:text-sky-300"><Target className="h-4 w-4" /></span></div><p className="mt-4 text-3xl font-semibold tabular-nums">8</p><p className="mt-2 text-xs text-[var(--text-muted)]">最近表现最好：{bestDay.label}</p></div></section>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]"><section className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-5 sm:p-7"><div className="flex flex-wrap items-start justify-between gap-4"><div><div className="flex items-center gap-2"><TrendingUp className="h-5 w-5 text-[var(--brand)]" /><h3 className="text-base font-semibold">任务完成率趋势</h3></div><p className="mt-1 text-xs text-[var(--text-muted)]">完成任务 ÷ 发起任务 · 单位：百分比</p></div><button type="button" onClick={() => setShowTable((value) => !value)} className="inline-flex items-center gap-2 rounded-lg border border-[var(--border)] px-3 py-2 text-xs font-semibold text-[var(--text-secondary)] hover:border-[var(--brand)] hover:text-[var(--brand)]" aria-pressed={showTable}>{showTable ? '查看趋势图' : '查看数据表'}<ChevronDown className={`h-3.5 w-3.5 transition ${showTable ? 'rotate-180' : ''}`} /></button></div><div className="mt-7"><TrendChart points={points} showTable={showTable} /></div></section><section className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-5 sm:p-7"><div className="flex items-center justify-between"><div><h3 className="text-base font-semibold">场景效率</h3><p className="mt-1 text-xs text-[var(--text-muted)]">按完成率排序</p></div><BarChart3 className="h-5 w-5 text-[var(--brand)]" /></div><div className="mt-7 space-y-5">{scenarios.map((item) => <div key={item.label}><div className="flex items-center justify-between text-xs"><span className="font-semibold">{item.label}</span><span className="tabular-nums text-[var(--text-muted)]">{item.value}%</span></div><div className="mt-2 h-2 rounded-full bg-[var(--bg-hover)]"><div className={`h-2 rounded-full ${item.color}`} style={{ width: `${item.value}%` }} /></div><p className="mt-1.5 text-[11px] text-[var(--text-muted)]">{item.detail}</p></div>)}</div></section></div>
      <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)]"><div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4 sm:px-7"><div><h3 className="flex items-center gap-2 text-base font-semibold"><Sparkles className="h-4 w-4 text-[var(--brand)]" />最近成果</h3><p className="mt-1 text-xs text-[var(--text-muted)]">智能体与流程最近为你留下的结果</p></div><button type="button" className="rounded-lg p-2 text-[var(--text-muted)] hover:bg-[var(--bg-hover)]" aria-label="更多成果"><MoreHorizontal className="h-4 w-4" /></button></div><div className="grid divide-y divide-[var(--border)] md:grid-cols-3 md:divide-x md:divide-y-0">{outcomes.map((item) => <div key={item.title} className="flex items-center gap-3 px-5 py-4 sm:px-7"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[var(--bg-elevated)] text-[var(--brand)]"><FileText className="h-4 w-4" /></span><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{item.title}</p><p className="mt-1 truncate text-xs text-[var(--text-muted)]">{item.meta}</p></div><span className="shrink-0 rounded-full bg-[var(--success-bg)] px-2 py-1 text-[10px] font-semibold text-[var(--success)]">{item.status}</span></div>)}</div></section>
    </div>
  );
}
