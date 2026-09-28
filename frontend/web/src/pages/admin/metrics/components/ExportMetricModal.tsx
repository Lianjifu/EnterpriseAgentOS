/**
 * ExportMetricModal — 导出当前指标(模型/延迟/成本/看板)为 JSON。
 */
import { useState } from 'react';
import { X } from 'lucide-react';

const SECTIONS = [
  { id: 'models', label: '模型指标' },
  { id: 'latency', label: '延迟曲线' },
  { id: 'cost', label: '成本拆解' },
  { id: 'dashboards', label: '看板清单' },
] as const;

export function ExportMetricModal({ open, onClose, onExport }: {
  open: boolean; onClose: () => void; onExport: (sections: string[]) => void;
}) {
  const [picked, setPicked] = useState<Set<string>>(new Set(['models']));
  if (!open) return null;
  const toggle = (id: string) => {
    const next = new Set(picked);
    if (next.has(id)) next.delete(id); else next.add(id);
    setPicked(next);
  };
  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-[var(--bg)]/80 p-4 backdrop-blur-sm sm:items-center sm:p-8"
      role="dialog"
      aria-modal="true"
      aria-label="导出指标"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section className="w-full max-w-[420px] rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] shadow-[var(--shadow-lg)]">
        <header className="flex items-center justify-between border-b border-[var(--border)] px-6 py-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--brand)]">运行指标</p>
            <h3 className="mt-1 text-base font-semibold">导出指标</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="关闭"
            className="grid h-8 w-8 place-items-center rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--brand)]"
          >
            <X className="h-4 w-4" />
          </button>
        </header>
        <div className="space-y-2 px-6 py-5">
          {SECTIONS.map((s) => (
            <label
              key={s.id}
              className="flex cursor-pointer items-center gap-3 rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm hover:bg-[var(--bg-hover)]"
            >
              <input
                type="checkbox"
                checked={picked.has(s.id)}
                onChange={() => toggle(s.id)}
                className="h-4 w-4 rounded border-[var(--border-strong)] text-[var(--brand)] focus:ring-[var(--brand)]"
              />
              <span className="text-[var(--text-secondary)]">{s.label}</span>
            </label>
          ))}
        </div>
        <footer className="flex justify-end gap-2 border-t border-[var(--border)] px-6 py-3">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center justify-center rounded-xl border border-[var(--border)] px-4 py-2 text-xs font-semibold text-[var(--text-secondary)] hover:border-[var(--brand)] hover:text-[var(--brand)]"
          >
            取消
          </button>
          <button
            type="button"
            disabled={picked.size === 0}
            onClick={() => onExport([...picked])}
            className="inline-flex items-center justify-center rounded-xl bg-[var(--brand)] px-4 py-2 text-xs font-semibold text-white hover:bg-[var(--brand-hover)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            导出 JSON
          </button>
        </footer>
      </section>
    </div>
  );
}