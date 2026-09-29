/**
 * 命中/MRR 折线 — 与 AdminOverview 的 TrendChart 同款色板,只是简化无 hover 十字。
 * 数据由 KnowledgePage 从 evalCases 实时派生;保留 QUALITY_TREND 作为默认值兜底。
 */
import { QUALITY_TREND } from './constants';

export type QualityPoint = { label: string; hit: number; mrr: number };

export default function QualityChart({ data }: { data?: QualityPoint[] }) {
  const points = data && data.length > 0 ? data : QUALITY_TREND;
  const W = 360;
  const H = 140;
  const pad = 24;
  const xs = points.map((_, i) => pad + (i * (W - pad * 2)) / (points.length - 1));
  const toY = (v: number) => H - pad - (v - 0.5) * 2 * (H - pad * 2);
  const hitPoints = points.map((d, i) => `${xs[i]},${toY(d.hit)}`).join(' ');
  const mrrPoints = points.map((d, i) => `${xs[i]},${toY(d.mrr)}`).join(' ');

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-[140px] w-full max-w-[360px]" role="img" aria-label="命中趋势">
      {[0.5, 0.7, 0.9].map((g) => (
        <line key={g} x1={pad} x2={W - pad} y1={toY(g)} y2={toY(g)} stroke="var(--chart-grid)" />
      ))}
      <polyline points={hitPoints} fill="none" stroke="var(--chart-info)" strokeWidth="2" strokeLinejoin="round" />
      <polyline points={mrrPoints} fill="none" stroke="var(--chart-success)" strokeWidth="2" strokeDasharray="4 4" strokeLinejoin="round" />
      {points.map((d, i) => (
        <g key={d.label}>
          <circle cx={xs[i]} cy={toY(d.hit)} r="3" fill="var(--chart-info)" />
          <text x={xs[i]} y={H - 6} textAnchor="middle" fontSize="10" fill="var(--text-muted)">{d.label}</text>
        </g>
      ))}
    </svg>
  );
}