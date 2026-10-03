/**
 * 渠道配置页面常量 — 平台类型 / 状态徽章 / 会话记录徽章。
 */
import {
  Globe, Megaphone, MessageCircle, MessageSquare, MessagesSquare,
  Settings2, ShieldCheck, Wand2, type LucideIcon,
} from 'lucide-react';
import type {
  ChannelKind, ChannelStatus, DeliveryEvent, NotificationChannel, WebhookEntry,
} from '../schema';

export type DrawerPanel = 'detail' | 'template' | 'audit';
export type DeliveryStatus = 'delivered' | 'failed' | 'retrying' | 'queued';
export type ExchangeFormat = 'json' | 'yaml';

export const CHANNEL_KINDS: ChannelKind[] = ['feishu', 'wecom', 'dingtalk', 'web'];

export const KIND_META: Record<ChannelKind, {
  label: string;
  tone: string;
  icon: LucideIcon;
  targetLabel: string;
  targetPlaceholder: string;
  summary: string;
}> = {
  feishu: {
    label: '飞书',
    tone: 'bg-sky-50 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300',
    icon: MessageSquare,
    targetLabel: '机器人 / 应用名',
    targetPlaceholder: '例如:客服助手',
    summary: '通过飞书应用与机器人接入对话。',
  },
  wecom: {
    label: '企业微信',
    tone: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
    icon: MessagesSquare,
    targetLabel: '应用名称',
    targetPlaceholder: '例如:客服接待',
    summary: '通过企业微信自建应用接入对话。',
  },
  dingtalk: {
    label: '钉钉',
    tone: 'bg-violet-50 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300',
    icon: MessageCircle,
    targetLabel: '机器人 / 群名称',
    targetPlaceholder: '例如:运维值班机器人',
    summary: '通过钉钉企业内部应用与机器人接入对话。',
  },
  web: {
    label: 'Web',
    tone: 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
    icon: Globe,
    targetLabel: '站点 / 嵌入名称',
    targetPlaceholder: '例如:官网智能客服',
    summary: '在工作台或官网嵌入 Web 对话窗口。',
  },
};

export interface ChannelConfigField {
  key: string;
  label: string;
  placeholder: string;
  secret?: boolean;
}

export const CHANNEL_CONFIG_FIELDS: Record<ChannelKind, ChannelConfigField[]> = {
  feishu: [
    { key: 'appId', label: 'App ID', placeholder: 'cli_xxx' },
    { key: 'appSecret', label: 'App Secret', placeholder: '应用密钥', secret: true },
    { key: 'verificationToken', label: 'Verification Token', placeholder: '事件订阅 Token', secret: true },
    { key: 'encryptKey', label: 'Encrypt Key', placeholder: 'Encrypt Key（可选）', secret: true },
  ],
  wecom: [
    { key: 'corpId', label: '企业 ID (CorpId)', placeholder: 'wwxxxx' },
    { key: 'agentId', label: '应用 AgentId', placeholder: '1000002' },
    { key: 'secret', label: 'Secret', placeholder: '应用 Secret', secret: true },
    { key: 'token', label: '回调 Token', placeholder: '回调 Token', secret: true },
    { key: 'encodingAesKey', label: 'EncodingAESKey', placeholder: '43 位 EncodingAESKey', secret: true },
  ],
  dingtalk: [
    { key: 'appKey', label: 'AppKey', placeholder: 'dingxxxx' },
    { key: 'appSecret', label: 'AppSecret', placeholder: '应用密钥', secret: true },
    { key: 'robotCode', label: 'Robot Code', placeholder: '机器人编码' },
    { key: 'corpId', label: '企业 CorpId', placeholder: 'dingxxxx' },
  ],
  web: [
    { key: 'siteUrl', label: '站点地址', placeholder: 'https://console.example.com' },
    { key: 'allowedOrigins', label: '允许的来源', placeholder: 'https://app.example.com' },
    { key: 'embedPath', label: '嵌入路径', placeholder: '/embed/chat' },
    { key: 'widgetToken', label: 'Widget Token', placeholder: '公开嵌入令牌', secret: true },
  ],
};

const REQUIRED_CONFIG_KEYS: Record<ChannelKind, string[]> = {
  feishu: ['appId', 'appSecret'],
  wecom: ['corpId', 'secret'],
  dingtalk: ['appKey', 'appSecret'],
  web: ['siteUrl'],
};

export function defaultChannelConfig(kind: ChannelKind, seed: Record<string, string> = {}): Record<string, string> {
  const next: Record<string, string> = {};
  for (const field of CHANNEL_CONFIG_FIELDS[kind]) next[field.key] = seed[field.key] ?? '';
  return next;
}

export function defaultChannelTemplate(kind: ChannelKind): string {
  if (kind === 'web') return '你好，我是企业智能助手。请直接在对话框里提问。';
  return '你好，我是企业智能助手，可在本会话中回答问题、调用技能与知识库。';
}

export function channelConfigReady(kind: ChannelKind, config: Record<string, string>): boolean {
  return REQUIRED_CONFIG_KEYS[kind].every((key) => (config[key] ?? '').trim().length > 0);
}

export function callbackHint(kind: ChannelKind): string {
  return `https://api.qizhida.example/channels/${kind}/callback`;
}

export const STATUS_BADGE: Record<ChannelStatus, { label: string; className: string; dot: string }> = {
  active: { label: '已接入', className: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300', dot: 'bg-emerald-500' },
  paused: { label: '已暂停', className: 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300', dot: 'bg-amber-500' },
  failed: { label: '鉴权失败', className: 'bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300', dot: 'bg-rose-500' },
  draft: { label: '草稿', className: 'bg-[var(--bg-elevated)] text-[var(--text-muted)]', dot: 'bg-[var(--text-muted)]' },
};

export const DELIVERY_BADGE: Record<DeliveryStatus, { label: string; className: string; dot: string }> = {
  delivered: { label: '已回复', className: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300', dot: 'bg-emerald-500' },
  failed: { label: '失败', className: 'bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300', dot: 'bg-rose-500' },
  retrying: { label: '重试中', className: 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300', dot: 'bg-amber-500' },
  queued: { label: '排队中', className: 'bg-sky-50 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300', dot: 'bg-sky-500' },
};

export const DRAWER_NAV_ITEMS: Array<{ id: DrawerPanel; label: string; icon: LucideIcon }> = [
  { id: 'detail', label: '接入配置', icon: Settings2 },
  { id: 'template', label: '对话设置', icon: Wand2 },
  { id: 'audit', label: '会话记录', icon: ShieldCheck },
];

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

export const HERO_ICON = Megaphone;
