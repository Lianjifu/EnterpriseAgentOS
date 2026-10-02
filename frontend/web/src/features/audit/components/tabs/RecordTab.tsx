/**
 * RecordTab — 完整审计记录(扁平列表)。
 */
import type { AuditEntry } from '../../schema';
import { AuditCard } from '../AuditCard';

interface RecordTabProps {
  entries: AuditEntry[];
  selectedIds: string[];
  onToggleSelect: (id: string) => void;
  onToggleStar: (id: string) => void;
  onSelect: (entry: AuditEntry) => void;
}

export function RecordTab({ entries, selectedIds, onToggleSelect, onToggleStar, onSelect }: RecordTabProps) {
  return (
    <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-5">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-rose-700 dark:text-rose-300">调用记录</p>
      <h3 className="mt-2 text-lg font-semibold">完整审计记录</h3>
      <p className="mt-1 text-xs text-[var(--text-muted)]">{entries.length} 条 · 支持按类型 / 级别 / 结果筛选</p>
      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {entries.map((e) => (
          <AuditCard
            key={e.id}
            entry={e}
            selected={selectedIds.includes(e.id)}
            onToggleSelect={onToggleSelect}
            onSelect={onSelect}
            onToggleStar={onToggleStar}
            onExportOne={() => {}}
            onResolve={() => {}}
          />
        ))}
      </div>
    </section>
  );
}