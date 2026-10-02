/**
 * 命中/MRR 折线 — 与 AdminOverview 的 TrendChart 同款色板,加上图例 + Y 轴刻度。
 * 数据由 KnowledgePage 从 evalCases 实时派生;保留 QUALITY_TREND 作为默认值兜底。
 */
import { QUALITY_TREND } from './constants';

export type QualityPoint = { label: string; hit: number; mrr: number };

export default function QualityChart({ data }: { data?: QualityPoint[] }) {
  const points = data && data.length > 0 ? data : QUALITY_TREND;
  const W = 560;
  const H = 200;
  const padL = 40;
  const padR = 16;
  const padT = 16;
  const padB = 28;
  const xs = points.map((_, i) => padL + (i * (W - padL - padR)) / Math.max(1, points.length - 1));
  const minV = 0.5;
  const maxV = 1.0;
  const toY = (v: number) => padT + (1 - (v - minV) / (maxV - minV)) * (H - padT - padB);
  const hitPoints = points.map((d, i) => `${xs[i]},${toY(d.hit)}`).join(' ');
  const mrrPoints = points.map((d, i) => `${xs[i]},${toY(d.mrr)}`).join(' ');

  const ticks = [0.5, 0.6, 0.7, 0.8, 0.9, 1.0];

  return (
    <div className="flex flex-col gap-3">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-[200px] w-full" role="img" aria-label="命中率与 MRR 7 天趋势">
        {ticks.map((g) => (
          <g key={g}>
            <line x1={padL} x2={W - padR} y1={toY(g)} y2={toY(g)} stroke="var(--chart-grid)" strokeDasharray={g === minV || g === maxV ? undefined : '2 4'} />
            <text x={padL - 6} y={toY(g) + 3} textAnchor="end" fontSize="10" fill="var(--text-muted)">{Math.round(g * 100)}%</text>
          </g>
        ))}
        <polyline points={hitPoints} fill="none" stroke="var(--chart-info)" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        <polyline points={mrrPoints} fill="none" stroke="var(--chart-success)" strokeWidth="2.5" strokeDasharray="5 4" strokeLinejoin="round" strokeLinecap="round" />
        {points.map((d, i) => (
          <g key={d.label}>
            <circle cx={xs[i]} cy={toY(d.hit)} r="3.5" fill="var(--chart-info)" stroke="var(--surface-1)" strokeWidth="1.5" />
            <text x={xs[i]} y={H - 8} textAnchor="middle" fontSize="11" fill="var(--text-muted)">{d.label}</text>
          </g>
        ))}
      </svg>
      <div className="flex flex-wrap items-center gap-4 text-[11px] text-[var(--text-secondary)]">
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-5 rounded-full" style={{ background: 'var(--chart-info)' }} />
          命中率(实线)
        </span>
        <span className="inline-flex items-center gap-1.5">
          <svg width="22" height="6" aria-hidden="true"><line x1="0" y1="3" x2="22" y2="3" stroke="var(--chart-success)" strokeWidth="2.5" strokeDasharray="5 4" /></svg>
          平均 MRR(虚线)
        </span>
        <span className="text-[var(--text-muted)]">Y 轴 50%–100%</span>
      </div>
    </div>
  );
}