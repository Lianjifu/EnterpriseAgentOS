import type { ReactNode } from 'react';

interface BrandLogoProps {
  /** Pixel size for both width and height of the icon mark. */
  size?: number;
  /** When true, render the mark followed by the wordmark text on the same baseline. */
  withWordmark?: boolean;
  /** Wordmark element. Defaults to "企智搭 · 智能体平台" when `withWordmark` is true. */
  wordmark?: ReactNode;
  /** Extra Tailwind classes applied to the outer wrapper. */
  className?: string;
  /** Extra classes for the wordmark span (when `withWordmark` is true). */
  wordmarkClassName?: string;
  /** Accessible label for the icon-only variant. Ignored when `withWordmark` is true. */
  ariaLabel?: string;
}

/**
 * Brand mark for 企智搭 · 智能体平台.
 *
 * The mark uses two stacked rounded blocks — the "搭" (build/stack) idea — on
 * a brand-tinted square. Inner stroke / fill colors use `currentColor` so the
 * caller can theme the whole thing by setting `text-*` on a parent (e.g.
 * `text-[var(--brand)]` for the primary mark, `text-white` on a brand banner).
 */
export function BrandLogo({
  size = 36,
  withWordmark = false,
  wordmark,
  className,
  wordmarkClassName,
  ariaLabel = '企智搭 · 智能体平台',
}: BrandLogoProps) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className ?? ''}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
        role={withWordmark ? 'presentation' : 'img'}
        aria-label={withWordmark ? undefined : ariaLabel}
        aria-hidden={withWordmark ? 'true' : undefined}
        focusable="false"
        className="shrink-0"
      >
        <rect width="24" height="24" rx="6" fill="currentColor" />
        <rect x="5" y="13" width="14" height="6.5" rx="1.6" fill="white" />
        <rect x="8" y="4.5" width="11" height="6.5" rx="1.6" fill="white" fillOpacity="0.55" />
        <circle cx="17.5" cy="7.75" r="1.4" fill="white" fillOpacity="0.9" />
      </svg>
      {withWordmark && (
        <span className={wordmarkClassName ?? 'text-sm font-semibold text-[var(--text)]'}>
          {wordmark ?? '企智搭 · 智能体平台'}
        </span>
      )}
    </span>
  );
}