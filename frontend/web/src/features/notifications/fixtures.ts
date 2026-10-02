/**
 * 管理侧「渠道管理」fixtures — 与原 AdminNotifications.tsx 内联 INITIAL_* 对应。
 * dev:demo 通过 mock-handler.ts 返回;测试通过 seedPageQueryData 注入。
 */
import type {
  NotificationChannel,
  WebhookEntry,
  NotificationGroup,
  DeliveryEvent,
} from './schema';

export const mockChannels: NotificationChannel[] = [
  { id: 'ch-001', name: '客服告警邮箱', kind: 'email', status: 'active', target: 'alert@example.com', description: '客服相关告警与重要通知。', lastUsed: '5 分钟前', successRate: 99.4, sentToday: 12, config: { host: 'smtp.example.com', port: '465', from: 'alert@example.com' }, starred: true, scope: ['客服', '运营'], template: '【告警】{title}\n{body}' },
  { id: 'ch-002', name: '管理员日报', kind: 'email', status: 'active', target: 'admin@example.com', description: '每日 9:00 推送前一日运营数据摘要。', lastUsed: '今天 09:00', successRate: 100, sentToday: 1, config: { host: 'smtp.example.com', port: '465', from: 'report@example.com' }, starred: false, scope: ['运营', '财务'], template: '【日报】{date}\n{summary}' },
  { id: 'ch-003', name: '团队 Slack', kind: 'im', status: 'active', target: '#ops-alerts', description: '运维告警与系统事件统一推送到 Slack 频道。', lastUsed: '2 分钟前', successRate: 98.7, sentToday: 24, config: { workspace: 'eos-team', channel: '#ops-alerts' }, starred: true, scope: ['运维'], template: ':rotating_light: *{title}*\n{body}' },
  { id: 'ch-004', name: '钉钉运维群', kind: 'im', status: 'paused', target: 'ops-dingtalk', description: '钉钉机器人(暂已暂停)。', lastUsed: '3 天前', successRate: 95.2, sentToday: 0, config: { workspace: 'eos-dingde', channel: '运维' }, starred: false, scope: ['运维'], template: '**{title}**\n{body}' },
  { id: 'ch-005', name: '企业微信 · 客服', kind: 'im', status: 'failed', target: 'wx-cs-bot', description: '企业微信客服机器人(最近一次鉴权失败)。', lastUsed: '昨天', successRate: 60.5, sentToday: 0, config: { workspace: 'eos-wx', channel: '客服' }, starred: false, scope: ['客服'], template: '{title}\n{body}' },
  { id: 'ch-006', name: 'CRM 同步 Webhook', kind: 'webhook', status: 'active', target: 'https://crm.example.com/api/eos', description: '智能体会话结果同步到 CRM。', lastUsed: '1 分钟前', successRate: 99.9, sentToday: 142, config: { method: 'POST', secret: 'whsec-****-a3f1' }, starred: false, scope: ['客户成功'], template: '{event}\n{payload}' },
  { id: 'ch-007', name: '审计日志归档', kind: 'webhook', status: 'draft', target: 'https://audit.example.com/ingest', description: '将审计事件投递到归档系统(草稿状态)。', lastUsed: '从未', successRate: 0, sentToday: 0, config: { method: 'POST', secret: 'whsec-****-b4e2' }, starred: false, scope: ['合规'], template: '{event}' },
];

export const mockWebhooks: WebhookEntry[] = [
  { id: 'wh-001', name: 'CRM 同步', url: 'https://crm.example.com/api/eos', method: 'POST', secret: 'whsec-****-a3f1', eventFilter: ['agent.session.completed', 'agent.session.failed'], enabled: true, lastDelivery: '1 分钟前', status: 'success', retry: 0 },
  { id: 'wh-002', name: '审计日志归档', url: 'https://audit.example.com/ingest', method: 'POST', secret: 'whsec-****-b4e2', eventFilter: ['audit.*'], enabled: false, lastDelivery: '—', status: 'pending', retry: 0 },
  { id: 'wh-003', name: '告警回写服务', url: 'https://alert.example.com/callback', method: 'PUT', secret: 'whsec-****-c8d0', eventFilter: ['alert.fired'], enabled: true, lastDelivery: '昨天', status: 'failed', retry: 3 },
];

export const mockGroups: NotificationGroup[] = [
  { id: 'gp-001', name: '全员运营组', description: '覆盖客服、运营、市场等部门负责人。', members: [{ name: '张敏', channel: 'email', address: 'zhang@example.com' }, { name: '李雷', channel: 'im', address: '#ops-alerts' }, { name: '王芳', channel: 'email', address: 'wang@example.com' }], rules: 6 },
  { id: 'gp-002', name: '运维 OnCall', description: '7x24 接收系统事件与告警。', members: [{ name: '陈昊', channel: 'im', address: '@chenhao' }, { name: '刘琪', channel: 'im', address: 'phone:13900000000' }], rules: 12 },
  { id: 'gp-003', name: '财务关键组', description: '财务告警与日报订阅。', members: [{ name: '韩雪', channel: 'email', address: 'han@example.com' }, { name: '财务机器人', channel: 'webhook', address: 'finance-webhook' }], rules: 3 },
];

export const mockEvents: DeliveryEvent[] = [
  { id: 'ev-001', channelId: 'ch-001', channelName: '客服告警邮箱', kind: 'email', subject: '【告警】客户成功部使用率超 80%', recipient: 'alert@example.com', status: 'delivered', deliveredAt: '今天 09:14' },
  { id: 'ev-002', channelId: 'ch-003', channelName: '团队 Slack', kind: 'im', subject: ':rotating_light: 智谱 · 杭州不可用', recipient: '#ops-alerts', status: 'delivered', deliveredAt: '今天 09:14' },
  { id: 'ev-003', channelId: 'ch-005', channelName: '企业微信 · 客服', kind: 'im', subject: '鉴权失败:access_token 无效', recipient: 'wx-cs-bot', status: 'failed', deliveredAt: '今天 09:11', error: 'access_token 已过期' },
  { id: 'ev-004', channelId: 'ch-006', channelName: 'CRM 同步 Webhook', kind: 'webhook', subject: 'agent.session.completed', recipient: 'https://crm.example.com/api/eos', status: 'delivered', deliveredAt: '今天 09:08' },
  { id: 'ev-005', channelId: 'ch-001', channelName: '客服告警邮箱', kind: 'email', subject: '【日报】2026-09-27', recipient: 'admin@example.com', status: 'delivered', deliveredAt: '昨天 09:00' },
  { id: 'ev-006', channelId: 'ch-004', channelName: '钉钉运维群', kind: 'im', subject: '通道暂停中', recipient: 'ops-dingtalk', status: 'queued', deliveredAt: '今天 09:00' },
];