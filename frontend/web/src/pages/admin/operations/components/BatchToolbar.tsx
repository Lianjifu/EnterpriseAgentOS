/**
 * BatchToolbar — 会话选中条数 + 批量导出 / 批量标记已解决 / 取消。
 */
import { CheckCircle2, FileText, ShieldCheck, X } from 'lucide-react';

export function BatchToolbar({
  count,
  onClear,
  onBatchExport,
  onBatchResolve,
}: {
  count: number;
  onClear: () => void;
  onBatchExport: () => void;
  onBatchResolve: () => void;
}) {
  return (
    <section
      aria-label="批量操作"
      className="flex flex-wrap items-center gap-3 rounded-2xl border border-[var(--brand)] bg-[var(--brand-light)] px-4 py-3 sm:px-5"
    >
      <div className="flex items-center gap-2 text-sm font-semibold text-[var(--brand)]">
        <CheckCircle2 className="h-4 w-4" />
        已选 {count} 项
      </div>
      <div className="ml-auto flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onBatchResolve}
          className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--brand)] bg-[var(--surface-1)] px-3 py-1.5 text-[11px] font-semibold text-[var(--brand)] hover:bg-[var(--brand-light)]"
        >
          <ShieldCheck className="h-3.5 w-3.5" />
          批量标记已解决
        </button>
        <button
          type="button"
          onClick={onBatchExport}
          className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface-1)] px-3 py-1.5 text-[11px] font-semibold hover:border-[var(--brand)]"
        >
          <FileText className="h-3.5 w-3.5" />
          批量导出
        </button>
        <button
          type="button"
          onClick={onClear}
          className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-semibold text-[var(--text-muted)] hover:text-[var(--brand)]"
        >
          <X className="h-3.5 w-3.5" />
          取消选择
        </button>
      </div>
    </section>
  );
}