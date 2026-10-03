/**
 * SessionCard — 会话列表行。
 */
import {
  AlertOctagon, CheckCircle2, CheckSquare, Download, Square, Star,
} from 'lucide-react';
import {
  AdminListActions, AdminListIdentity, AdminListMetric, AdminListMetrics, AdminListRow,
  adminListActionBtn,
} from '@/components/feedback/AdminListRow';
import type { Session } from '../schema';
import { SESSION_BADGE } from './constants';

interface SessionCardProps {
  session: Session;
  selected: boolean;
  onToggleSelect: (id: string) => void;
  onSelect: (s: Session) => void;
  onToggleStar: (id: string) => void;
  onExportOne: (s: Session) => void;
  onResolve: (s: Session) => void;
}

export function SessionCard({
  session,
  selected,
  onToggleSelect,
  onSelect,
  onToggleStar,
  onExportOne,
  onResolve,
}: SessionCardProps) {
  const badge = SESSION_BADGE[session.status];
  return (
    <AdminListRow selected={selected}>
      <div
        role="button"
        tabIndex={0}
        onClick={() => onSelect(session)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onSelect(session);
          }
        }}
        aria-label={`查看会话 ${session.id}`}
        className="absolute inset-0 z-0 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--brand)]"
      />
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onToggleSelect(session.id);
        }}
        aria-label={selected ? `取消选择会话 ${session.id}` : `选择会话 ${session.id}`}
        aria-pressed={selected}
        className={`relative z-10 grid h-7 w-7 place-items-center rounded-lg ${
          selected ? 'bg-[var(--brand-light)] text-[var(--brand)]' : 'text-[var(--text-muted)] hover:bg-[var(--bg-hover)]'
        }`}
      >
        {selected ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}
      </button>
      <AdminListIdentity>
        <div className="flex min-w-0 items-center gap-1.5">
          <span className="truncate font-mono text-sm font-semibold group-hover:text-[var(--brand)]">{session.id}</span>
          <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold ${badge.className}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${badge.dot}`} aria-hidden="true" />
            {badge.label}
          </span>
          {session.hasError && (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-semibold text-rose-700 dark:bg-rose-500/15 dark:text-rose-300">
              <AlertOctagon className="h-3 w-3" />异常
            </span>
          )}
        </div>
        <p className="mt-0.5 truncate text-[11px] text-[var(--text-muted)]">{session.user} · {session.agentName} · {session.summary}</p>
      </AdminListIdentity>
      <button
        type="button"
        aria-label={session.starred ? '取消收藏' : '收藏'}
        aria-pressed={session.starred}
        onClick={(e) => {
          e.stopPropagation();
          onToggleStar(session.id);
        }}
        className={`relative z-10 grid h-7 w-7 place-items-center rounded-lg ${session.starred ? 'text-amber-500' : 'text-[var(--text-muted)] hover:text-amber-500'}`}
      >
        <Star className={`h-4 w-4 ${session.starred ? 'fill-current' : ''}`} />
      </button>
      <AdminListMetrics cols={4}>
        <AdminListMetric>{session.spanCount} span</AdminListMetric>
        <AdminListMetric>{(session.totalDurationMs / 1000).toFixed(1)}s</AdminListMetric>
        <AdminListMetric>¥ {session.totalCost.toFixed(2)}</AdminListMetric>
        <AdminListMetric>{session.startAt}</AdminListMetric>
      </AdminListMetrics>
      <AdminListActions>
        <button type="button" onClick={(e) => { e.stopPropagation(); onExportOne(session); }} className={adminListActionBtn}>
          <Download className="h-3.5 w-3.5" />导出
        </button>
        <button type="button" disabled={!session.hasError} onClick={(e) => { e.stopPropagation(); onResolve(session); }} className={adminListActionBtn}>
          <CheckCircle2 className="h-3.5 w-3.5" />解决
        </button>
      </AdminListActions>
    </AdminListRow>
  );
}
