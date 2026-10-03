/**
 * AdminFeedback — 反馈列表行。
 */
import { ArrowRight, CheckCircle2, CheckSquare, Smile, Square, ThumbsDown, ThumbsUp, Trash2, User } from 'lucide-react';
import {
  AdminListActions, AdminListIdentity, AdminListMetric, AdminListMetrics, AdminListRow,
  adminListActionBtn, adminListDangerBtn,
} from '@/components/feedback/AdminListRow';
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
    <AdminListRow selected={selected} hasStar={false}>
      <div
        role="button"
        tabIndex={0}
        onClick={() => onSelect(fb.id)}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(fb.id); } }}
        aria-label={`查看 ${fb.user} 反馈详情`}
        className="absolute inset-0 z-0 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--brand)]"
      />
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onToggleSelect(fb.id); }}
        aria-label={selected ? `取消选择反馈 ${fb.id}` : `选择反馈 ${fb.id}`}
        aria-pressed={selected}
        className={`relative z-10 grid h-7 w-7 place-items-center rounded-lg ${
          selected ? 'bg-[var(--brand-light)] text-[var(--brand)]' : 'text-[var(--text-muted)] hover:bg-[var(--bg-hover)]'
        }`}
      >
        {selected ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}
      </button>
      <AdminListIdentity>
        <div className="flex min-w-0 items-center gap-1.5">
          <span className="inline-flex min-w-0 items-center gap-1 text-sm font-semibold group-hover:text-[var(--brand)]"><User className="h-3.5 w-3.5 shrink-0" /><span className="truncate">{fb.user}</span></span>
          <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${sen.tone}`}>
            <SenIcon className="h-3 w-3" />{sen.label}
          </span>
          <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold ${badge.className}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${badge.dot}`} aria-hidden="true" />{badge.label}
          </span>
          <span className={`hidden shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold sm:inline ${prio.className}`}>{prio.label}优先</span>
        </div>
        <p className="mt-0.5 truncate text-[11px] text-[var(--text-muted)]">{TYPE_LABEL[fb.type]} · {fb.agent} · {fb.comment}</p>
      </AdminListIdentity>
      <AdminListMetrics cols={2}>
        <span className="flex justify-end"><StarRow rating={fb.rating} /></span>
        <AdminListMetric>{fb.submittedAt}</AdminListMetric>
      </AdminListMetrics>
      <AdminListActions>
        <button type="button" disabled={triageDisabled} onClick={(e) => { e.stopPropagation(); onQuickTriage(fb); }} className={adminListActionBtn}>
          <ArrowRight className="h-3.5 w-3.5" />分诊
        </button>
        <button type="button" disabled={resolveDisabled} onClick={(e) => { e.stopPropagation(); onQuickResolve(fb); }} className={adminListActionBtn}>
          <CheckCircle2 className="h-3.5 w-3.5" />解决
        </button>
        <button type="button" onClick={(e) => { e.stopPropagation(); onRequestDelete(fb); }} className={adminListDangerBtn}>
          <Trash2 className="h-3.5 w-3.5" />删除
        </button>
      </AdminListActions>
    </AdminListRow>
  );
}
