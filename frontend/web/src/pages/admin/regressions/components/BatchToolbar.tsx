/**
 * AdminRegressions — 批量操作工具栏。
 */
import { CheckCircle2, Search, Trash2, X } from 'lucide-react';

export function BatchToolbar({
  count, onClear, onBatchInvestigate, onBatchResolve, onBatchDelete,
}: {
  count: number;
  onClear: () => void;
  onBatchInvestigate: () => void;
  onBatchResolve: () => void;
  onBatchDelete: () => void;
}) {
  return (
    <section aria-label="批量操作" className="flex flex-wrap items-center gap-3 rounded-2xl border border-[var(--brand)] bg-[var(--brand-light)] px-4 py-3 sm:px-5">
      <div className="flex items-center gap-2 text-sm font-semibold text-[var(--brand)]">
        <CheckCircle2 className="h-4 w-4" />已选 {count} 项
      </div>
      <div className="ml-auto flex flex-wrap items-center gap-2">
        <button type="button" onClick={onBatchInvestigate} className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--brand)] bg-[var(--surface-1)] px-3 py-1.5 text-[11px] font-semibold text-[var(--brand)] hover:bg-[var(--brand-light)]">
          <Search className="h-3.5 w-3.5" />批量标记排查中
        </button>
        <button type="button" onClick={onBatchResolve} className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-[var(--surface-1)] px-3 py-1.5 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-50 dark:border-emerald-500/40 dark:text-emerald-300 dark:hover:bg-emerald-500/15">
          <CheckCircle2 className="h-3.5 w-3.5" />批量标记已解决
        </button>
        <button type="button" onClick={onBatchDelete} className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-[var(--surface-1)] px-3 py-1.5 text-[11px] font-semibold text-rose-600 hover:bg-rose-50 dark:border-rose-500/40 dark:text-rose-300 dark:hover:bg-rose-500/15">
          <Trash2 className="h-3.5 w-3.5" />批量删除
        </button>
        <button type="button" onClick={onClear} className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-semibold text-[var(--text-muted)] hover:text-[var(--brand)]">
          <X className="h-3.5 w-3.5" />取消选择
        </button>
      </div>
    </section>
  );
}