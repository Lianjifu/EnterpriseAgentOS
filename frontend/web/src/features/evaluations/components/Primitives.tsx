/**
 * Sparkline — 极简 SVG 折线图, 用于套件卡片趋势可视化。
 */
export function Sparkline({ data, stroke }: { data: number[]; stroke: string }) {
  const width = 96;
  const height = 28;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = Math.max(max - min, 0.01);
  const x = (i: number) => (i * width) / Math.max(data.length - 1, 1);
  const y = (v: number) => height - ((v - min) / range) * height;
  const line = data.map((v, i) => `${i === 0 ? 'M' : 'L'} ${x(i)} ${y(v)}`).join(' ');
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-7 w-24" preserveAspectRatio="none" aria-hidden="true">
      <path d={line} fill="none" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * StepIndicator — wizard 横向 step 进度条。
 */
export function StepIndicator({ current, total, labels }: { current: number; total: number; labels: string[] }) {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: total }).map((_, idx) => {
        const stepNum = idx + 1;
        const isActive = stepNum === current;
        const isDone = stepNum < current;
        return (
          <div key={stepNum} className="flex items-center gap-2">
            <div className="flex items-center gap-2">
              <span className={`grid h-6 w-6 place-items-center rounded-full text-[10px] font-semibold ${isActive || isDone ? 'bg-[var(--brand)] text-white' : 'bg-[var(--bg-elevated)] text-[var(--text-muted)]'}`}>{stepNum}</span>
              <span className={`text-[11px] font-medium ${isActive ? 'text-[var(--brand)]' : 'text-[var(--text-muted)]'}`}>{labels[idx]}</span>
            </div>
            {stepNum < total && <span className={`h-px w-8 ${isDone ? 'bg-[var(--brand)]' : 'bg-[var(--border)]'}`} />}
          </div>
        );
      })}
    </div>
  );
}