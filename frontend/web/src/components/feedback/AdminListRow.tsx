/**
 * 管理端主列表行对齐：固定列宽，不随标题长短漂移。
 *
 * xl：选择 28px | 名称+标签 弹性 | 收藏 28px | 指标 18rem | 操作 17.5rem
 */
import type { ReactNode } from 'react';

export const ADMIN_LIST_METRICS_W = 'xl:w-[18rem]';
export const ADMIN_LIST_ACTIONS_W = 'xl:w-[17.5rem]';

function rowCols(hasCheckbox: boolean, hasStar: boolean) {
  if (!hasCheckbox) return 'xl:grid-cols-[minmax(0,1fr)_18rem_17.5rem]';
  if (!hasStar) return 'xl:grid-cols-[1.75rem_minmax(0,1fr)_18rem_17.5rem]';
  return 'xl:grid-cols-[1.75rem_minmax(0,1fr)_1.75rem_18rem_17.5rem]';
}

export function AdminListRow({
  selected,
  hasStar = true,
  hasCheckbox = true,
  children,
}: {
  selected?: boolean;
  hasStar?: boolean;
  hasCheckbox?: boolean;
  children: ReactNode;
}) {
  return (
    <article
      className={`group relative grid grid-cols-1 items-center gap-x-3 gap-y-2 px-5 py-3.5 text-left ${rowCols(hasCheckbox, hasStar)} ${
        selected ? 'bg-[var(--brand-light)]/40' : 'hover:bg-[var(--bg-hover)]'
      }`}
    >
      {children}
    </article>
  );
}

export function AdminListIdentity({ children }: { children: ReactNode }) {
  return <div className="pointer-events-none relative z-10 min-w-0">{children}</div>;
}

export function AdminListMetrics({ cols = 4, children }: { cols?: 2 | 3 | 4; children: ReactNode }) {
  const grid = cols === 2 ? 'xl:grid-cols-2' : cols === 3 ? 'xl:grid-cols-3' : 'xl:grid-cols-4';
  return (
    <div className={`pointer-events-none relative z-10 hidden min-w-0 items-center gap-2 text-[11px] tabular-nums xl:grid ${grid} ${ADMIN_LIST_METRICS_W}`}>
      {children}
    </div>
  );
}

export function AdminListMetric({ children }: { children: ReactNode }) {
  return <span className="truncate text-right">{children}</span>;
}

export function AdminListActions({ children }: { children: ReactNode }) {
  return (
    <div className={`relative z-10 flex flex-wrap justify-start gap-1.5 xl:flex-nowrap xl:justify-end ${ADMIN_LIST_ACTIONS_W}`}>
      {children}
    </div>
  );
}

export const adminListActionBtn =
  'inline-flex shrink-0 items-center gap-1 rounded-lg border border-[var(--border)] px-2 py-1 text-[11px] font-semibold text-[var(--text-secondary)] hover:border-[var(--brand)] hover:text-[var(--brand)] disabled:cursor-default disabled:opacity-40';

export const adminListDangerBtn =
  'inline-flex shrink-0 items-center gap-1 rounded-lg border border-rose-200 px-2 py-1 text-[11px] font-semibold text-rose-600 hover:bg-rose-50 dark:border-rose-500/30 dark:text-rose-300';

export function AdminListHeader({
  hasStar = true,
  hasCheckbox = true,
  metrics,
  actions = '操作',
}: {
  hasStar?: boolean;
  hasCheckbox?: boolean;
  metrics: ReactNode;
  actions?: string;
}) {
  return (
    <div className={`hidden border-b border-[var(--border)] px-5 py-2.5 text-sm font-semibold text-[var(--text-secondary)] xl:grid xl:items-center xl:gap-x-3 ${rowCols(hasCheckbox, hasStar)}`}>
      {hasCheckbox ? <span aria-hidden="true" /> : null}
      <span>名称</span>
      {hasStar ? <span aria-hidden="true" /> : null}
      <div>{metrics}</div>
      <span className={`text-right ${ADMIN_LIST_ACTIONS_W}`}>{actions}</span>
    </div>
  );
}

export function AdminListHeaderMetrics({ labels }: { labels: string[] }) {
  const grid = labels.length <= 1 ? 'grid-cols-1' : labels.length === 2 ? 'grid-cols-2' : labels.length === 3 ? 'grid-cols-3' : 'grid-cols-4';
  return (
    <div className={`grid gap-2 ${grid} ${ADMIN_LIST_METRICS_W}`}>
      {labels.map((label) => (
        <span key={label} className="truncate text-right">{label}</span>
      ))}
    </div>
  );
}
