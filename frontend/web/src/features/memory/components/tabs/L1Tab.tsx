/**
 * L1Tab — 短期记忆会话列表。
 */
import { AdminListPagination } from '@/components/feedback/AdminListPagination';
import { AdminListHeader, AdminListHeaderMetrics } from '@/components/feedback/AdminListRow';
import type { L1Session, L1Status } from '../../schema';
import { L1Row } from '../Cards';
import { ListToolbar } from '../ListToolbar';
import { L1_STATUS_BADGE } from '../constants';

export function L1Tab({
  sessions, query, onQuery, status, onStatus, onFlushAll, onFlushOne, onOpen, pagination,
}: {
  sessions: L1Session[];
  query: string;
  onQuery: (next: string) => void;
  status: 'all' | L1Status;
  onStatus: (next: 'all' | L1Status) => void;
  onFlushAll: () => void;
  onFlushOne: (id: string) => void;
  onOpen: (s: L1Session) => void;
  pagination?: { page: number; totalPages: number; total: number; pageStart: number; pageEnd: number; onPageChange: (next: number) => void };
}) {
  return (
    <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)]">
      <ListToolbar
        search={query}
        onSearch={onQuery}
        searchLabel="搜索会话"
        placeholder="搜索用户 / 智能体"
        countLabel={`${pagination?.total ?? sessions.length} 条`}
        filters={[{
          label: '状态',
          value: status,
          onChange: (value) => onStatus(value as 'all' | L1Status),
          options: [
            { value: 'all', label: '全部状态' },
            ...(Object.keys(L1_STATUS_BADGE) as L1Status[]).map((id) => ({ value: id, label: L1_STATUS_BADGE[id].label })),
          ],
        }]}
        action={{ label: '全部 flush', onClick: onFlushAll, tone: 'danger' }}
      />
      <AdminListHeader
        hasCheckbox={false}
        hasStar={false}
        metrics={<AdminListHeaderMetrics labels={['缓冲', 'Tokens', 'TTL', '最近 flush']} />}
      />
      <div className="divide-y divide-[var(--border)]">
        {sessions.map((s) => (
          <L1Row key={s.id} session={s} onFlush={() => onFlushOne(s.id)} onOpen={() => onOpen(s)} />
        ))}
        {sessions.length === 0 && (
          <p className="px-5 py-12 text-center text-xs text-[var(--text-muted)]">没有匹配的会话,试试调整筛选条件。</p>
        )}
      </div>
      {pagination && <AdminListPagination {...pagination} />}
    </section>
  );
}
