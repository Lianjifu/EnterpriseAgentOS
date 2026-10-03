import type { ButtonHTMLAttributes, ReactNode } from 'react';

export function CardActions({ children }: { children: ReactNode }) {
  return (
    <div className="relative z-10 mt-auto flex flex-wrap gap-1.5 border-t border-[var(--border)] pt-3">
      {children}
    </div>
  );
}

type ActionButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  tone?: 'default' | 'brand' | 'danger';
  children: ReactNode;
};

export function CardActionButton({ tone = 'default', className = '', children, ...props }: ActionButtonProps) {
  const toneClass =
    tone === 'brand'
      ? 'border-[var(--brand)] bg-[var(--brand)] text-white hover:bg-[var(--brand-hover)]'
      : tone === 'danger'
        ? 'border-rose-200 text-rose-600 hover:border-rose-300 hover:bg-rose-50 dark:border-rose-500/30 dark:text-rose-300 dark:hover:bg-rose-500/10'
        : 'border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--brand)] hover:text-[var(--brand)]';

  return (
    <button
      type="button"
      className={`inline-flex flex-1 items-center justify-center gap-1 rounded-lg border px-1.5 py-1.5 text-[11px] font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 ${toneClass} ${className}`.trim()}
      {...props}
    >
      {children}
    </button>
  );
}
