/**
 * SessionCard — 单个会话的卡片视图,支持选中 / 收藏 / 快捷操作 / 点击查看详情。
 */
import {
  AlertOctagon, CheckCircle2, CheckSquare, Download, ListTree, Square, Star,
} from 'lucide-react';
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
    <article
      className={`group relative flex flex-col gap-4 rounded-2xl border bg-[var(--surface-1)] p-5 text-left transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-sm)] ${
        selected ? 'border-[var(--brand)] shadow-[var(--shadow-sm)]' : 'border-[var(--border)] hover:border-[var(--brand)]'
      }`}
    >
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
        className="absolute inset-0 z-0 cursor-pointer rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)]"
      />
      <div className="relative z-10 flex items-start justify-between">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleSelect(session.id);
          }}
          aria-label={selected ? `取消选择会话 ${session.id}` : `选择会话 ${session.id}`}
          aria-pressed={selected}
          className={`grid h-9 w-9 place-items-center rounded-lg transition ${
            selected ? 'bg-[var(--brand-light)] text-[var(--brand)]' : 'text-[var(--text-muted)] hover:bg-[var(--bg-hover)]'
          }`}
        >
          {selected ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}
        </button>
        <button
          type="button"
          aria-label={session.starred ? '取消收藏' : '收藏'}
          aria-pressed={session.starred}
          onClick={(e) => {
            e.stopPropagation();
            onToggleStar(session.id);
          }}
          className={`grid h-9 w-9 place-items-center rounded-lg transition ${session.starred ? 'bg-amber-50 text-amber-500 dark:bg-amber-500/15' : 'text-[var(--text-muted)] hover:bg-[var(--bg-hover)] hover:text-amber-500'}`}
        >
          <Star className={`h-4 w-4 ${session.starred ? 'fill-current' : ''}`} />
        </button>
      </div>
      <div className="pointer-events-none relative z-10 min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-xs font-semibold">{session.id}</span>
          <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold ${badge.className}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${badge.dot}`} aria-hidden="true" />
            {badge.label}
          </span>
          {session.hasError && (
            <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-semibold text-rose-700 dark:bg-rose-500/15 dark:text-rose-300">
              <AlertOctagon className="h-3 w-3" />
              异常
            </span>
          )}
        </div>
        <p className="mt-1.5 line-clamp-2 text-[11px] leading-5 text-[var(--text-muted)]">{session.summary}</p>
        <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] sm:grid-cols-4">
          <div>
            <span className="text-[var(--text-muted)]">用户</span>
            <br />
            <span className="font-semibold">{session.user}</span>
          </div>
          <div>
            <span className="text-[var(--text-muted)]">智能体</span>
            <br />
            <span className="font-semibold">{session.agentName}</span>
          </div>
          <div>
            <span className="text-[var(--text-muted)]">Span</span>
            <br />
            <span className="font-semibold tabular-nums">{session.spanCount}</span>
          </div>
          <div>
            <span className="text-[var(--text-muted)]">耗时</span>
            <br />
            <span className="font-semibold tabular-nums">{(session.totalDurationMs / 1000).toFixed(1)}s</span>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px]">
          <span className="rounded-full bg-[var(--bg-elevated)] px-2 py-0.5 font-medium">{session.channel}</span>
          <span className="rounded-full bg-[var(--bg-elevated)] px-2 py-0.5 font-mono">{session.startAt}</span>
          <span className="ml-auto rounded-lg bg-violet-50 px-2 py-0.5 font-medium text-violet-700 dark:bg-violet-500/15 dark:text-violet-300">
            ¥ {session.totalCost.toFixed(2)} · {session.totalTokens.toLocaleString('zh-CN')} tok
          </span>
        </div>
      </div>
      <div className="relative z-10 flex flex-wrap gap-1.5 border-t border-[var(--border)] pt-3">
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onSelect(session); }}
          className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg border border-[var(--border)] px-1.5 py-1.5 text-[11px] font-semibold text-[var(--text-secondary)] hover:border-[var(--brand)] hover:text-[var(--brand)]"
        >
          <ListTree className="h-3.5 w-3.5" />打开
        </button>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onExportOne(session); }}
          className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg border border-[var(--border)] px-1.5 py-1.5 text-[11px] font-semibold text-[var(--text-secondary)] hover:border-[var(--brand)] hover:text-[var(--brand)]"
        >
          <Download className="h-3.5 w-3.5" />导出
        </button>
        <button
          type="button"
          disabled={!session.hasError}
          onClick={(e) => { e.stopPropagation(); onResolve(session); }}
          className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg border border-[var(--border)] px-1.5 py-1.5 text-[11px] font-semibold text-[var(--text-secondary)] hover:border-[var(--brand)] hover:text-[var(--brand)] disabled:cursor-default disabled:opacity-40 disabled:hover:border-[var(--border)] disabled:hover:text-[var(--text-secondary)]"
        >
          <CheckCircle2 className="h-3.5 w-3.5" />解决
        </button>
      </div>
    </article>
  );
}
