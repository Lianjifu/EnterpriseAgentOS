/**
 * L3Tab — 团队级知识记忆(卡片网格 + 筛选 + 新建)。
 */
import { Plus, Search } from 'lucide-react';
import type { L3Entry, L3Status } from '@/api/admin/memory/schema';
import { L3Card } from '../Cards';

export function L3Tab({ entries, teams, onOpen, onRetire, onPublish }: {
  entries: L3Entry[];
  teams: string[];
  onOpen: (e: L3Entry) => void;
  onRetire: (id: string) => void;
  onPublish: (id: string) => void;
}) {
  return (
    <section className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 sm:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex flex-1 flex-wrap items-center gap-2">
            <div className="relative min-w-[200px] flex-1 sm:max-w-[300px]">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input placeholder="搜索标题 / 摘要 / 类别" className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm outline-none focus:border-blue-400 dark:border-slate-700 dark:bg-slate-900" />
            </div>
            <select className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium outline-none focus:border-blue-400 dark:border-slate-700 dark:bg-slate-900">
              <option>全部团队</option>
              {teams.map((t) => <option key={t}>{t}</option>)}
            </select>
            <select className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium outline-none focus:border-blue-400 dark:border-slate-700 dark:bg-slate-900">
              <option value="all">全部状态</option>
              {(['draft', 'published', 'retired'] as L3Status[]).map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <button type="button" className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700">
            <Plus className="h-4 w-4" />新建知识
          </button>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {entries.map((k) => (
          <L3Card key={k.id} entry={k} onOpen={() => onOpen(k)} onRetire={() => onRetire(k.id)} onPublish={() => onPublish(k.id)} />
        ))}
        {entries.length === 0 && <p className="md:col-span-2 xl:col-span-3 rounded-2xl border border-dashed border-slate-300 p-12 text-center text-xs text-slate-500 dark:border-slate-700">没有匹配的知识条目,试试调整筛选条件。</p>}
      </div>
    </section>
  );
}