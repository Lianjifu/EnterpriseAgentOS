/**
 * InlinePagination — AdminMemory 通用分页行(border-t divider,无外卡片)。
 *
 * 供 L1Tab / L2Tab / L3Tab 在统一外层卡片内部作为底部分页使用,
 * 样式与 /admin/workflows 列表底部对齐。
 *
 * totalPages ≤ 1 不渲染(数据不够时占位都省)。
 */
import { ChevronLeft, ChevronRight } from 'lucide-react';

export function InlinePagination({ page, totalPages, total, pageStart, pageEnd, onPageChange }: {
  page: number;
  totalPages: number;
  total: number;
  pageStart: number;
  pageEnd: number;
  onPageChange: (next: number) => void;
}) {
  if (totalPages <= 1) return null;
  const safePage = Math.min(page, totalPages);
  const pageNumbers = Array.from({ length: totalPages }, (_, i) => i + 1);
  return (
    <div className="flex items-center justify-between border-t border-[var(--border)] px-5 py-3 text-xs">
      <p className="text-[var(--text-muted)]">
        第 <span className="font-semibold tabular-nums text-[var(--text-secondary)]">{pageStart}</span>-
        <span className="font-semibold tabular-nums text-[var(--text-secondary)]">{pageEnd}</span> 个 / 共
        <span className="font-semibold tabular-nums text-[var(--text-secondary)]">{total}</span> 个
      </p>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onPageChange(Math.max(1, safePage - 1))}
          disabled={safePage <= 1}
          aria-label="上一页"
          className="inline-flex items-center gap-1 rounded-lg border border-[var(--border)] px-2.5 py-1 text-[11px] font-semibold text-[var(--text-secondary)] hover:border-[var(--brand)] hover:text-[var(--brand)] disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronLeft className="h-3 w-3" />上一页
        </button>
        {pageNumbers.map((n) => {
          const active = n === safePage;
          return (
            <button
              key={n}
              type="button"
              onClick={() => onPageChange(n)}
              aria-current={active ? 'page' : undefined}
              aria-label={`第 ${n} 页`}
              className={`grid h-7 w-7 place-items-center rounded-lg text-[11px] font-semibold transition ${active ? 'bg-[var(--brand)] text-white' : 'border border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--brand)] hover:text-[var(--brand)]'}`}
            >
              {n}
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => onPageChange(Math.min(totalPages, safePage + 1))}
          disabled={safePage >= totalPages}
          aria-label="下一页"
          className="inline-flex items-center gap-1 rounded-lg border border-[var(--border)] px-2.5 py-1 text-[11px] font-semibold text-[var(--text-secondary)] hover:border-[var(--brand)] hover:text-[var(--brand)] disabled:cursor-not-allowed disabled:opacity-40"
        >
          下一页<ChevronRight className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}