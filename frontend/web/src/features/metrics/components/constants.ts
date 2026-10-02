/**
 * AdminMetrics 常量 — TABS / severity / drawer nav / 时间范围。
 */
import { BarChart3, Hash, LineChart, type LucideIcon, Settings2 } from 'lucide-react';
import type {
  MetricsDrawerPanel, MetricsSeverity, MetricsTabId, MetricsTimeRange,
} from '../schema';

export const TABS: Array<{ id: MetricsTabId; label: string }> = [
  { id: 'overview', label: '指标总览' },
  { id: 'availability', label: '可用率' },
  { id: 'latency', label: '延迟分析' },
  { id: 'token', label: 'Token 与成本' },
  { id: 'dashboard', label: '看板与告警' },
];

export const SEVERITY_META: Record<MetricsSeverity, { label: string; className: string; dot: string }> = {
  good: { label: '健康', className: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300', dot: 'bg-emerald-500' },
  warn: { label: '关注', className: 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300', dot: 'bg-amber-500' },
  bad: { label: '异常', className: 'bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300', dot: 'bg-rose-500' },
};

export const DRAWER_NAV: Array<{ id: MetricsDrawerPanel; label: string; icon: LucideIcon }> = [
  { id: 'overview', label: '指标概要', icon: Settings2 },
  { id: 'breakdown', label: '分布拆解', icon: BarChart3 },
  { id: 'trend', label: '趋势对比', icon: LineChart },
  { id: 'alert', label: '告警关联', icon: Hash },
];

export const TIME_RANGES: Array<{ id: MetricsTimeRange; label: string }> = [
  { id: '1h', label: '1 小时' },
  { id: '24h', label: '24 小时' },
  { id: '7d', label: '最近 7 天' },
  { id: '30d', label: '最近 30 天' },
];

export const PERCENTILES: Array<{ id: 'p50' | 'p95' | 'p99'; label: string }> = [
  { id: 'p50', label: 'P50' },
  { id: 'p95', label: 'P95' },
  { id: 'p99', label: 'P99' },
];