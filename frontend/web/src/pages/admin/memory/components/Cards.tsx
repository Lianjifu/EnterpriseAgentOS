/**
 * L1Row / L2Card / L3Card — 三层记忆的卡片/行展示。
 */
import { Link } from 'react-router-dom';
import { ArrowUpRight, BookOpen, CheckCircle2, Edit, Pause, Play } from 'lucide-react';
import type { L1Session, L2Fact, L3Entry } from '@/api/admin/memory/schema';
import { L1_STATUS_BADGE, L2_CATEGORY_LABEL, L2_STATUS_BADGE, L3_STATUS_BADGE, toneClass } from './constants';

export function L1Row({ session, onFlush, onOpen }: {
  session: L1Session; onFlush: () => void; onOpen: () => void;
}) {
  const status = L1_STATUS_BADGE[session.status];
  const progress = Math.max(0, Math.min(1, session.ttlRemainMin / session.ttlMinutes));
  return (
    <tr className="border-t border-[var(--border)]">
      <td className="px-4 py-3">
        <button type="button" onClick={onOpen} className="font-medium hover:text-[var(--brand)]">sess-{session.id.split('-')[1].padStart(3, '0')}</button>
        <p className="mt-0.5 text-[10px] text-[var(--text-muted)]">{session.startedAt}</p>
      </td>
      <td className="px-4 py-3 text-[var(--text-secondary)]">{session.userName}</td>
      <td className="px-4 py-3 text-[var(--text-muted)]">{session.agentName}</td>
      <td className="px-4 py-3 text-right tabular-nums">{session.bufferSize}</td>
      <td className="px-4 py-3 text-right tabular-nums">{(session.tokensUsed / 1000).toFixed(1)} k</td>
      <td className="px-4 py-3 w-[180px]">
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--bg-app)]">
          <div className={`h-full rounded-full ${progress < 0.2 ? 'bg-[var(--danger)]' : 'bg-[var(--brand)]'}`} style={{ width: `${progress * 100}%` }} />
        </div>
        <p className="mt-1 text-[10px] tabular-nums text-[var(--text-muted)]">剩 {session.ttlRemainMin} / {session.ttlMinutes} 分钟</p>
      </td>
      <td className="px-4 py-3">
        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${status.className}`}>{status.label}</span>
      </td>
      <td className="px-4 py-3 text-[var(--text-muted)]">{session.lastFlush}</td>
      <td className="px-4 py-3 text-right">
        {session.status !== 'expired' && (
          <button type="button" onClick={onFlush} className="text-[var(--brand)] hover:underline">立即 flush</button>
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
    <div className={`group flex flex-col gap-4 rounded-2xl border bg-[var(--surface-1)] p-5 transition hover:-translate-y-0.5 hover:shadow-md ${selected ? 'border-[var(--brand)] shadow-md' : 'border-[var(--border)] hover:border-[var(--brand)]'}`}>
      <div className="flex items-start justify-between">
        <button type="button" onClick={onToggle} aria-label={`选择 ${fact.key}`} aria-pressed={selected} className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md border ${selected ? 'border-[var(--brand)] bg-[var(--brand)] text-white' : 'border-[var(--border)] bg-[var(--surface-1)] text-transparent hover:border-[var(--brand)]'}`}>
          <CheckCircle2 className="h-3.5 w-3.5" />
        </button>
        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${status.className}`}>
          {status.label}
          {fact.promotedToL3 && <ArrowUpRight className="h-3 w-3" />}
        </span>
      </div>
      <button type="button" onClick={onOpen} className="text-left">
        <span className="rounded-full bg-[var(--bg-elevated)] px-2 py-0.5 text-[10px] font-semibold text-[var(--text-secondary)]">{L2_CATEGORY_LABEL[fact.category]}</span>
        <h4 className="mt-2 text-base font-semibold leading-6 group-hover:text-[var(--brand)]">{fact.key}</h4>
        <p className="mt-1 line-clamp-2 text-xs leading-6 text-[var(--text-secondary)]">{fact.value}</p>
      </button>
      <div>
        <div className="flex items-center justify-between text-[10px] text-[var(--text-muted)]">
          <span>置信度</span><span className="tabular-nums">{(fact.confidence * 100).toFixed(0)}%</span>
        </div>
        <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-[var(--bg-app)]">
          <div className={`h-full rounded-full ${fact.confidence > 0.85 ? 'bg-[var(--success)]' : fact.confidence > 0.7 ? 'bg-[var(--warning)]' : 'bg-[var(--danger)]'}`} style={{ width: `${fact.confidence * 100}%` }} />
        </div>
      </div>
      <div className="mt-auto grid grid-cols-2 gap-2 border-t border-[var(--border)] pt-3 text-[11px]">
        <div><p className="text-[var(--text-muted)]">归属用户</p><p className="mt-0.5 font-semibold">{fact.userName}</p></div>
        <div><p className="text-[var(--text-muted)]">最后使用</p><p className="mt-0.5 font-semibold">{fact.lastUsed}</p></div>
        <div className="col-span-2"><p className="text-[var(--text-muted)]">来源会话</p><p className="mt-0.5 font-semibold">
          <Link to={`/admin/memory/l1/${fact.sourceSession}`} className="text-[var(--brand)] hover:underline">
            sess-{fact.sourceSession.split('-')[1].padStart(3, '0')}
          </Link>
          {' · '}{fact.promotedAt}
        </p></div>
      </div>
      <div className="flex gap-2">
        {fact.status === 'pending' && (
          <button type="button" onClick={onConfirm} className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-[var(--border)] px-3 py-1.5 text-xs font-semibold hover:border-[var(--brand)]">
            <CheckCircle2 className="h-3.5 w-3.5" />确认
          </button>
        )}
        {fact.status === 'confirmed' && !fact.promotedToL3 && (
          <button type="button" onClick={onPromote} className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-[var(--brand)] px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90">
            <ArrowUpRight className="h-3.5 w-3.5" />晋升 L3
          </button>
        )}
        <button type="button" onClick={onOpen} className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-[var(--border)] px-3 py-1.5 text-xs font-semibold hover:border-[var(--brand)]">
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
    <div className="group flex flex-col gap-4 rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-5 transition hover:-translate-y-0.5 hover:border-[var(--brand)] hover:shadow-md">
      <div className="flex items-start justify-between">
        <span className={`grid h-10 w-10 place-items-center rounded-lg ${toneClass[layerTone]}`}>
          <BookOpen className="h-5 w-5" />
        </span>
        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${status.className}`}>{status.label}</span>
      </div>
      <button type="button" onClick={onOpen} className="text-left">
        <span className="rounded-full bg-[var(--bg-elevated)] px-2 py-0.5 text-[10px] font-semibold text-[var(--text-secondary)]">{entry.team}</span>
        <h4 className="mt-2 text-base font-semibold leading-6 group-hover:text-[var(--brand)]">{entry.title}</h4>
        <p className="mt-1 line-clamp-2 text-xs leading-6 text-[var(--text-muted)]">{entry.summary}</p>
      </button>
      <div className="mt-auto grid grid-cols-3 gap-2 border-t border-[var(--border)] pt-3 text-[11px]">
        <div><p className="text-[var(--text-muted)]">类别</p><p className="mt-0.5 font-semibold">{entry.category}</p></div>
        <div><p className="text-[var(--text-muted)]">命中</p><p className="mt-0.5 font-semibold tabular-nums">{entry.hits}</p></div>
        <div><p className="text-[var(--text-muted)]">更新</p><p className="mt-0.5 font-semibold">{entry.updatedAt}</p></div>
        <div className="col-span-3"><p className="text-[var(--text-muted)]">贡献者</p><p className="mt-0.5 font-semibold">{entry.contributor}</p></div>
      </div>
      <div className="flex gap-2">
        <button type="button" onClick={onOpen} className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-[var(--border)] px-3 py-1.5 text-xs font-semibold hover:border-[var(--brand)]">
          <Edit className="h-3.5 w-3.5" />编辑
        </button>
        {entry.status === 'draft' && (
          <button type="button" onClick={onPublish} className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[var(--brand)] px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90">
            <Play className="h-3.5 w-3.5" />发布
          </button>
        )}
        {entry.status === 'published' && (
          <button type="button" onClick={onRetire} className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-[var(--danger)] px-3 py-1.5 text-xs font-semibold text-[var(--danger)] hover:opacity-90">
            <Pause className="h-3.5 w-3.5" />下线
          </button>
        )}
      </div>
    </div>
  );
}