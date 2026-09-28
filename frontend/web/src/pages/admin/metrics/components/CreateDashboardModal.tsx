/**
 * CreateDashboardModal — 看板新建(名称 + 时间范围 + 描述)。
 */
import { useState } from 'react';
import { X } from 'lucide-react';
import type { MetricsTimeRange } from '@/api/admin/metrics/schema';
import { TIME_RANGES } from './constants';

export function CreateDashboardModal({ open, onClose, onSubmit }: {
  open: boolean; onClose: () => void; onSubmit: (input: { name: string; range: MetricsTimeRange; desc: string }) => void;
}) {
  const [name, setName] = useState('');
  const [range, setRange] = useState<MetricsTimeRange>('24h');
  const [desc, setDesc] = useState('');
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-[var(--bg)]/80 p-4 backdrop-blur-sm sm:items-center sm:p-8"
      role="dialog"
      aria-modal="true"
      aria-label="新建看板"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section className="w-full max-w-[480px] rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] shadow-[var(--shadow-lg)]">
        <header className="flex items-center justify-between border-b border-[var(--border)] px-6 py-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--brand)]">运行指标</p>
            <h3 className="mt-1 text-base font-semibold">新建看板</h3>
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
        <div className="space-y-3 px-6 py-5">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-[var(--text-secondary)]">看板名称</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例如 高优客户体验"
              className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] px-3 py-2 text-sm focus:border-[var(--brand)] focus:outline-none"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-[var(--text-secondary)]">默认时间范围</span>
            <select
              value={range}
              onChange={(e) => setRange(e.target.value as MetricsTimeRange)}
              className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] px-3 py-2 text-sm focus:border-[var(--brand)] focus:outline-none"
            >
              {TIME_RANGES.map((r) => (
                <option key={r.id} value={r.id}>{r.label}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-[var(--text-secondary)]">描述</span>
            <textarea
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              rows={2}
              placeholder="可选"
              className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] px-3 py-2 text-sm focus:border-[var(--brand)] focus:outline-none"
            />
          </label>
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
            disabled={!name.trim()}
            onClick={() => {
              onSubmit({ name: name.trim(), range, desc });
              setName('');
              setDesc('');
            }}
            className="inline-flex items-center justify-center rounded-xl bg-[var(--brand)] px-4 py-2 text-xs font-semibold text-white hover:bg-[var(--brand-hover)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            创建
          </button>
        </footer>
      </section>
    </div>
  );
}