/**
 * AdminFeedback — 反馈卡片。
 * 列表复用;通过 iconMap 解析 sentiment.icon 为 lucide 组件。
 */
import { ArrowRight, CheckCircle2, CheckSquare, Smile, Square, ThumbsDown, ThumbsUp, Trash2, User } from 'lucide-react';
import type { Feedback } from '../schema';
import { PRIORITY_BADGE, SENTIMENT_META, STATUS_BADGE, TYPE_LABEL } from './constants';
import { StarRow } from './Primitives';

const sentimentIconMap: Record<string, typeof ThumbsUp> = {
  ThumbsUp, ThumbsDown, Smile,
};

interface FeedbackCardProps {
  fb: Feedback;
  selected: boolean;
  onToggleSelect: (id: string) => void;
  onSelect: (id: string) => void;
  onQuickTriage: (fb: Feedback) => void;
  onQuickResolve: (fb: Feedback) => void;
  onRequestDelete: (fb: Feedback) => void;
}

export function FeedbackCard({
  fb, selected, onToggleSelect, onSelect, onQuickTriage, onQuickResolve, onRequestDelete,
}: FeedbackCardProps) {
  const sen = SENTIMENT_META[fb.sentiment];
  const SenIcon = sentimentIconMap[sen.icon] ?? Smile;
  const badge = STATUS_BADGE[fb.status];
  const prio = PRIORITY_BADGE[fb.priority];
  const triageDisabled = fb.status !== 'new';
  const resolveDisabled = fb.status === 'resolved' || fb.status === 'wontfix';
  return (
    <article
      className={`group relative flex flex-col gap-4 rounded-2xl border bg-[var(--surface-1)] p-5 text-left transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-sm)] ${
        selected ? 'border-[var(--brand)] shadow-[var(--shadow-sm)]' : 'border-[var(--border)] hover:border-[var(--brand)]'
      }`}
    >
      <div
        role="button"
        tabIndex={0}
        onClick={() => onSelect(fb.id)}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(fb.id); } }}
        aria-label={`查看 ${fb.user} 反馈详情`}
        className="absolute inset-0 z-0 cursor-pointer rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)]"
      />
      <div className="relative z-10 flex items-start justify-between">
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onToggleSelect(fb.id); }}
          aria-label={selected ? `取消选择反馈 ${fb.id}` : `选择反馈 ${fb.id}`}
          aria-pressed={selected}
          className={`grid h-9 w-9 place-items-center rounded-lg transition ${
            selected ? 'bg-[var(--brand-light)] text-[var(--brand)]' : 'text-[var(--text-muted)] hover:bg-[var(--bg-hover)]'
          }`}
        >
          {selected ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}
        </button>
        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${sen.tone}`}>
          <SenIcon className="h-3 w-3" />{sen.label}
        </span>
      </div>
      <div className="pointer-events-none relative z-10 flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-[var(--bg-elevated)] px-2 py-0.5 text-[10px] font-semibold">{TYPE_LABEL[fb.type]}</span>
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${prio.className}`}>{prio.label}优先</span>
      </div>
      <div className="pointer-events-none relative z-10 flex items-center gap-2 text-[11px] text-[var(--text-muted)]">
        <User className="h-3 w-3" />{fb.user}
        <span>·</span>
        <span className="truncate">{fb.session}</span>
        <span className="ml-auto shrink-0">{fb.submittedAt}</span>
      </div>
      <p className="pointer-events-none relative z-10 line-clamp-2 text-xs leading-5 text-[var(--text-secondary)]">{fb.comment}</p>
      <div className="pointer-events-none relative z-10 flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-[var(--bg-elevated)] px-2 py-0.5 text-[10px] font-medium">{fb.agent}</span>
        <span className="rounded-full bg-[var(--bg-elevated)] px-2 py-0.5 text-[10px] font-medium">{fb.topic}</span>
        <StarRow rating={fb.rating} />
      </div>
      <div className="pointer-events-none relative z-10 mt-auto flex flex-wrap items-center gap-2 border-t border-[var(--border)] pt-3">
        <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold ${badge.className}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${badge.dot}`} aria-hidden="true" />{badge.label}
        </span>
      </div>
      <div className="relative z-10 flex flex-wrap gap-1.5 border-t border-[var(--border)] pt-3">
        <button
          type="button"
          disabled={triageDisabled}
          onClick={(e) => { e.stopPropagation(); onQuickTriage(fb); }}
          className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg border border-[var(--border)] px-1.5 py-1.5 text-[11px] font-semibold text-[var(--text-secondary)] hover:border-[var(--brand)] hover:text-[var(--brand)] disabled:cursor-default disabled:opacity-40 disabled:hover:border-[var(--border)] disabled:hover:text-[var(--text-secondary)]"
        >
          <ArrowRight className="h-3.5 w-3.5" />分诊
        </button>
        <button
          type="button"
          disabled={resolveDisabled}
          onClick={(e) => { e.stopPropagation(); onQuickResolve(fb); }}
          className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg border border-[var(--border)] px-1.5 py-1.5 text-[11px] font-semibold text-[var(--text-secondary)] hover:border-[var(--brand)] hover:text-[var(--brand)] disabled:cursor-default disabled:opacity-40 disabled:hover:border-[var(--border)] disabled:hover:text-[var(--text-secondary)]"
        >
          <CheckCircle2 className="h-3.5 w-3.5" />解决
        </button>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onRequestDelete(fb); }}
          className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg border border-rose-200 px-1.5 py-1.5 text-[11px] font-semibold text-rose-600 hover:bg-rose-50 dark:border-rose-500/30 dark:text-rose-300 dark:hover:bg-rose-500/10"
        >
          <Trash2 className="h-3.5 w-3.5" />删除
        </button>
      </div>
    </article>
  );
}
