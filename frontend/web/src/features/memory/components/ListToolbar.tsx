/**
 * 记忆列表工具栏，布局与知识管理一致：搜索铺开，过滤、数量和操作靠右。
 */
import { Plus, Search, Trash2 } from 'lucide-react';

export function ListToolbar({
  search,
  onSearch,
  searchLabel,
  placeholder,
  filters,
  countLabel,
  action,
}: {
  search: string;
  onSearch: (value: string) => void;
  searchLabel: string;
  placeholder: string;
  filters: { label: string; value: string; onChange: (value: string) => void; options: { value: string; label: string }[] }[];
  countLabel: string;
  action?: { label: string; onClick: () => void; tone?: 'brand' | 'danger' };
}) {
  return (
    <div className="flex flex-col gap-2 border-b border-[var(--border)] px-4 py-3 sm:flex-row sm:items-center sm:px-5">
      <label className="relative min-w-0 flex-1">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--text-muted)]" />
        <input
          aria-label={searchLabel}
          value={search}
          onChange={(event) => onSearch(event.target.value)}
          placeholder={placeholder}
          className="h-9 w-full rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] pl-8 pr-3 text-sm outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--brand)]"
        />
      </label>
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        {filters.map((filter) => (
          <select
            key={filter.label}
            aria-label={filter.label}
            value={filter.value}
            onChange={(event) => filter.onChange(event.target.value)}
            className="h-9 rounded-lg border border-[var(--border)] bg-[var(--surface-1)] px-2.5 text-xs outline-none focus:border-[var(--brand)]"
          >
            {filter.options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        ))}
        <span className="text-xs tabular-nums text-[var(--text-muted)]">{countLabel}</span>
        {action ? (
          <button
            type="button"
            onClick={action.onClick}
            className={action.tone === 'danger'
              ? 'inline-flex h-9 items-center gap-1.5 rounded-lg border border-[var(--border)] px-3 text-xs font-semibold text-[var(--text-secondary)] hover:border-[var(--danger)] hover:text-[var(--danger)]'
              : 'inline-flex h-9 items-center gap-1.5 rounded-lg bg-[var(--brand)] px-3 text-xs font-semibold text-white hover:bg-[var(--brand-hover)]'}
          >
            {action.tone === 'danger' ? <Trash2 className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
            {action.label}
          </button>
        ) : null}
      </div>
    </div>
  );
}
