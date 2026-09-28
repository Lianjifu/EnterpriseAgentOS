/**
 * 管理侧「额度管理」fixtures — 与原 AdminQuotas.tsx 内联 INITIAL_* 对应。
 */
import type { EnterpriseBudget, DepartmentQuota, UsageMetric, AlertRule } from '@/api/admin/quotas/schema';

export const mockBudgets: EnterpriseBudget[] = [
  { id: 'bg-001', name: '2026 年企业总预算', period: 'yearly', totalCap: 1_200_000, used: 412_800, forecast: 1_080_000, rollover: false, alertThreshold: 80, status: 'healthy', effectiveDate: '2026-01-01', owner: '张敏(财务总监)', description: '覆盖全集团 AI / 模型调用 / 存储的整体预算。' },
  { id: 'bg-002', name: '2026 Q2 运营预算', period: 'quarterly', totalCap: 320_000, used: 248_900, forecast: 312_500, rollover: true, alertThreshold: 75, status: 'warning', effectiveDate: '2026-04-01', owner: '李雷(运营总监)', description: '客服与营销智能体的当季运营预算。' },
  { id: 'bg-003', name: '研发实验预算', period: 'monthly', totalCap: 60_000, used: 62_400, forecast: 72_000, rollover: false, alertThreshold: 90, status: 'exceeded', effectiveDate: '2026-04-01', owner: '王芳(研发负责人)', description: '研发团队的实验调用预算。' },
  { id: 'bg-004', name: '试点业务预算', period: 'monthly', totalCap: 40_000, used: 8_200, forecast: 24_000, rollover: false, alertThreshold: 80, status: 'frozen', effectiveDate: '2026-09-01', owner: '陈昊', description: '因业务方向调整暂时冻结。' },
];

export const mockDepartments: DepartmentQuota[] = [
  { id: 'dp-001', name: '客户成功部', enterpriseId: 'bg-002', manager: '刘琪', members: 36, allocated: 120_000, used: 98_500, pct: 82, rank: 1, topChannel: '客服智能体', lastSpikeAt: '今天 10:14', trend: [30, 35, 40, 45, 50, 55, 60, 65, 72, 78, 82, 88] },
  { id: 'dp-002', name: '产品研发', enterpriseId: 'bg-001', manager: '王芳', members: 24, allocated: 200_000, used: 145_200, pct: 73, rank: 2, topChannel: '研发实验', lastSpikeAt: '昨天 19:30', trend: [40, 42, 45, 50, 52, 58, 60, 65, 68, 70, 72, 75] },
  { id: 'dp-003', name: '市场部', enterpriseId: 'bg-002', manager: '周宁', members: 18, allocated: 80_000, used: 42_300, pct: 53, rank: 3, topChannel: '营销智能体', lastSpikeAt: '3 天前', trend: [10, 12, 14, 16, 18, 22, 24, 28, 30, 32, 35, 38] },
  { id: 'dp-004', name: '运营分析', enterpriseId: 'bg-002', manager: '李雷', members: 12, allocated: 60_000, used: 38_900, pct: 65, rank: 4, topChannel: '运营智能体', lastSpikeAt: '昨天 14:22', trend: [20, 22, 24, 28, 30, 32, 35, 38, 40, 42, 45, 48] },
  { id: 'dp-005', name: '法务合规', enterpriseId: 'bg-001', manager: '韩雪', members: 6, allocated: 30_000, used: 12_800, pct: 43, rank: 5, topChannel: '合同审查', lastSpikeAt: '5 天前', trend: [5, 6, 7, 8, 9, 10, 10, 11, 11, 12, 12, 13] },
  { id: 'dp-006', name: '人力资源', enterpriseId: 'bg-001', manager: '陈嘉', members: 9, allocated: 25_000, used: 6_400, pct: 26, rank: 6, topChannel: '招聘助手', lastSpikeAt: '上周', trend: [2, 3, 3, 4, 4, 4, 5, 5, 5, 6, 6, 6] },
];

export const mockUsage: UsageMetric[] = [
  { id: 'us-001', category: 'token', label: '本月 Token 用量', unit: 'M', used: 92, total: 120, delta: 12.5, trend: [40, 42, 45, 48, 52, 55, 58, 62, 65, 68, 72, 76] },
  { id: 'us-002', category: 'tool', label: '本月工具调用', unit: '万次', used: 14, total: 30, delta: -3.4, trend: [60, 62, 60, 58, 56, 54, 52, 50, 48, 46, 44, 42] },
  { id: 'us-003', category: 'storage', label: '存储用量', unit: 'GB', used: 220, total: 500, delta: 8.2, trend: [180, 185, 190, 192, 198, 202, 205, 208, 212, 215, 218, 220] },
  { id: 'us-004', category: 'embedding', label: 'Embedding 用量', unit: 'M', used: 36, total: 100, delta: 5.1, trend: [22, 24, 26, 27, 28, 29, 30, 31, 32, 33, 34, 36] },
];

export const mockAlerts: AlertRule[] = [
  { id: 'al-001', name: 'Token 用量月度预警', scope: 'enterprise', severity: 'critical', metric: '月度 Token', threshold: 90, enabled: true, cooldown: '24h', notify: ['admin@'], lastTriggered: '昨天 16:42', description: '当企业 Token 用量超过月度预算 90% 时告警。' },
  { id: 'al-002', name: '部门额度超支告警', scope: 'department', severity: 'warning', metric: '部门使用率', threshold: 80, enabled: true, cooldown: '12h', notify: ['manager@'], lastTriggered: '今天 09:00', description: '部门使用率 ≥ 80% 时通知部门管理员。' },
  { id: 'al-003', name: '工具调用异常波动', scope: 'channel', severity: 'warning', metric: '工具调用 QPS', threshold: 200, enabled: true, cooldown: '1h', notify: ['oncall@'], lastTriggered: '上周', description: '工具调用 QPS 突增 ≥ 200 时告警。' },
  { id: 'al-004', name: '存储用量告警', scope: 'enterprise', severity: 'info', metric: '存储 GB', threshold: 400, enabled: true, cooldown: '24h', notify: ['admin@'], lastTriggered: '—', description: '当存储用量达到 400GB 时通知管理员。' },
  { id: 'al-005', name: 'Embedding 配额监控', scope: 'channel', severity: 'info', metric: 'Embedding 余额', threshold: 20, enabled: false, cooldown: '6h', notify: ['admin@'], lastTriggered: '—', description: 'Embedding 余额低于 20M 时提示管理员。' },
];