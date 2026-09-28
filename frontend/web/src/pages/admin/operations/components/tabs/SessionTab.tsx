/**
 * SessionTab — 全部会话的扁平列表(共享 OverviewTab 的搜索框语义但去掉 KPI 卡片)。
 */
import type { Session } from '@/api/admin/operations/schema';
import { SessionCard } from '../SessionCard';

export function SessionTab({
  sessions,
  selectedIds,
  onToggleSelect,
  onToggleStar,
  onSelect,
}: {
  sessions: Session[];
  selectedIds: string[];
  onToggleSelect: (id: string) => void;
  onToggleStar: (id: string) => void;
  onSelect: (s: Session) => void;
}) {
  return (
    <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-5">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-700 dark:text-sky-300">会话列表</p>
      <h3 className="mt-2 text-lg font-semibold">所有会话</h3>
      <p className="mt-1 text-xs text-[var(--text-muted)]">{sessions.length} 个会话</p>
      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {sessions.map((s) => (
          <SessionCard
            key={s.id}
            session={s}
            selected={selectedIds.includes(s.id)}
            onToggleSelect={onToggleSelect}
            onSelect={onSelect}
            onToggleStar={onToggleStar}
          />
        ))}
      </div>
    </section>
  );
}