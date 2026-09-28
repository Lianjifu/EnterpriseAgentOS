/**
 * L2Tab — 长期记忆(批量选择 + 卡片网格 + 筛选)。
 */
import { ArrowUpRight, CheckCircle2, Search } from 'lucide-react';
import type { L2Category, L2Fact } from '@/api/admin/memory/schema';
import { L2Card } from '../Cards';

export function L2Tab({ facts, users, selectedIds, onToggleSelect, onOpen, onPromote, onConfirm, onClearSelect, onPromoteSelected }: {
  facts: L2Fact[];
  users: string[];
  selectedIds: string[];
  onToggleSelect: (id: string) => void;
  onOpen: (f: L2Fact) => void;
  onPromote: (id: string) => void;
  onConfirm: (id: string) => void;
  onClearSelect: () => void;
  onPromoteSelected: () => void;
}) {
  return (
    <section className="space-y-4">
      {selectedIds.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-blue-500 bg-blue-50 px-4 py-3 dark:bg-blue-900/20">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 dark:text-blue-300"><CheckCircle2 className="h-4 w-4" />已选 {selectedIds.length} 项</span>
          <button type="button" onClick={onPromoteSelected} className="inline-flex items-center gap-1.5 rounded-xl border border-blue-500 bg-white px-3 py-1.5 text-xs font-semibold hover:bg-blue-600 hover:text-white dark:bg-slate-900">
            <ArrowUpRight className="h-3.5 w-3.5" />批量晋升到 L3
          </button>
          <button type="button" onClick={onClearSelect} className="ml-auto text-xs font-semibold text-slate-500 hover:text-blue-700">取消选择</button>
        </div>
      )}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 sm:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex flex-1 flex-wrap items-center gap-2">
            <div className="relative min-w-[200px] flex-1 sm:max-w-[300px]">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input placeholder="搜索 key / value" className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm outline-none focus:border-blue-400 dark:border-slate-700 dark:bg-slate-900" />
            </div>
            <select className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium outline-none focus:border-blue-400 dark:border-slate-700 dark:bg-slate-900">
              <option value="all">全部类别</option>
              {(['preference', 'fact', 'style', 'context'] as L2Category[]).map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <select className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium outline-none focus:border-blue-400 dark:border-slate-700 dark:bg-slate-900">
              <option>全部用户</option>
              {users.map((u) => <option key={u}>{u}</option>)}
            </select>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">{facts.length} 条事实</p>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
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
        {facts.length === 0 && <p className="md:col-span-2 xl:col-span-3 rounded-2xl border border-dashed border-slate-300 p-12 text-center text-xs text-slate-500 dark:border-slate-700">没有匹配的事实,试试调整筛选条件。</p>}
      </div>
    </section>
  );
}