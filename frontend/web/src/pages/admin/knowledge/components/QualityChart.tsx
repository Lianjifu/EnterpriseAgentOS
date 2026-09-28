/**
 * 命中/MRR 折线 — 与 AdminOverview 的 TrendChart 同款色板,只是简化无 hover 十字。
 */
import { QUALITY_TREND } from './constants';

export default function QualityChart() {
  const W = 360;
  const H = 140;
  const pad = 24;
  const xs = QUALITY_TREND.map((_, i) => pad + (i * (W - pad * 2)) / (QUALITY_TREND.length - 1));
  const toY = (v: number) => H - pad - (v - 0.5) * 2 * (H - pad * 2);
  const hitPoints = QUALITY_TREND.map((d, i) => `${xs[i]},${toY(d.hit)}`).join(' ');
  const mrrPoints = QUALITY_TREND.map((d, i) => `${xs[i]},${toY(d.mrr)}`).join(' ');

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-[140px] w-full max-w-[360px]" role="img" aria-label="命中趋势">
      {[0.5, 0.7, 0.9].map((g) => (
        <line key={g} x1={pad} x2={W - pad} y1={toY(g)} y2={toY(g)} stroke="var(--chart-grid)" />
      ))}
      <polyline points={hitPoints} fill="none" stroke="var(--chart-info)" strokeWidth="2" strokeLinejoin="round" />
      <polyline points={mrrPoints} fill="none" stroke="var(--chart-success)" strokeWidth="2" strokeDasharray="4 4" strokeLinejoin="round" />
      {QUALITY_TREND.map((d, i) => (
        <g key={d.day}>
          <circle cx={xs[i]} cy={toY(d.hit)} r="3" fill="var(--chart-info)" />
          <text x={xs[i]} y={H - 6} textAnchor="middle" fontSize="10" fill="var(--text-muted)">{d.day}</text>
        </g>
      ))}
    </svg>
  );
}