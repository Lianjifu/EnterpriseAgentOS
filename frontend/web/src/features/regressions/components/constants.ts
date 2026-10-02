/**
 * AdminRegressions — 静态常量。
 * RISK_BADGE.icon / DRAWER_NAV_ITEMS.icon 用字符串标识符,
 * 在 TrackCard / DrawerSidebar 里通过 iconMap 解析为 lucide 组件。
 */
import type { AlertChannel, AlertMetric, AlertOperator, DrawerPanel, RegressionRisk, RegressionStatus, TabId } from '../schema';

export const TABS: Array<{ id: TabId; label: string }> = [
  { id: 'overview', label: '追踪总览' },
  { id: 'baseline', label: '基线对比' },
  { id: 'risk', label: '风险面板' },
  { id: 'timeline', label: '时间线' },
  { id: 'alert', label: '告警规则' },
];

export const STATUS_BADGE: Record<RegressionStatus | 'info', { label: string; className: string; dot: string }> = {
  stable: { label: '稳定', className: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300', dot: 'bg-emerald-500' },
  improving: { label: '持续优化', className: 'bg-sky-50 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300', dot: 'bg-sky-500' },
  regressed: { label: '已退化', className: 'bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300', dot: 'bg-rose-500' },
  investigating: { label: '排查中', className: 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300', dot: 'bg-amber-500' },
  info: { label: '信息', className: 'bg-[var(--bg-elevated)] text-[var(--text-muted)]', dot: 'bg-[var(--text-muted)]' },
};

export const RISK_BADGE: Record<RegressionRisk, { label: string; className: string; icon: string }> = {
  low: { label: '低风险', className: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300', icon: 'ShieldCheck' },
  medium: { label: '中等风险', className: 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300', icon: 'ShieldQuestion' },
  high: { label: '高风险', className: 'bg-orange-50 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300', icon: 'AlertTriangle' },
  critical: { label: '严重', className: 'bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300', icon: 'ShieldAlert' },
};

export const METRIC_LABEL: Record<AlertMetric, string> = {
  passRate: '通过率',
  latency: 'P95 延迟',
  cost: '单次成本',
  score: '平均评分',
};

export const OPERATOR_LABEL: Record<AlertOperator, string> = {
  gt: '高于',
  lt: '低于',
};

export const METRIC_UNIT: Record<AlertMetric, string> = {
  passRate: '%',
  latency: ' ms',
  cost: ' ¥',
  score: '',
};

export const CHANNEL_META: Record<AlertChannel, { icon: string; label: string; tone: string }> = {
  email: { icon: 'Mail', label: '邮件', tone: 'bg-sky-50 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300' },
  sms: { icon: 'MessageSquare', label: '短信', tone: 'bg-violet-50 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300' },
  webhook: { icon: 'Webhook', label: 'Webhook', tone: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300' },
};

export const DRAWER_NAV_ITEMS: Array<{ id: DrawerPanel; label: string; icon: string }> = [
  { id: 'basic', label: '基本信息', icon: 'Settings' },
  { id: 'baseline', label: '基线对比', icon: 'LineChart' },
  { id: 'cases', label: '回归用例', icon: 'ListChecks' },
  { id: 'history', label: '变更历史', icon: 'History' },
];

export const STATUS_FILTER: Array<{ id: 'all' | RegressionStatus; label: string }> = [
  { id: 'all', label: '全部状态' },
  { id: 'stable', label: '稳定' },
  { id: 'improving', label: '持续优化' },
  { id: 'regressed', label: '已退化' },
  { id: 'investigating', label: '排查中' },
];

export const RISK_FILTER: Array<{ id: 'all' | RegressionRisk; label: string }> = [
  { id: 'all', label: '全部风险' },
  { id: 'low', label: '低风险' },
  { id: 'medium', label: '中等风险' },
  { id: 'high', label: '高风险' },
  { id: 'critical', label: '严重' },
];

export function uid(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}`;
}

export function regressionStatusLabel(s: RegressionStatus | 'info') {
  return STATUS_BADGE[s].label;
}

export function regressionStatusClass(s: RegressionStatus | 'info') {
  return STATUS_BADGE[s].className;
}