import { CheckCircle2, CheckSquare, Clock, Download, Trash2, X } from 'lucide-react';

interface BatchToolbarProps {
  count: number;
  onClear: () => void;
  onBatchPublish: () => void;
  onBatchRetire: () => void;
  onBatchDelete: () => void;
  onBatchExport: () => void;
}

export function BatchToolbar({
  count, onClear, onBatchPublish, onBatchRetire, onBatchDelete, onBatchExport,
}: BatchToolbarProps) {
  return (
    <section aria-label="批量操作" className="flex flex-wrap items-center gap-3 rounded-2xl border border-[var(--brand)] bg-[var(--brand-light)] px-4 py-3 sm:px-5">
      <div className="flex items-center gap-2 text-sm font-semibold text-[var(--brand)]">
        <CheckSquare className="h-4 w-4" />已选 {count} 项
      </div>
      <div className="ml-auto flex flex-wrap items-center gap-2">
        <button type="button" onClick={onBatchPublish} className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--brand)] bg-[var(--surface-1)] px-3 py-1.5 text-[11px] font-semibold text-[var(--brand)] hover:bg-[var(--brand-light)]">
          <CheckCircle2 className="h-3.5 w-3.5" />批量发布
        </button>
        <button type="button" onClick={onBatchRetire} className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface-1)] px-3 py-1.5 text-[11px] font-semibold text-[var(--text-secondary)] hover:border-[var(--brand)] hover:text-[var(--brand)]">
          <Clock className="h-3.5 w-3.5" />批量下线
        </button>
        <button type="button" onClick={onBatchExport} className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface-1)] px-3 py-1.5 text-[11px] font-semibold text-[var(--text-secondary)] hover:border-[var(--brand)] hover:text-[var(--brand)]">
          <Download className="h-3.5 w-3.5" />批量导出
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