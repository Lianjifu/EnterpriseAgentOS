/**
 * TimeRangeDropdown — AdminMemory 自定义时间范围下拉(快捷 + 自定义)。
 */
import { useEffect, useRef, useState } from 'react';
import { Calendar, CheckCircle2, ChevronDown } from 'lucide-react';
import type { MemoryRange } from '@/api/admin/memory/schema';
import { RANGES, RANGE_LABEL } from './constants';

export function TimeRangeDropdown({ value, onChange }: { value: MemoryRange; onChange: (next: MemoryRange) => void }) {
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
  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="inline-flex h-9 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:border-blue-400 hover:text-blue-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
      >
        <Calendar className="h-3.5 w-3.5" />
        {RANGE_LABEL[value]}
        <ChevronDown className={`h-3.5 w-3.5 transition ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div role="menu" aria-label="选择时间范围" className="absolute right-0 top-full z-30 mt-2 w-64 overflow-hidden rounded-2xl border border-slate-200 bg-white p-3 shadow-lg dark:border-slate-700 dark:bg-slate-900">
          <p className="px-1 pb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">快捷区间</p>
          <div className="grid grid-cols-3 gap-1.5">
            {RANGES.map((item) => (
              <button
                key={item}
                type="button"
                role="menuitemradio"
                aria-checked={value === item}
                onClick={() => { onChange(item); setOpen(false); }}
                className={`rounded-lg px-2 py-2 text-xs font-semibold transition ${value === item ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'}`}
              >
                {RANGE_LABEL[item]}
              </button>
            ))}
          </div>
          <div className="my-3 h-px bg-slate-200 dark:bg-slate-700" />
          <p className="px-1 pb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">自定义区间</p>
          <div className="grid grid-cols-2 gap-2">
            <label className="block">
              <span className="text-[10px] text-slate-500 dark:text-slate-400">开始</span>
              <input type="date" defaultValue="2026-09-01" className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-white px-2 text-xs outline-none focus:border-blue-400 dark:border-slate-700 dark:bg-slate-900" />
            </label>
            <label className="block">
              <span className="text-[10px] text-slate-500 dark:text-slate-400">结束</span>
              <input type="date" defaultValue="2026-09-28" className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-white px-2 text-xs outline-none focus:border-blue-400 dark:border-slate-700 dark:bg-slate-900" />
            </label>
          </div>
          <button
            type="button"
            onClick={() => { onChange('7d'); setOpen(false); }}
            className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700"
          >
            <CheckCircle2 className="h-3.5 w-3.5" />应用区间
          </button>
        </div>
      )}
    </div>
  );
}