interface StepIndicatorProps {
  current: number;
  total: number;
  labels: string[];
}

export function StepIndicator({ current, total, labels }: StepIndicatorProps) {
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
                {stepNum}
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