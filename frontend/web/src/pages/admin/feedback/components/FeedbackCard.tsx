/**
 * AdminFeedback — 反馈卡片。
 * 列表/总览复用;通过 iconMap 解析 sentiment.icon 为 lucide 组件。
 */
import { ArrowRight, CheckCircle2, MessageSquare, Smile, Square, ThumbsDown, ThumbsUp, User } from 'lucide-react';
import type { Feedback } from '@/api/admin/feedback/schema';
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
}

export function FeedbackCard({ fb, selected, onToggleSelect, onSelect, onQuickTriage, onQuickResolve }: FeedbackCardProps) {
  const sen = SENTIMENT_META[fb.sentiment];
  const SenIcon = sentimentIconMap[sen.icon] ?? Smile;
  const badge = STATUS_BADGE[fb.status];
  const prio = PRIORITY_BADGE[fb.priority];
  return (
    <article className={`group relative rounded-2xl border bg-[var(--surface-1)] p-5 transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-sm)] ${selected ? 'border-[var(--brand)] shadow-[var(--shadow-sm)]' : 'border-[var(--border)] hover:border-[var(--brand)]'}`}>
      <div role="button" tabIndex={0} onClick={() => onSelect(fb.id)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(fb.id); } }} aria-label={`查看 ${fb.user} 反馈详情`} className="absolute inset-0 z-0 cursor-pointer rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)]" />
      <div className="relative z-10 flex items-start gap-2">
        <button type="button" onClick={(e) => { e.stopPropagation(); onToggleSelect(fb.id); }} aria-label={selected ? `取消选择反馈 ${fb.id}` : `选择反馈 ${fb.id}`} aria-pressed={selected} className={`grid h-9 w-9 place-items-center rounded-lg transition ${selected ? 'bg-[var(--brand-light)] text-[var(--brand)]' : 'text-[var(--text-muted)] hover:bg-[var(--bg-hover)]'}`}>
          {selected ? <CheckCircle2 className="h-4 w-4" /> : <Square className="h-4 w-4" />}
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${sen.tone}`}>
              <SenIcon className="h-3 w-3" />{sen.label}
            </span>
            <span className="rounded-full bg-[var(--bg-elevated)] px-2 py-0.5 text-[10px] font-semibold">{TYPE_LABEL[fb.type]}</span>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${prio.className}`}>{prio.label}优先</span>
          </div>
          <div className="mt-2 flex items-center gap-2 text-[11px] text-[var(--text-muted)]">
            <User className="h-3 w-3" />{fb.user}
            <span>·</span>
            <span>{fb.session}</span>
            <span className="ml-auto">{fb.submittedAt}</span>
          </div>
          <p className="mt-2 line-clamp-2 text-xs leading-5 text-[var(--text-secondary)]">{fb.comment}</p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-[var(--bg-elevated)] px-2 py-0.5 text-[10px] font-medium">{fb.agent}</span>
            <span className="rounded-full bg-[var(--bg-elevated)] px-2 py-0.5 text-[10px] font-medium">{fb.topic}</span>
            <StarRow rating={fb.rating} />
            <span className={`ml-auto inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold ${badge.className}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${badge.dot}`} aria-hidden="true" />{badge.label}
            </span>
          </div>
          <div className="mt-3 flex items-center gap-2 border-t border-[var(--border)] pt-3">
            {fb.status === 'new' && (
              <button type="button" onClick={(e) => { e.stopPropagation(); onQuickTriage(fb); }} className="inline-flex items-center gap-1 rounded-lg border border-[var(--brand)] px-2.5 py-1 text-[10px] font-semibold text-[var(--brand)] hover:bg-[var(--brand-light)]">
                <ArrowRight className="h-3 w-3" />分诊
              </button>
            )}
            {fb.status !== 'resolved' && fb.status !== 'wontfix' && (
              <button type="button" onClick={(e) => { e.stopPropagation(); onQuickResolve(fb); }} className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 px-2.5 py-1 text-[10px] font-semibold text-emerald-700 hover:bg-emerald-50 dark:border-emerald-500/40 dark:text-emerald-300 dark:hover:bg-emerald-500/15">
                <CheckCircle2 className="h-3 w-3" />标记已解决
              </button>
            )}
            <button type="button" onClick={(e) => { e.stopPropagation(); onSelect(fb.id); }} className="ml-auto inline-flex items-center gap-1 rounded-lg border border-[var(--border)] px-2.5 py-1 text-[10px] font-semibold hover:border-[var(--brand)]">
              <MessageSquare className="h-3 w-3" />查看 / 回复
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}