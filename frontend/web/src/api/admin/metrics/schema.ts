/**
 * AdminMetrics schema — 模型指标 / 延迟点 / 成本拆解 / 看板 / 告警阈值。
 */
export type MetricsTabId = 'overview' | 'availability' | 'latency' | 'token' | 'dashboard';
export type MetricsSeverity = 'good' | 'warn' | 'bad';
export type MetricsTimeRange = '1h' | '24h' | '7d' | '30d';
export type MetricsDrawerPanel = 'overview' | 'breakdown' | 'trend' | 'alert';
export type LatencyPercentile = 'p50' | 'p95' | 'p99';
export type ThresholdComparator = '>' | '<' | '>=' | '<=';

export interface LatencyPoint {
  t: string;
  p50: number;
  p95: number;
  p99: number;
}

export interface ModelMetric {
  id: string;
  model: string;
  provider: string;
  availability: number;
  p50: number;
  p95: number;
  p99: number;
  tokensIn: number;
  tokensOut: number;
  cost: number;
  calls: number;
  errorRate: number;
}

export interface CostBreakdown {
  id: string;
  bucket: string;
  amount: number;
  pct: number;
}

export interface MetricsDashboard {
  id: string;
  name: string;
  range: MetricsTimeRange;
  panels: number;
  owner: string;
  starred: boolean;
}

export interface ThresholdRule {
  id: string;
  metric: string;
  comparator: ThresholdComparator;
  value: number;
  severity: MetricsSeverity;
  enabled: boolean;
  hitCount: number;
  window: string;
}

export interface MetricsStats {
  avgAvail: number;
  avgP95: number;
  totalTokens: number;
  totalCost: number;
  errorRate: number;
  totalInputTokens: number;
  totalOutputTokens: number;
}