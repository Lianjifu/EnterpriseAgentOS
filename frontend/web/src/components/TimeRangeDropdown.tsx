/**
 * 时间范围下拉。快捷档位和自定义起止共用这一套，
 * 记忆、知识、运营总览、运行指标、效果看板都走这里。
 */
import { useEffect, useRef, useState } from 'react';
import { Calendar, CheckCircle2, ChevronDown } from 'lucide-react';

export type TimeRangeOption<T extends string> = { id: T; label: string };

function isoLocal(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

function daysBefore(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return isoLocal(date);
}

function optionDays(id: string, label: string): number {
  if (id === '1h' || /1\s*小时/.test(label)) return 1 / 24;
  if (id === '6h' || /6\s*小时/.test(label)) return 6 / 24;
  if (id === '24h' || /24\s*小时/.test(label)) return 1;
  const matched = `${id} ${label}`.match(/(\d+)\s*天/);
  if (matched) return Number(matched[1]);
  if (label.includes('季度')) return 90;
  return 7;
}

function closestOption<T extends string>(options: readonly TimeRangeOption<T>[], days: number): T {
  let best = options[0].id;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const item of options) {
    const distance = Math.abs(Math.log(days / optionDays(item.id, item.label)));
    if (distance < bestDistance) {
      best = item.id;
      bestDistance = distance;
    }
  }
  return best;
}

function shortDate(value: string): string {
  const [, month, day] = value.split('-');
  return `${month}-${day}`;
}

export function TimeRangeDropdown<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (next: T) => void;
  options: readonly TimeRangeOption<T>[];
}) {
  const [open, setOpen] = useState(false);
  const [start, setStart] = useState(() => daysBefore(6));
  const [end, setEnd] = useState(() => isoLocal(new Date()));
  const [customLabel, setCustomLabel] = useState<string | null>(null);
  const [dateError, setDateError] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const preset = options.find((item) => item.id === value);
  const triggerLabel = customLabel ?? preset?.label ?? '';

  const pickPreset = (id: T) => {
    setCustomLabel(null);
    setDateError('');
    onChange(id);
    setOpen(false);
  };

  const applyCustom = () => {
    if (!start || !end || end < start) {
      setDateError('结束日期要晚于或等于开始日期');
      return;
    }
    const days = (Date.parse(`${end}T00:00:00`) - Date.parse(`${start}T00:00:00`)) / 86_400_000 + 1;
    setDateError('');
    setCustomLabel(`${shortDate(start)} – ${shortDate(end)}`);
    onChange(closestOption(options, Math.max(days, 1 / 24)));
    setOpen(false);
  };

  return (
    <div className="relative inline-flex" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] px-2.5 text-xs font-semibold text-[var(--text-secondary)] hover:border-[var(--brand)] hover:text-[var(--brand)]"
      >
        <Calendar className="h-3.5 w-3.5" />
        {triggerLabel}
        <ChevronDown className={`h-3.5 w-3.5 transition ${open ? 'rotate-180' : ''}`} />
      </button>
      {open ? (
        <div role="menu" aria-label="选择时间范围" className="absolute right-0 top-full z-30 mt-1.5 w-[16.5rem] rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-2.5 shadow-lg">
          <p className="px-1 pb-1.5 text-[11px] font-medium text-[var(--text-muted)]">快捷区间</p>
          <div className="grid grid-cols-2 gap-1">
            {options.map((item, index) => {
              const selected = !customLabel && value === item.id;
              const span = options.length % 2 === 1 && index === options.length - 1;
              return (
                <button
                  key={item.id}
                  type="button"
                  role="menuitemradio"
                  aria-checked={selected}
                  onClick={() => pickPreset(item.id)}
                  className={`h-8 rounded-lg px-2 text-xs font-semibold transition ${span ? 'col-span-2' : ''} ${selected ? 'bg-[var(--brand-light)] text-[var(--brand)]' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'}`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
          <div className="my-2 h-px bg-[var(--border)]" />
          <p className="px-1 pb-1.5 text-[11px] font-medium text-[var(--text-muted)]">自定义区间</p>
          <div className="grid grid-cols-2 gap-1.5">
            <label className="block">
              <span className="text-[10px] text-[var(--text-muted)]">开始</span>
              <input type="date" value={start} onChange={(event) => { setStart(event.target.value); setDateError(''); }} className="mt-1 h-8 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-1)] px-1.5 text-xs outline-none focus:border-[var(--brand)]" />
            </label>
            <label className="block">
              <span className="text-[10px] text-[var(--text-muted)]">结束</span>
              <input type="date" value={end} onChange={(event) => { setEnd(event.target.value); setDateError(''); }} className="mt-1 h-8 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-1)] px-1.5 text-xs outline-none focus:border-[var(--brand)]" />
            </label>
          </div>
          {dateError ? <p className="mt-1.5 px-1 text-[11px] text-[var(--danger)]">{dateError}</p> : null}
          <button
            type="button"
            onClick={applyCustom}
            className="mt-2 inline-flex h-8 w-full items-center justify-center gap-1.5 rounded-lg bg-[var(--brand)] px-3 text-xs font-semibold text-white hover:bg-[var(--brand-hover)]"
          >
            <CheckCircle2 className="h-3.5 w-3.5" />应用区间
          </button>
        </div>
      ) : null}
    </div>
  );
}
