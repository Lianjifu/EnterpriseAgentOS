/**
 * L2Tab — 长期记忆(批量选择 + 卡片网格 + 筛选)。
 *
 * 卡片布局:外层 rounded-2xl + 顶部筛选 header(border-b) + 卡片网格 + 底部分页(border-t 内联)。
 * 选中态 toolbar 仍作为 sticky 顶部条独立在外。
 * 与 /admin/workflows 列表卡片结构对齐。
 */
import { ArrowUpRight, CheckCircle2 } from 'lucide-react';
import type { L2Category, L2Fact } from '@/api/admin/memory/schema';
import { L2_CATEGORY_LABEL } from '../constants';
import { L2Card } from '../Cards';
import { InlinePagination } from '../InlinePagination';

export function L2Tab({
  facts, users, selectedIds,
  category, onCategory,
  userFilter, onUserFilter,
  query, onQuery,
  onToggleSelect, onOpen, onPromote, onConfirm,
  onClearSelect, onPromoteSelected,
  pagination,
}: {
  facts: L2Fact[];
  users: string[];
  selectedIds: string[];
  category: 'all' | L2Category;
  onCategory: (next: 'all' | L2Category) => void;
  userFilter: string;
  onUserFilter: (next: string) => void;
  query: string;
  onQuery: (next: string) => void;
  onToggleSelect: (id: string) => void;
  onOpen: (f: L2Fact) => void;
  onPromote: (id: string) => void;
  onConfirm: (id: string) => void;
  onClearSelect: () => void;
  onPromoteSelected: () => void;
  pagination?: { page: number; totalPages: number; total: number; pageStart: number; pageEnd: number; onPageChange: (next: number) => void };
}) {
  return (
    <section className="space-y-4">
      {selectedIds.length > 0 && (
        <div className="sticky top-0 z-10 flex flex-wrap items-center gap-3 rounded-2xl border border-[var(--brand)] bg-[var(--brand-light)] px-4 py-3">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--brand)]">
            <CheckCircle2 className="h-4 w-4" />已选 {selectedIds.length} 项
          </span>
          <button type="button" onClick={onPromoteSelected} className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--brand)] bg-[var(--surface-1)] px-3 py-1.5 text-xs font-semibold text-[var(--brand)] hover:bg-[var(--brand)] hover:text-white">
            <ArrowUpRight className="h-3.5 w-3.5" />批量晋升到知识
          </button>
          <button type="button" onClick={onClearSelect} className="ml-auto text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--brand)]">
            取消选择
          </button>
        </div>
      )}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)]">
        <div className="flex flex-col gap-3 border-b border-[var(--border)] px-5 py-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex flex-1 flex-wrap items-center gap-2">
            <input
              value={query}
              onChange={(e) => onQuery(e.target.value)}
              placeholder="搜索 key / value"
              className="h-10 w-full min-w-[200px] flex-1 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] px-3 text-sm outline-none focus:border-[var(--brand)] sm:max-w-[300px]"
            />
            <select
              value={category}
              onChange={(e) => onCategory(e.target.value as 'all' | L2Category)}
              className="h-10 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] px-3 text-xs font-medium outline-none focus:border-[var(--brand)]"
            >
              <option value="all">全部类别</option>
              {(['preference', 'fact', 'style', 'context'] as L2Category[]).map((c) => (
                <option key={c} value={c}>{L2_CATEGORY_LABEL[c]}</option>
              ))}
            </select>
            <select
              value={userFilter}
              onChange={(e) => onUserFilter(e.target.value)}
              className="h-10 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] px-3 text-xs font-medium outline-none focus:border-[var(--brand)]"
            >
              <option value="all">全部用户</option>
              {users.map((u) => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
          </div>
          <p className="text-[11px] text-[var(--text-muted)]">{facts.length} 条事实 · 过滤后</p>
        </div>
        <div className="grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-3">
          {facts.map((f) => (
            <L2Card
              key={f.id}
              fact={f}
              onOpen={() => onOpen(f)}
              onPromote={() => onPromote(f.id)}
              onConfirm={() => onConfirm(f.id)}
              selected={selectedIds.includes(f.id)}
              onToggle={() => onToggleSelect(f.id)}
            />
          ))}
          {facts.length === 0 && (
            <p className="md:col-span-2 xl:col-span-3 rounded-2xl border border-dashed border-[var(--border)] p-12 text-center text-xs text-[var(--text-muted)]">
              没有匹配的事实,试试调整筛选条件。
            </p>
          )}
        </div>
        {pagination && <InlinePagination {...pagination} />}
      </div>
    </section>
  );
}