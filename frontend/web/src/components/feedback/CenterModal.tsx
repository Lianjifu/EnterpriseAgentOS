import { useEffect, type FormEvent, type ReactNode } from 'react';
import { X } from 'lucide-react';

interface CenterModalProps {
  open: boolean;
  onClose: () => void;
  ariaLabel: string;
  /** Header title (rendered as an h3). */
  title: ReactNode;
  /** Optional small paragraph below the title. */
  description?: ReactNode;
  /**
   * Form submit handler. Defaults to `event.preventDefault()` so the page
   * never reloads even if the caller forgets to handle it. Provide a custom
   * handler to actually run side effects on submit.
   */
  onSubmit?: (event: FormEvent<HTMLFormElement>) => void;
  /** aria-label for the close button. */
  closeLabel?: string;
  /** Tailwind classes appended to the inner panel. */
  panelClassName?: string;
  /** Form fields, rendered between description and footer. */
  children: ReactNode;
  /** Action buttons (right-aligned). */
  footer: ReactNode;
}

export function CenterModal({
  open,
  onClose,
  ariaLabel,
  title,
  description,
  onSubmit = (event) => event.preventDefault(),
  closeLabel = '关闭对话框',
  panelClassName,
  children,
  footer,
}: CenterModalProps) {
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
      className="fixed inset-0 z-50 grid place-items-center bg-slate-950/45 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <form
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        onSubmit={onSubmit}
        className={`w-full max-w-lg rounded-2xl bg-[var(--surface-1)] p-6 shadow-2xl ${panelClassName ?? ''}`}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label={closeLabel}
            className="rounded-lg p-2 text-[var(--text-muted)] hover:bg-[var(--bg-hover)]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        {description && <p className="mt-2 text-xs leading-6 text-[var(--text-muted)]">{description}</p>}
        {children}
        <div className="mt-6 flex justify-end gap-2">{footer}</div>
      </form>
    </div>
  );
}