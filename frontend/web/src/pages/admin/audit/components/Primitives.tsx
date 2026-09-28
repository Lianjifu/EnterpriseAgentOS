/**
 * 基础可视化 — Sparkline(120x28) + RiskBar(score 0-100)。
 */
export function Sparkline({ data, stroke }: { data: number[]; stroke: string }) {
  const width = 120;
  const height = 28;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = Math.max(max - min, 0.01);
  const x = (i: number) => (i * width) / Math.max(data.length - 1, 1);
  const y = (v: number) => height - ((v - min) / range) * height;
  const line = data.map((v, i) => `${i === 0 ? 'M' : 'L'} ${x(i)} ${y(v)}`).join(' ');
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-7 w-28" preserveAspectRatio="none" aria-hidden="true">
      <path d={line} fill="none" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function RiskBar({ score }: { score: number }) {
  const pct = Math.min(100, Math.max(0, score));
  const tone = score >= 80 ? 'bg-rose-500' : score >= 60 ? 'bg-orange-500' : score >= 40 ? 'bg-amber-500' : 'bg-emerald-500';
  return (
    <div className="flex items-center gap-2">
      <div className="relative h-1.5 w-20 overflow-hidden rounded-full bg-[var(--bg-elevated)]">
        <div className={`h-full rounded-full ${tone}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="w-7 text-right text-[10px] tabular-nums">{score}</span>
    </div>
  );
}