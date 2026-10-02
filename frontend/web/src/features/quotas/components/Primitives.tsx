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

export function ProgressBar({ used, total, tone = 'violet' }: { used: number; total: number; tone?: 'violet' | 'amber' | 'rose' | 'emerald' }) {
  const pct = Math.min(100, Math.round((used / Math.max(total, 1)) * 100));
  const fill = tone === 'amber' ? 'bg-amber-500' : tone === 'rose' ? 'bg-rose-500' : tone === 'emerald' ? 'bg-emerald-500' : 'bg-violet-500';
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--bg-elevated)]">
      <div className={`h-full ${fill} transition-all`} style={{ width: `${pct}%` }} />
    </div>
  );
}

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