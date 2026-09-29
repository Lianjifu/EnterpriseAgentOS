/**
 * L1Tab — 短期记忆(会话缓冲列表 + 筛选 + 全部 flush)。
 *
 * 卡片布局:外层 rounded-2xl + 顶部 header(border-b) + 表格 + 底部分页(border-t 内联)。
 * 与 /admin/workflows 列表卡片结构对齐。
 *
 * 筛选上游由 MemoryPage 处理;本组件只负责渲染。
 */
import { ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';
import type { L1Session } from '@/api/admin/memory/schema';
import { L1Row } from '../Cards';

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
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-[var(--border)] px-5 py-3 text-xs">
          <p className="text-[var(--text-muted)]">
            第 <span className="font-semibold tabular-nums text-[var(--text-secondary)]">{pagination.pageStart}</span>-
            <span className="font-semibold tabular-nums text-[var(--text-secondary)]">{pagination.pageEnd}</span> 个 / 共
            <span className="font-semibold tabular-nums text-[var(--text-secondary)]">{pagination.total}</span> 个
          </p>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => pagination.onPageChange(Math.max(1, pagination.page - 1))}
              disabled={pagination.page <= 1}
              aria-label="上一页"
              className="inline-flex items-center gap-1 rounded-lg border border-[var(--border)] px-2.5 py-1 text-[11px] font-semibold text-[var(--text-secondary)] hover:border-[var(--brand)] hover:text-[var(--brand)] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft className="h-3 w-3" />上一页
            </button>
            {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((n) => {
              const active = n === pagination.page;
              return (
                <button
                  key={n}
                  type="button"
                  onClick={() => pagination.onPageChange(n)}
                  aria-current={active ? 'page' : undefined}
                  aria-label={`第 ${n} 页`}
                  className={`grid h-7 w-7 place-items-center rounded-lg text-[11px] font-semibold transition ${active ? 'bg-[var(--brand)] text-white' : 'border border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--brand)] hover:text-[var(--brand)]'}`}
                >
                  {n}
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => pagination.onPageChange(Math.min(pagination.totalPages, pagination.page + 1))}
              disabled={pagination.page >= pagination.totalPages}
              aria-label="下一页"
              className="inline-flex items-center gap-1 rounded-lg border border-[var(--border)] px-2.5 py-1 text-[11px] font-semibold text-[var(--text-secondary)] hover:border-[var(--brand)] hover:text-[var(--brand)] disabled:cursor-not-allowed disabled:opacity-40"
            >
              下一页<ChevronRight className="h-3 w-3" />
            </button>
          </div>
        </div>
      )}
    </section>
  );
}