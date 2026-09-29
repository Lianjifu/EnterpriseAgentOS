/**
 * L1Tab — 短期记忆(会话缓冲列表 + 筛选 + 全部 flush)。
 *
 * 卡片布局:外层 rounded-2xl + 顶部 header(border-b) + 表格 + 底部分页(border-t 内联)。
 * 与 /admin/workflows 列表卡片结构对齐。
 *
 * 筛选上游由 MemoryPage 处理;本组件只负责渲染。
 */
import { Trash2 } from 'lucide-react';
import type { L1Session } from '@/api/admin/memory/schema';
import { L1Row } from '../Cards';
import { InlinePagination } from '../InlinePagination';

export function L1Tab({ sessions, onFlushAll, onFlushOne, onOpen, pagination }: {
  sessions: L1Session[];
  onFlushAll: () => void;
  onFlushOne: (id: string) => void;
  onOpen: (s: L1Session) => void;
  pagination?: { page: number; totalPages: number; total: number; pageStart: number; pageEnd: number; onPageChange: (next: number) => void };
}) {
  return (
    <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] px-5 py-4">
        <p className="text-xs text-[var(--text-muted)]">{sessions.length} 条会话 · 过滤后</p>
        <button type="button" onClick={onFlushAll} className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] px-3 py-2 text-xs font-semibold hover:border-[var(--danger)] hover:text-[var(--danger)]">
          <Trash2 className="h-4 w-4" />全部 flush
        </button>
      </div>
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