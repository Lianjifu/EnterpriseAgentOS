/**
 * 渠道管理页面常量 — tabs / 类型 tone / 状态徽章 / 投递徽章 / drawer nav。
 * 颜色/图标等纯展示字段不入 data(由 schema 派生),这里只放可视化映射。
 */
import {
  BellRing, Inbox, Mail, MailCheck, MailX, Megaphone, MessageSquare, Settings2,
  ShieldCheck, Wand2, Webhook, type LucideIcon,
} from 'lucide-react';
import type {
  ChannelKind, ChannelStatus, DeliveryEvent, NotificationChannel, WebhookEntry,
} from '@/api/admin/notifications/schema';

export type TabId = 'overview' | 'email' | 'im' | 'webhook' | 'group';
export type DrawerPanel = 'detail' | 'template' | 'audit';
export type DeliveryStatus = 'delivered' | 'failed' | 'retrying' | 'queued';
export type ExchangeFormat = 'json' | 'yaml';

export const TABS: Array<{ id: TabId; label: string }> = [
  { id: 'overview', label: '渠道总览' },
  { id: 'email', label: '邮件' },
  { id: 'im', label: 'IM' },
  { id: 'webhook', label: 'Webhook' },
  { id: 'group', label: '接收人组' },
];

export const KIND_META: Record<ChannelKind, { label: string; tone: string; icon: LucideIcon }> = {
  email: { label: '邮件', tone: 'bg-sky-50 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300', icon: Mail },
  im: { label: 'IM', tone: 'bg-violet-50 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300', icon: MessageSquare },
  webhook: { label: 'Webhook', tone: 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300', icon: Webhook },
};

export const STATUS_BADGE: Record<ChannelStatus, { label: string; className: string; dot: string }> = {
  active: { label: '正常', className: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300', dot: 'bg-emerald-500' },
  paused: { label: '已暂停', className: 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300', dot: 'bg-amber-500' },
  failed: { label: '失败', className: 'bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300', dot: 'bg-rose-500' },
  draft: { label: '草稿', className: 'bg-[var(--bg-elevated)] text-[var(--text-muted)]', dot: 'bg-[var(--text-muted)]' },
};

export const DELIVERY_BADGE: Record<DeliveryStatus, { label: string; className: string; dot: string }> = {
  delivered: { label: '已送达', className: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300', dot: 'bg-emerald-500' },
  failed: { label: '失败', className: 'bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300', dot: 'bg-rose-500' },
  retrying: { label: '重试中', className: 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300', dot: 'bg-amber-500' },
  queued: { label: '排队中', className: 'bg-sky-50 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300', dot: 'bg-sky-500' },
};

export const DRAWER_NAV_ITEMS: Array<{ id: DrawerPanel; label: string; icon: LucideIcon }> = [
  { id: 'detail', label: '基本信息', icon: Settings2 },
  { id: 'template', label: '消息模板', icon: Wand2 },
  { id: 'audit', label: '投递记录', icon: ShieldCheck },
];

export interface ChannelCardProps {
  channel: NotificationChannel;
  selected: boolean;
  onToggleSelect: (id: string) => void;
  onSelect: (c: NotificationChannel) => void;
  onToggleStar: (id: string) => void;
}

export interface ChannelDetailDrawerProps {
  channel: NotificationChannel | null;
  events: DeliveryEvent[];
  onClose: () => void;
  onChange: (patch: Partial<NotificationChannel>) => void;
  onSave: () => void;
}

export interface WebhookCardProps {
  webhook: WebhookEntry;
}

export const OVERVIEW_ICONS: Record<ChannelKind, { icon: LucideIcon; tone: string }> = {
  email: { icon: MailCheck, tone: 'text-emerald-600' },
  im: { icon: MessageSquare, tone: 'text-violet-600' },
  webhook: { icon: Webhook, tone: 'text-amber-600' },
};

export const ALERT_ICONS = {
  failed: { icon: MailX, tone: 'bg-rose-50 text-rose-700' },
  paused: { icon: BellRing, tone: 'bg-amber-50 text-amber-700' },
  draft: { icon: Inbox, tone: 'bg-[var(--bg-elevated)] text-[var(--text-secondary)]' },
} as const;

export const HERO_ICON = Megaphone;