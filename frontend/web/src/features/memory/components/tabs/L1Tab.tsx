/**
 * L1Tab — 短期记忆(会话缓冲列表 + 筛选 + 全部 flush)。
 *
 * 卡片布局:外层 rounded-2xl + 顶部 header(border-b) + 表格 + 底部分页(border-t 内联)。
 * 与 /admin/workflows 列表卡片结构对齐。
 *
 * 筛选上游由 MemoryPage 处理;本组件只负责渲染。
 */
import type { L1Session, L1Status } from '../../schema';
import { L1Row } from '../Cards';
import { InlinePagination } from '../InlinePagination';
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
      <div className="overflow-x-auto">
        <table className="w-full min-w-[920px] text-xs">
          <thead className="bg-[var(--bg-app)] text-[var(--text-muted)]">
            <tr>
              <th className="px-4 py-3 text-left font-semibold">会话</th>
              <th className="px-4 py-3 text-left font-semibold">用户</th>
              <th className="px-4 py-3 text-left font-semibold">智能体</th>
              <th className="px-4 py-3 text-right font-semibold">缓冲</th>
              <th className="px-4 py-3 text-right font-semibold">Tokens</th>
              <th className="px-4 py-3 text-left font-semibold w-[180px]">TTL</th>
              <th className="px-4 py-3 text-left font-semibold">状态</th>
              <th className="px-4 py-3 text-left font-semibold">最近 flush</th>
              <th className="px-4 py-3 text-right font-semibold">操作</th>
            </tr>
          </thead>
          <tbody>
            {sessions.map((s) => (
              <L1Row key={s.id} session={s} onFlush={() => onFlushOne(s.id)} onOpen={() => onOpen(s)} />
            ))}
          </tbody>
        </table>
        {sessions.length === 0 && (
          <p className="px-4 py-12 text-center text-xs text-[var(--text-muted)]">没有匹配的会话,试试调整筛选条件。</p>
        )}
      </div>
      {pagination && <InlinePagination {...pagination} />}
    </section>
  );
}