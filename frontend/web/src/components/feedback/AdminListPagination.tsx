/**
 * 管理端主列表分页：默认每页 10 条，嵌在列表卡片底部。
 */
import { ChevronLeft, ChevronRight } from 'lucide-react';

export const ADMIN_LIST_PAGE_SIZE = 10;

export function paginateItems<T>(items: T[], page: number, pageSize = ADMIN_LIST_PAGE_SIZE) {
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize) || 1);
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * pageSize;
  const slice = items.slice(start, start + pageSize);
  return {
    slice,
    total,
    totalPages,
    safePage,
    pageStart: total === 0 ? 0 : start + 1,
    pageEnd: Math.min(start + slice.length, total),
  };
}

export function AdminListPagination({
  page,
  totalPages,
  total,
  pageStart,
  pageEnd,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  total: number;
  pageStart: number;
  pageEnd: number;
  onPageChange: (next: number) => void;
}) {
  if (total === 0) return null;
  const safePage = Math.min(page, totalPages);
  return (
    <nav aria-label="分页" className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--border)] px-5 py-3 text-xs">
      <p className="text-[var(--text-muted)]">
        第 <span className="font-semibold tabular-nums text-[var(--text-secondary)]">{pageStart}-{pageEnd}</span> 条 / 共 <span className="font-semibold tabular-nums text-[var(--text-secondary)]">{total}</span> 条
        <span className="ml-2">每页 {ADMIN_LIST_PAGE_SIZE} 条</span>
      </p>
      {totalPages > 1 ? (
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
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => {
            const active = n === safePage;
            return (
              <button
                key={n}
                type="button"
                onClick={() => onPageChange(n)}
                aria-current={active ? 'page' : undefined}
                aria-label={`第 ${n} 页`}
                className={`hidden h-7 w-7 place-items-center rounded-lg text-[11px] font-semibold transition sm:grid ${active ? 'bg-[var(--brand)] text-white' : 'border border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--brand)] hover:text-[var(--brand)]'}`}
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
      ) : null}
    </nav>
  );
}
