/**
 * AdminRegressions — 回归追踪 schema。
 * 类型 + 过滤参数 + 写操作变量;不引用 React 或 lucide。
 */
export type TabId = 'overview' | 'baseline' | 'risk' | 'timeline' | 'alert';
export type RegressionStatus = 'stable' | 'improving' | 'regressed' | 'investigating';
export type RegressionRisk = 'low' | 'medium' | 'high' | 'critical';
export type AlertMetric = 'passRate' | 'latency' | 'cost' | 'score';
export type AlertOperator = 'gt' | 'lt';
export type AlertChannel = 'email' | 'sms' | 'webhook';
export type DrawerPanel = 'basic' | 'baseline' | 'cases' | 'history';
export type ExchangeFormat = 'json' | 'yaml';

export interface BaselineMetric {
  passRate: number;
  avgScore: number;
  latencyMs: number;
  cost: number;
}

export interface RegressionTrack {
  id: string;
  name: string;
  agent: string;
  owner: string;
  status: RegressionStatus;
  risk: RegressionRisk;
  baselineVersion: string;
  currentVersion: string;
  passRateDelta: number;
  latencyDelta: number;
  costDelta: number;
  scoreDelta: number;
  baseline: BaselineMetric;
  current: BaselineMetric;
  passRateTrend: number[];
  latencyTrend: number[];
  costTrend: number[];
  lastCheckedAt: string;
  cases: number;
  starred: boolean;
  schedule: string;
  tags: string[];
  notes: string;
  history: Array<{ checkedAt: string; status: RegressionStatus; passRateDelta: number; notes: string }>;
  casesList: Array<{ id: string; name: string; pass: boolean; delta: string }>;
}

export interface AlertRule {
  id: string;
  name: string;
  metric: AlertMetric;
  operator: AlertOperator;
  threshold: number;
  channels: AlertChannel[];
  enabled: boolean;
  scope: string;
  description: string;
  cooldown: string;
}

export interface TimelineEvent {
  id: string;
  type: 'detected' | 'resolved' | 'baseline-set' | 'investigated';
  trackId: string;
  trackName: string;
  message: string;
  occurredAt: string;
  severity: RegressionStatus | 'info';
}