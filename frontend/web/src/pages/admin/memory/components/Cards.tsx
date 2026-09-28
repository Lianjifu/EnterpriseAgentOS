/**
 * L1Row / L2Card / L3Card — 三层记忆的卡片/行展示。
 */
import { ArrowUpRight, BookOpen, CheckCircle2, Edit, Pause, Play } from 'lucide-react';
import type { L1Session, L2Fact, L3Entry } from '@/api/admin/memory/schema';
import { L1_STATUS_BADGE, L2_CATEGORY_LABEL, L2_STATUS_BADGE, L3_STATUS_BADGE, toneClass } from './constants';

export function L1Row({ session, onFlush, onOpen }: {
  session: L1Session; onFlush: () => void; onOpen: () => void;
}) {
  const status = L1_STATUS_BADGE[session.status];
  const progress = Math.max(0, Math.min(1, session.ttlRemainMin / session.ttlMinutes));
  return (
    <tr className="border-t border-slate-200 dark:border-slate-800">
      <td className="px-4 py-3">
        <button type="button" onClick={onOpen} className="font-medium hover:text-blue-700">sess-{session.id.split('-')[1].padStart(3, '0')}</button>
        <p className="mt-0.5 text-[10px] text-slate-500 dark:text-slate-400">{session.startedAt}</p>
      </td>
      <td className="px-4 py-3 text-slate-700 dark:text-slate-200">{session.userName}</td>
      <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{session.agentName}</td>
      <td className="px-4 py-3 text-right tabular-nums">{session.bufferSize}</td>
      <td className="px-4 py-3 text-right tabular-nums">{(session.tokensUsed / 1000).toFixed(1)} k</td>
      <td className="px-4 py-3 w-[180px]">
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
          <div className={`h-full rounded-full ${progress < 0.2 ? 'bg-rose-500' : 'bg-blue-500'}`} style={{ width: `${progress * 100}%` }} />
        </div>
        <p className="mt-1 text-[10px] tabular-nums text-slate-500 dark:text-slate-400">剩 {session.ttlRemainMin} / {session.ttlMinutes} 分钟</p>
      </td>
      <td className="px-4 py-3">
        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${status.className}`}>{status.label}</span>
      </td>
      <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{session.lastFlush}</td>
      <td className="px-4 py-3 text-right">
        {session.status !== 'expired' && (
          <button type="button" onClick={onFlush} className="text-blue-700 hover:underline">立即 flush</button>
        )}
      </td>
    </tr>
  );
}

export function L2Card({ fact, onOpen, onPromote, onConfirm, selected, onToggle }: {
  fact: L2Fact; onOpen: () => void; onPromote: () => void; onConfirm: () => void;
  selected: boolean; onToggle: () => void;
}) {
  const status = L2_STATUS_BADGE[fact.status];
  return (
    <div className={`group flex flex-col gap-4 rounded-2xl border bg-white p-5 transition hover:-translate-y-0.5 hover:shadow-md dark:bg-slate-900 ${selected ? 'border-blue-500 shadow-md' : 'border-slate-200 hover:border-blue-400 dark:border-slate-800'}`}>
      <div className="flex items-start justify-between">
        <button type="button" onClick={onToggle} aria-label={`选择 ${fact.key}`} aria-pressed={selected} className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md border ${selected ? 'border-blue-500 bg-blue-500 text-white' : 'border-slate-300 bg-white text-transparent hover:border-blue-400 dark:border-slate-700 dark:bg-slate-900'}`}>
          <CheckCircle2 className="h-3.5 w-3.5" />
        </button>
        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${status.className}`}>
          {status.label}
          {fact.promotedToL3 && <ArrowUpRight className="h-3 w-3" />}
        </span>
      </div>
      <button type="button" onClick={onOpen} className="text-left">
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">{L2_CATEGORY_LABEL[fact.category]}</span>
        <h4 className="mt-2 text-base font-semibold leading-6 group-hover:text-blue-700">{fact.key}</h4>
        <p className="mt-1 line-clamp-2 text-xs leading-6 text-slate-700 dark:text-slate-200">{fact.value}</p>
      </button>
      <div>
        <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400">
          <span>置信度</span><span className="tabular-nums">{(fact.confidence * 100).toFixed(0)}%</span>
        </div>
        <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
          <div className={`h-full rounded-full ${fact.confidence > 0.85 ? 'bg-emerald-500' : fact.confidence > 0.7 ? 'bg-amber-500' : 'bg-rose-500'}`} style={{ width: `${fact.confidence * 100}%` }} />
        </div>
      </div>
      <div className="mt-auto grid grid-cols-2 gap-2 border-t border-slate-200 pt-3 text-[11px] dark:border-slate-800">
        <div><p className="text-slate-500 dark:text-slate-400">归属用户</p><p className="mt-0.5 font-semibold">{fact.userName}</p></div>
        <div><p className="text-slate-500 dark:text-slate-400">最后使用</p><p className="mt-0.5 font-semibold">{fact.lastUsed}</p></div>
        <div className="col-span-2"><p className="text-slate-500 dark:text-slate-400">来源会话</p><p className="mt-0.5 font-semibold">sess-{fact.sourceSession.split('-')[1].padStart(3, '0')} · {fact.promotedAt}</p></div>
      </div>
      <div className="flex gap-2">
        {fact.status === 'pending' && (
          <button type="button" onClick={onConfirm} className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold hover:border-blue-400 dark:border-slate-700">
            <CheckCircle2 className="h-3.5 w-3.5" />确认
          </button>
        )}
        {fact.status === 'confirmed' && !fact.promotedToL3 && (
          <button type="button" onClick={onPromote} className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700">
            <ArrowUpRight className="h-3.5 w-3.5" />晋升 L3
          </button>
        )}
        <button type="button" onClick={onOpen} className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold hover:border-blue-400 dark:border-slate-700">
          <Edit className="h-3.5 w-3.5" />查看
        </button>
      </div>
    </div>
  );
}

export function L3Card({ entry, onOpen, onRetire, onPublish }: {
  entry: L3Entry; onOpen: () => void; onRetire: () => void; onPublish: () => void;
}) {
  const status = L3_STATUS_BADGE[entry.status];
  const layerTone = entry.status === 'retired' ? 'warn' : entry.status === 'draft' ? 'info' : 'brand';
  return (
    <div className="group flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 transition hover:-translate-y-0.5 hover:border-blue-400 hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-start justify-between">
        <span className={`grid h-10 w-10 place-items-center rounded-lg ${toneClass[layerTone]}`}>
          <BookOpen className="h-5 w-5" />
        </span>
        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${status.className}`}>{status.label}</span>
      </div>
      <button type="button" onClick={onOpen} className="text-left">
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">{entry.team}</span>
        <h4 className="mt-2 text-base font-semibold leading-6 group-hover:text-blue-700">{entry.title}</h4>
        <p className="mt-1 line-clamp-2 text-xs leading-6 text-slate-500 dark:text-slate-400">{entry.summary}</p>
      </button>
      <div className="mt-auto grid grid-cols-3 gap-2 border-t border-slate-200 pt-3 text-[11px] dark:border-slate-800">
        <div><p className="text-slate-500 dark:text-slate-400">类别</p><p className="mt-0.5 font-semibold">{entry.category}</p></div>
        <div><p className="text-slate-500 dark:text-slate-400">命中</p><p className="mt-0.5 font-semibold tabular-nums">{entry.hits}</p></div>
        <div><p className="text-slate-500 dark:text-slate-400">更新</p><p className="mt-0.5 font-semibold">{entry.updatedAt}</p></div>
        <div className="col-span-3"><p className="text-slate-500 dark:text-slate-400">贡献者</p><p className="mt-0.5 font-semibold">{entry.contributor}</p></div>
      </div>
      <div className="flex gap-2">
        <button type="button" onClick={onOpen} className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold hover:border-blue-400 dark:border-slate-700">
          <Edit className="h-3.5 w-3.5" />编辑
        </button>
        {entry.status === 'draft' && (
          <button type="button" onClick={onPublish} className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700">
            <Play className="h-3.5 w-3.5" />发布
          </button>
        )}
        {entry.status === 'published' && (
          <button type="button" onClick={onRetire} className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-600 hover:border-rose-400 dark:border-rose-500/40 dark:text-rose-300">
            <Pause className="h-3.5 w-3.5" />下线
          </button>
        )}
      </div>
    </div>
  );
}