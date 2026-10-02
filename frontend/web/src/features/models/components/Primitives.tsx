import { CheckCircle2 } from 'lucide-react';

export function Sparkline({ values, tone = 'brand' }: { values: number[]; tone?: 'brand' | 'emerald' | 'rose' }) {
  if (!values.length) return null;
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = max - min || 1;
  const w = 120;
  const h = 32;
  const step = w / Math.max(values.length - 1, 1);
  const points = values.map((v, i) => `${i * step},${h - ((v - min) / range) * h}`).join(' ');
  const stroke = tone === 'emerald' ? '#10b981' : tone === 'rose' ? '#f43f5e' : 'var(--brand, #6366f1)';
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-8 w-full" preserveAspectRatio="none" aria-hidden="true">
      <polyline fill="none" stroke={stroke} strokeWidth="1.5" points={points} />
    </svg>
  );
}

export function StepIndicator({ current, total, labels }: { current: number; total: number; labels: string[] }) {
  return (
    <ol className="flex items-center gap-2 text-[11px] font-semibold text-[var(--text-muted)]">
      {labels.map((label, i) => {
        const step = i + 1;
        const done = step < current;
        const active = step === current;
        return (
          <li key={label} className="flex items-center gap-2">
            <span className={`grid h-6 w-6 place-items-center rounded-full border text-[10px] ${done ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : active ? 'border-[var(--brand)] bg-[var(--brand-light)] text-[var(--brand)]' : 'border-[var(--border)] bg-[var(--surface-1)] text-[var(--text-muted)]'}`}>
              {done ? <CheckCircle2 className="h-3 w-3" /> : step}
            </span>
            <span className={active ? 'text-[var(--brand)]' : ''}>{label}</span>
            {step < total && <span aria-hidden="true" className="h-px w-6 bg-[var(--border)]" />}
          </li>
        );
      })}
    </ol>
  );
}
