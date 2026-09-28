/**
 * BatchToolbar — 看板批量启停 / 删除。
 */
export function BatchToolbar({ count, onEnable, onDisable, onDelete }: {
  count: number; onEnable: () => void; onDisable: () => void; onDelete: () => void;
}) {
  if (count === 0) return null;
  return (
    <div className="flex items-center justify-between rounded-2xl border border-[var(--brand)] bg-[var(--brand-light)] px-4 py-2.5 text-sm">
      <span className="font-semibold text-[var(--brand)]">已选 {count} 项</span>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onEnable}
          className="rounded-lg border border-[var(--brand)] bg-[var(--surface-1)] px-3 py-1 text-xs font-semibold text-[var(--brand)] hover:bg-[var(--brand)] hover:text-white"
        >
          启用
        </button>
        <button
          type="button"
          onClick={onDisable}
          className="rounded-lg border border-[var(--border)] bg-[var(--surface-1)] px-3 py-1 text-xs font-semibold text-[var(--text-secondary)] hover:border-[var(--brand)] hover:text-[var(--brand)]"
        >
          停用
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="rounded-lg border border-rose-200 bg-[var(--surface-1)] px-3 py-1 text-xs font-semibold text-rose-700 hover:border-rose-300 hover:bg-rose-50"
        >
          删除
        </button>
      </div>
    </div>
  );
}