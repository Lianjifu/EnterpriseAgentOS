/**
 * L1Tab — 短期记忆(会话缓冲列表 + 筛选 + 全部 flush)。
 */
import { Search, Trash2 } from 'lucide-react';
import type { L1Session, L1Status } from '@/api/admin/memory/schema';
import { L1Row } from '../Cards';

export function L1Tab({ sessions, query, onQuery, statusFilter, onStatusFilter, onFlushAll, onFlushOne, onOpen }: {
  sessions: L1Session[];
  query: string;
  onQuery: (next: string) => void;
  statusFilter: 'all' | L1Status;
  onStatusFilter: (next: 'all' | L1Status) => void;
  onFlushAll: () => void;
  onFlushOne: (id: string) => void;
  onOpen: (s: L1Session) => void;
}) {
  const text = query.trim().toLowerCase();
  const filtered = sessions.filter((s) => {
    if (statusFilter !== 'all' && s.status !== statusFilter) return false;
    if (text && !`${s.userName} ${s.agentName}`.toLowerCase().includes(text)) return false;
    return true;
  });
  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 sm:p-5">
        <div className="flex flex-1 flex-wrap items-center gap-2">
          <div className="relative min-w-[200px] flex-1 sm:max-w-[300px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input value={query} onChange={(e) => onQuery(e.target.value)} placeholder="搜索用户 / 智能体" className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm outline-none focus:border-blue-400 dark:border-slate-700 dark:bg-slate-900" />
          </div>
          <select value={statusFilter} onChange={(e) => onStatusFilter(e.target.value as 'all' | L1Status)} className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium outline-none focus:border-blue-400 dark:border-slate-700 dark:bg-slate-900">
            <option value="all">全部状态</option>
            <option value="active">活跃</option>
            <option value="paused">已暂停</option>
            <option value="expired">已过期</option>
          </select>
        </div>
        <button type="button" onClick={onFlushAll} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold hover:border-rose-400 hover:text-rose-600 dark:border-slate-700">
          <Trash2 className="h-4 w-4" />全部 flush
        </button>
      </div>
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <table className="w-full min-w-[920px] text-xs">
          <thead className="bg-slate-50 text-slate-500 dark:bg-slate-900/40">
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
            {filtered.map((s) => <L1Row key={s.id} session={s} onFlush={() => onFlushOne(s.id)} onOpen={() => onOpen(s)} />)}
          </tbody>
        </table>
        {filtered.length === 0 && <p className="px-4 py-12 text-center text-xs text-slate-500 dark:text-slate-400">没有匹配的会话,试试调整筛选条件。</p>}
      </div>
    </section>
  );
}