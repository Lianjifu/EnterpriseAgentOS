/**
 * AdminFeedback — 静态常量。
 * STATUS_BADGE / SENTIMENT_META / PRIORITY_BADGE / TYPE_LABEL 等;
 * SENTIMENT_META.icon / DRAWER_NAV_ITEMS.icon 用字符串标识符,
 * 在 FeedbackCard / FeedbackDetailDrawer / TopicTab 里通过 iconMap 解析为 lucide 组件。
 */
import type { DrawerPanel, FeedbackPriority, FeedbackSentiment, FeedbackStatus, FeedbackType, RoutingAction, TabId } from '@/api/admin/feedback/schema';

export const TABS: Array<{ id: TabId; label: string }> = [
  { id: 'overview', label: '反馈总览' },
  { id: 'list', label: '反馈列表' },
  { id: 'ticket', label: '工单管理' },
  { id: 'topic', label: '反馈主题' },
  { id: 'rule', label: '规则模板' },
];

export const STATUS_BADGE: Record<FeedbackStatus, { label: string; className: string; dot: string }> = {
  new: { label: '新反馈', className: 'bg-sky-50 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300', dot: 'bg-sky-500' },
  triaged: { label: '已分诊', className: 'bg-violet-50 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300', dot: 'bg-violet-500' },
  'in-progress': { label: '处理中', className: 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300', dot: 'bg-amber-500' },
  resolved: { label: '已解决', className: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300', dot: 'bg-emerald-500' },
  wontfix: { label: '不予处理', className: 'bg-[var(--bg-elevated)] text-[var(--text-muted)]', dot: 'bg-[var(--text-muted)]' },
};

export const SENTIMENT_META: Record<FeedbackSentiment, { label: string; icon: string; tone: string }> = {
  positive: { label: '正面', icon: 'ThumbsUp', tone: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300' },
  neutral: { label: '中性', icon: 'Smile', tone: 'bg-[var(--bg-elevated)] text-[var(--text-secondary)]' },
  negative: { label: '负面', icon: 'ThumbsDown', tone: 'bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300' },
};

export const PRIORITY_BADGE: Record<FeedbackPriority, { label: string; className: string }> = {
  low: { label: '低', className: 'bg-[var(--bg-elevated)] text-[var(--text-muted)]' },
  medium: { label: '中', className: 'bg-sky-50 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300' },
  high: { label: '高', className: 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300' },
  urgent: { label: '紧急', className: 'bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300' },
};

export const TYPE_LABEL: Record<FeedbackType, string> = {
  thumbs: '点赞 / 点踩',
  rating: '评分',
  comment: '文字评论',
  correction: '修正建议',
};

export const STATUS_FILTER: Array<{ id: 'all' | FeedbackStatus; label: string }> = [
  { id: 'all', label: '全部状态' },
  { id: 'new', label: '新反馈' },
  { id: 'triaged', label: '已分诊' },
  { id: 'in-progress', label: '处理中' },
  { id: 'resolved', label: '已解决' },
  { id: 'wontfix', label: '不予处理' },
];

export const SENTIMENT_FILTER: Array<{ id: 'all' | FeedbackSentiment; label: string }> = [
  { id: 'all', label: '全部情感' },
  { id: 'positive', label: '正面' },
  { id: 'neutral', label: '中性' },
  { id: 'negative', label: '负面' },
];

export const PRIORITY_FILTER: Array<{ id: 'all' | FeedbackPriority; label: string }> = [
  { id: 'all', label: '全部优先级' },
  { id: 'urgent', label: '紧急' },
  { id: 'high', label: '高' },
  { id: 'medium', label: '中' },
  { id: 'low', label: '低' },
];

export const DRAWER_NAV_ITEMS: Array<{ id: DrawerPanel; label: string; icon: string }> = [
  { id: 'detail', label: '反馈详情', icon: 'BookOpen' },
  { id: 'reply', label: '回复处理', icon: 'Send' },
  { id: 'history', label: '处理历史', icon: 'Clock' },
];

export const ROUTING_ACTION_LABEL: Record<RoutingAction, string> = {
  'create-ticket': '自动创建工单',
  notify: '发送通知',
  'auto-reply': '自动回复',
};

export function uid(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}`;
}