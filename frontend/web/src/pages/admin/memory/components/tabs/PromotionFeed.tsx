/**
 * PromotionFeed — 今日晋升事件(右侧栏)。
 */
import { ArrowUpRight, History } from 'lucide-react';
import type { PromotionEvent } from '@/api/admin/memory/schema';
import { toneClass } from '../constants';

export function PromotionFeed({ events }: { events: PromotionEvent[] }) {
  const visible = events.slice(0, 5);
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 sm:p-5">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-semibold">今日晋升事件</h4>
          <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">最近 5 条;系统自动入库与管理员发布</p>
        </div>
        <span className="inline-flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400"><History className="h-3.5 w-3.5" />实时</span>
      </div>
      <ul className="mt-3 space-y-1.5">
        {visible.map((event) => (
          <li key={event.id} className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/40">
            <span className={`mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-md ${event.layer === 'l1→l2' ? toneClass.warn : toneClass.brand}`}>
              <ArrowUpRight className="h-3.5 w-3.5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium leading-5">{event.label}</p>
              <p className="mt-0.5 text-[10px] text-slate-500 dark:text-slate-400">{event.operator}</p>
            </div>
            <span className="shrink-0 text-[10px] text-slate-500 dark:text-slate-400">{event.at}</span>
          </li>
        ))}
      </ul>
      {events.length > visible.length && (
        <p className="mt-3 text-center text-[11px] text-slate-500 dark:text-slate-400">还有 {events.length - visible.length} 条 · 前往 L1 / L2 / L3 Tab 查看完整时间线</p>
      )}
    </div>
  );
}