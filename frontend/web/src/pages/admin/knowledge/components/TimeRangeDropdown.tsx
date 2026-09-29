/**
 * TimeRangeDropdown — AdminKnowledge 时间窗口下拉(快捷 + 自定义)。
 *
 * 复用 AdminMemory 同款样式(Calendar + 当前值 + 下拉面板),
 * 但快捷区间收敛到 3 个固定档位(7d / 30d / 90d),无更细颗粒度。
 */
import { useEffect, useRef, useState } from 'react';
import { Calendar, CheckCircle2, ChevronDown } from 'lucide-react';
import { RANGES } from './constants';

type KnowledgeRange = '7d' | '30d' | '90d';

export function TimeRangeDropdown({ value, onChange }: {
  value: KnowledgeRange;
  onChange: (next: KnowledgeRange) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDoc = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const current = RANGES.find((r) => r.id === value)?.label ?? '';

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="inline-flex h-9 items-center gap-2 rounded-xl border border-[var(--brand)] px-3 text-xs font-semibold text-[var(--brand)] hover:bg-[var(--brand-light)]"
      >
        <Calendar className="h-3.5 w-3.5" />
        {current}
        <ChevronDown className={`h-3.5 w-3.5 transition ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div role="menu" aria-label="选择时间范围" className="absolute right-0 top-full z-30 mt-2 w-64 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-3 shadow-lg">
          <p className="px-1 pb-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">快捷区间</p>
          <div className="grid grid-cols-3 gap-1.5">
            {RANGES.map((r) => (
              <button
                key={r.id}
                type="button"
                role="menuitemradio"
                aria-checked={value === r.id}
                onClick={() => { onChange(r.id); setOpen(false); }}
                className={`rounded-lg px-2 py-2 text-xs font-semibold transition ${value === r.id ? 'bg-[var(--brand-light)] text-[var(--brand)]' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'}`}
              >
                {r.label}
              </button>
            ))}
          </div>
          <div className="my-3 h-px bg-[var(--border)]" />
          <p className="px-1 pb-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">自定义区间</p>
          <div className="grid grid-cols-2 gap-2">
            <label className="block">
              <span className="text-[10px] text-[var(--text-muted)]">开始</span>
              <input type="date" defaultValue="2026-09-01" className="mt-1 h-9 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-1)] px-2 text-xs outline-none focus:border-[var(--brand)]" />
            </label>
            <label className="block">
              <span className="text-[10px] text-[var(--text-muted)]">结束</span>
              <input type="date" defaultValue="2026-09-28" className="mt-1 h-9 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-1)] px-2 text-xs outline-none focus:border-[var(--brand)]" />
            </label>
          </div>
          <button
            type="button"
            onClick={() => { onChange('7d'); setOpen(false); }}
            className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-[var(--brand)] px-3 py-2 text-xs font-semibold text-white hover:opacity-90"
          >
            <CheckCircle2 className="h-3.5 w-3.5" />应用区间
          </button>
        </div>
      )}
    </div>
  );
}