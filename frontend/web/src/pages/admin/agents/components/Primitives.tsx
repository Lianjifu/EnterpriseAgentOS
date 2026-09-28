/**
 * 视觉基元 — Sparkline / StepIndicator / EvalProgress。
 */
import { CheckCircle2, Play } from 'lucide-react';

export function Sparkline({ data, stroke }: { data: number[]; stroke: string }) {
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
              <span
                className={`grid h-6 w-6 place-items-center rounded-full text-[10px] font-semibold ${
                  isActive || isDone ? 'bg-[var(--brand)] text-white' : 'bg-[var(--bg-elevated)] text-[var(--text-muted)]'
                }`}
              >
                {isDone ? <CheckCircle2 className="h-3 w-3" /> : stepNum}
              </span>
              <span className={`text-[11px] font-medium ${isActive ? 'text-[var(--brand)]' : 'text-[var(--text-muted)]'}`}>
                {labels[idx]}
              </span>
            </div>
            {stepNum < total && <span className={`h-px w-8 ${isDone ? 'bg-[var(--brand)]' : 'bg-[var(--border)]'}`} />}
          </div>
        );
      })}
    </div>
  );
}

export function EvalProgress({ progress }: { progress: number }) {
  const total = 12;
  const current = Math.min(Math.ceil((progress / 100) * total), total);
  return (
    <div className="rounded-2xl border border-[var(--brand)] bg-[var(--brand-light)]/30 p-4">
      <div className="flex items-center justify-between text-xs">
        <span className="inline-flex items-center gap-2 font-semibold text-[var(--brand)]">
          <Play className="h-3.5 w-3.5" />正在运行评测
        </span>
        <span className="tabular-nums text-[var(--text-muted)]">{progress}%</span>
      </div>
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[var(--bg-elevated)]">
        <div className="h-full bg-[var(--brand)] transition-all duration-200" style={{ width: `${progress}%` }} />
      </div>
      <p className="mt-2 text-[11px] text-[var(--text-muted)]">执行用例 {current}/{total}</p>
    </div>
  );
}
