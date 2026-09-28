import { Check } from 'lucide-react';
import { WIZARD_STEPS } from './constants';

export default function StepIndicator({ active }: { active: number }) {
  return (
    <ol className="flex flex-wrap items-center gap-3">
      {WIZARD_STEPS.map((s, i) => {
        const done = i < active;
        const cur = i === active;
        return (
          <li key={s.id} className="flex items-center gap-2 text-xs">
            <span className={`grid h-6 w-6 place-items-center rounded-full text-[10px] font-semibold transition ${done ? 'bg-[var(--brand)] text-white' : cur ? 'border-2 border-[var(--brand)] bg-[var(--surface-1)] text-[var(--brand)]' : 'bg-[var(--bg-elevated)] text-[var(--text-muted)]'}`}>
              {done ? <Check className="h-3 w-3" /> : i + 1}
            </span>
            <span className={done || cur ? 'font-semibold text-[var(--text)]' : 'text-[var(--text-muted)]'}>
              {s.label}
            </span>
            {i < WIZARD_STEPS.length - 1 && (
              <span className="ml-1 h-px w-6 bg-[var(--border)]" />
            )}
          </li>
        );
      })}
    </ol>
  );
}