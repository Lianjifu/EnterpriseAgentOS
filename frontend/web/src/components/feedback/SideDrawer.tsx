import { useEffect, type ReactNode } from 'react';
import { X } from 'lucide-react';

interface SideDrawerProps {
  open: boolean;
  onClose: () => void;
  ariaLabel: string;
  /** Header tag rendered to the left of the close button (caller controls its tone/size classes). */
  eyebrow?: ReactNode;
  /** aria-label for the close button. */
  closeLabel?: string;
  /** Extra Tailwind classes appended to the panel <section>. */
  panelClassName?: string;
  children: ReactNode;
}

export function SideDrawer({
  open,
  onClose,
  ariaLabel,
  eyebrow,
  closeLabel = '关闭面板',
  panelClassName,
  children,
}: SideDrawerProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-slate-950/45"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        className={`h-full w-full max-w-lg overflow-y-auto bg-[var(--surface-1)] p-6 shadow-2xl sm:p-8 ${panelClassName ?? ''}`}
      >
        <div className="flex items-center justify-between">
          {eyebrow}
          <button
            type="button"
            autoFocus
            onClick={onClose}
            aria-label={closeLabel}
            className="rounded-lg p-2 text-[var(--text-muted)] hover:bg-[var(--bg-hover)]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}