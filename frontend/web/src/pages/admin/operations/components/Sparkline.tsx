/**
 * Sparkline — 120x28 极简 SVG 折线,沿用 AdminOverview 风格但更宽,适合 4-12 个采样点。
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