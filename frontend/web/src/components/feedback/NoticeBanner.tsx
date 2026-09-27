import { X } from 'lucide-react';
import type { ReactNode } from 'react';

export type NoticeTone = 'sky' | 'emerald' | 'amber' | 'violet' | 'rose';

const toneClasses: Record<NoticeTone, string> = {
  sky: 'border-sky-400/25 bg-sky-50 text-sky-900 dark:bg-sky-500/10 dark:text-sky-200',
  emerald: 'border-emerald-400/25 bg-emerald-50 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-200',
  amber: 'border-amber-400/25 bg-amber-50 text-amber-900 dark:bg-amber-500/10 dark:text-amber-200',
  violet: 'border-violet-400/25 bg-violet-50 text-violet-900 dark:bg-violet-500/10 dark:text-violet-200',
  rose: 'border-rose-400/25 bg-rose-50 text-rose-900 dark:bg-rose-500/10 dark:text-rose-200',
};

interface NoticeBannerProps {
  /** Color tone. Defaults to `sky` for backward compatibility with the prior inline usage. */
  tone?: NoticeTone;
  /** Inline message; accepts text or markup so callers can include links / emphasis. */
  children: ReactNode;
  /** aria-label for the close button. */
  closeLabel?: string;
  onClose: () => void;
}

/**
 * Small inline status banner used at the top of a page after a local action
 * completes. The wrapper renders `role="status"` so screen readers announce
 * updates. Pass `null` from the parent to hide.
 */
export function NoticeBanner({ tone = 'sky', children, closeLabel = '关闭提示', onClose }: NoticeBannerProps) {
  return (
    <div role="status" className={`flex items-center justify-between gap-3 rounded-xl border p-3 text-xs ${toneClasses[tone]}`}>
      <span>{children}</span>
      <button type="button" onClick={onClose} aria-label={closeLabel} className="shrink-0 rounded p-1 hover:bg-black/5 dark:hover:bg-white/10">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}