/**
 * SessionCard — 单个会话的卡片视图,支持选中 / 收藏 / 点击查看详情。
 */
import { AlertOctagon, CheckCircle2, CircleDot, Sparkles } from 'lucide-react';
import type { Session } from '@/api/admin/operations/schema';
import { SESSION_BADGE } from './constants';

export function SessionCard({
  session,
  selected,
  onToggleSelect,
  onSelect,
  onToggleStar,
}: {
  session: Session;
  selected: boolean;
  onToggleSelect: (id: string) => void;
  onSelect: (s: Session) => void;
  onToggleStar: (id: string) => void;
}) {
  const badge = SESSION_BADGE[session.status];
  return (
    <article
      className={`group relative rounded-2xl border bg-[var(--surface-1)] p-5 transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-sm)] ${selected ? 'border-[var(--brand)] shadow-[var(--shadow-sm)]' : 'border-[var(--border)] hover:border-[var(--brand)]'}`}
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
      <div className="relative z-10 flex items-start gap-2">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleSelect(session.id);
          }}
          aria-label={selected ? `取消选择会话 ${session.id}` : `选择会话 ${session.id}`}
          aria-pressed={selected}
          className={`grid h-9 w-9 place-items-center rounded-lg transition ${selected ? 'bg-[var(--brand-light)] text-[var(--brand)]' : 'text-[var(--text-muted)] hover:bg-[var(--bg-hover)]'}`}
        >
          {selected ? <CheckCircle2 className="h-4 w-4" /> : <CircleDot className="h-4 w-4" />}
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleStar(session.id);
          }}
          aria-label={session.starred ? `取消收藏 ${session.id}` : `收藏 ${session.id}`}
          aria-pressed={session.starred}
          className={`grid h-9 w-9 place-items-center rounded-lg transition ${session.starred ? 'bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300' : 'text-[var(--text-muted)] hover:bg-[var(--bg-hover)]'}`}
        >
          <Sparkles className={`h-4 w-4 ${session.starred ? 'fill-amber-400' : ''}`} />
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs font-semibold">{session.id}</span>
            <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold ${badge.className}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${badge.dot}`} aria-hidden="true" />
              {badge.label}
            </span>
            {session.hasError && (
              <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-semibold text-rose-700">
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
      </div>
    </article>
  );
}