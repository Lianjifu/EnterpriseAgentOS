/**
 * 管理侧「渠道配置」schema — 对接飞书 / 企业微信 / 钉钉 / Web 会话入口。
 */
export type ChannelKind = 'feishu' | 'wecom' | 'dingtalk' | 'web';
export type ChannelStatus = 'active' | 'paused' | 'failed' | 'draft';
export type WebhookStatus = 'success' | 'failed' | 'pending';

export interface NotificationChannel {
  id: string;
  name: string;
  kind: ChannelKind;
  status: ChannelStatus;
  target: string;
  description: string;
  lastUsed: string;
  successRate: number;
  sentToday: number;
  config: Record<string, string>;
  starred: boolean;
  scope: string[];
  template: string;
}

export interface WebhookEntry {
  id: string;
  name: string;
  url: string;
  method: 'POST' | 'PUT' | 'GET';
  secret: string;
  eventFilter: string[];
  enabled: boolean;
  lastDelivery: string;
  status: WebhookStatus;
  retry: number;
}

export interface GroupMember {
  name: string;
  channel: ChannelKind;
  address: string;
}

export interface NotificationGroup {
  id: string;
  name: string;
  description: string;
  members: GroupMember[];
  rules: number;
}

export interface DeliveryEvent {
  id: string;
  channelId: string;
  channelName: string;
  kind: ChannelKind;
  subject: string;
  recipient: string;
  status: 'delivered' | 'failed' | 'retrying' | 'queued';
  deliveredAt: string;
  error?: string;
}

export interface CreateChannelVars {
  name: string;
  kind: ChannelKind;
  target: string;
  description?: string;
  config?: Record<string, string>;
}

export interface UpdateChannelVars {
  id: string;
  patch: Partial<NotificationChannel>;
}

export interface CreateGroupVars {
  name: string;
  description?: string;
  members: GroupMember[];
}

export interface BatchStatusVars {
  ids: string[];
  status: ChannelStatus;
}

export interface NotificationCounts {
  total: number;
  active: number;
  failed: number;
  paused: number;
  draft: number;
  sentToday: number;
}
