/**
 * L3Tab — 团队级知识记忆(卡片网格 + 筛选 + 新建)。
 */
import { Plus } from 'lucide-react';
import type { L3Entry, L3Status } from '@/api/admin/memory/schema';
import { L3_STATUS_BADGE } from '../constants';
import { L3Card } from '../Cards';
import { PaginationBar } from '../PaginationBar';

export function L3Tab({
  entries, teams,
  query, onQuery,
  teamFilter, onTeamFilter,
  statusFilter, onStatusFilter,
  onOpen, onRetire, onPublish,
  onCreate,
  pagination,
}: {
  entries: L3Entry[];
  teams: string[];
  query: string;
  onQuery: (next: string) => void;
  teamFilter: string;
  onTeamFilter: (next: string) => void;
  statusFilter: 'all' | L3Status;
  onStatusFilter: (next: 'all' | L3Status) => void;
  onOpen: (e: L3Entry) => void;
  onRetire: (id: string) => void;
  onPublish: (id: string) => void;
  onCreate: () => void;
  pagination?: { page: number; totalPages: number; total: number; pageStart: number; pageEnd: number; onPageChange: (next: number) => void };
}) {
  return (
    <section className="space-y-4">
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-4 sm:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex flex-1 flex-wrap items-center gap-2">
            <input
              value={query}
              onChange={(e) => onQuery(e.target.value)}
              placeholder="搜索标题 / 摘要 / 类别"
              className="h-10 w-full min-w-[200px] flex-1 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] px-3 text-sm outline-none focus:border-[var(--brand)] sm:max-w-[300px]"
            />
            <select
              value={teamFilter}
              onChange={(e) => onTeamFilter(e.target.value)}
              className="h-10 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] px-3 text-xs font-medium outline-none focus:border-[var(--brand)]"
            >
              <option value="all">全部团队</option>
              {teams.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(e) => onStatusFilter(e.target.value as 'all' | L3Status)}
              className="h-10 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] px-3 text-xs font-medium outline-none focus:border-[var(--brand)]"
            >
              <option value="all">全部状态</option>
              {(['draft', 'published', 'retired'] as L3Status[]).map((s) => (
                <option key={s} value={s}>{L3_STATUS_BADGE[s].label}</option>
              ))}
            </select>
          </div>
          <button
            type="button"
            onClick={onCreate}
            className="inline-flex items-center gap-2 rounded-xl bg-[var(--brand)] px-3 py-2 text-xs font-semibold text-white hover:opacity-90"
          >
            <Plus className="h-4 w-4" />新建知识
          </button>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {entries.map((k) => (
          <L3Card key={k.id} entry={k} onOpen={() => onOpen(k)} onRetire={() => onRetire(k.id)} onPublish={() => onPublish(k.id)} />
        ))}
        {entries.length === 0 && (
          <p className="md:col-span-2 xl:col-span-3 rounded-2xl border border-dashed border-[var(--border)] p-12 text-center text-xs text-[var(--text-muted)]">
            没有匹配的知识条目,试试调整筛选条件。
          </p>
        )}
      </div>
      {pagination && <PaginationBar {...pagination} />}
    </section>
  );
}