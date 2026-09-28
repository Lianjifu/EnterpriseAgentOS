/**
 * AuditCard — 单条审计条目卡片,含 select/star/click overlay。
 */
import { Check, CircleDot, FileLock, Sparkles } from 'lucide-react';
import type { AuditEntry } from '@/api/admin/audit/schema';
import { CATEGORY_META, OUTCOME_BADGE, SEVERITY_BADGE } from './constants';
import { RiskBar } from './Primitives';

interface AuditCardProps {
  entry: AuditEntry;
  selected: boolean;
  onToggleSelect: (id: string) => void;
  onSelect: (entry: AuditEntry) => void;
  onToggleStar: (id: string) => void;
}

export function AuditCard({ entry, selected, onToggleSelect, onSelect, onToggleStar }: AuditCardProps) {
  const sev = SEVERITY_BADGE[entry.severity];
  const cat = CATEGORY_META[entry.category];
  const Icon = cat.icon;
  const out = OUTCOME_BADGE[entry.outcome];
  return (
    <article
      className={`group relative rounded-2xl border bg-[var(--surface-1)] p-5 transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-sm)] ${selected ? 'border-[var(--brand)] shadow-[var(--shadow-sm)]' : 'border-[var(--border)] hover:border-[var(--brand)]'}`}
    >
      <div
        role="button"
        tabIndex={0}
        onClick={() => onSelect(entry)}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(entry); } }}
        aria-label={`查看审计条目 ${entry.id}`}
        className="absolute inset-0 z-0 cursor-pointer rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)]"
      />
      <div className="relative z-10 flex items-start gap-2">
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onToggleSelect(entry.id); }}
          aria-label={selected ? `取消选择 ${entry.id}` : `选择 ${entry.id}`}
          aria-pressed={selected}
          className={`grid h-9 w-9 place-items-center rounded-lg transition ${selected ? 'bg-[var(--brand-light)] text-[var(--brand)]' : 'text-[var(--text-muted)] hover:bg-[var(--bg-hover)]'}`}
        >
          {selected ? <Check className="h-4 w-4" /> : <CircleDot className="h-4 w-4" />}
        </button>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onToggleStar(entry.id); }}
          aria-label={entry.starred ? `取消收藏 ${entry.id}` : `收藏 ${entry.id}`}
          aria-pressed={entry.starred}
          className={`grid h-9 w-9 place-items-center rounded-lg transition ${entry.starred ? 'bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300' : 'text-[var(--text-muted)] hover:bg-[var(--bg-hover)]'}`}
        >
          <Sparkles className={`h-4 w-4 ${entry.starred ? 'fill-amber-400' : ''}`} />
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${cat.tone}`}>
              <Icon className="h-3 w-3" />
              {cat.label}
            </span>
            <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold ${sev.className}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${sev.dot}`} aria-hidden="true" />
              {sev.label}
            </span>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${out.className}`}>{out.label}</span>
            {entry.hasSensitive && (
              <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-semibold text-violet-700">
                <FileLock className="h-3 w-3" />
                敏感
              </span>
            )}
          </div>
          <p className="mt-2 font-mono text-xs font-semibold">{entry.toolName}</p>
          <p className="mt-1 text-[11px] leading-5 text-[var(--text-muted)]">
            调用方 {entry.actor} · 会话 {entry.sessionId}
          </p>
          {entry.reason && (
            <p className="mt-1.5 line-clamp-2 rounded-lg bg-rose-50 px-2 py-1 text-[11px] text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">
              {entry.reason}
            </p>
          )}
          <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] sm:grid-cols-4">
            <div>
              <span className="text-[var(--text-muted)]">风险</span>
              <div className="mt-0.5">
                <RiskBar score={entry.riskScore} />
              </div>
            </div>
            <div>
              <span className="text-[var(--text-muted)]">范围</span>
              <br />
              <span className="font-mono text-[10px] font-semibold">{entry.scope}</span>
            </div>
            <div>
              <span className="text-[var(--text-muted)]">时间</span>
              <br />
              <span className="font-semibold">{entry.occurredAt}</span>
            </div>
            <div>
              <span className="text-[var(--text-muted)]">重试</span>
              <br />
              <span className="font-semibold tabular-nums">{entry.retryCount}</span>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}