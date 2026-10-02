/**
 * 管理侧「额度管理」schema — Budget / DepartmentQuota / UsageMetric / AlertRule
 * 4 类实体 + 4 个 mutation 入参。
 */
export type TabId = 'overview' | 'enterprise' | 'department' | 'usage' | 'alert';
export type BudgetPeriod = 'monthly' | 'quarterly' | 'yearly';
export type BudgetStatus = 'healthy' | 'warning' | 'exceeded' | 'frozen';
export type AlertSeverity = 'info' | 'warning' | 'critical';
export type AlertScope = 'enterprise' | 'department' | 'channel';
export type UsageCategory = 'token' | 'tool' | 'storage' | 'embedding';
export type ExchangeFormat = 'json' | 'yaml' | 'csv';

export interface EnterpriseBudget {
  id: string;
  name: string;
  period: BudgetPeriod;
  totalCap: number;
  used: number;
  forecast: number;
  rollover: boolean;
  alertThreshold: number;
  status: BudgetStatus;
  effectiveDate: string;
  owner: string;
  description: string;
}

export interface DepartmentQuota {
  id: string;
  name: string;
  enterpriseId: string;
  manager: string;
  members: number;
  allocated: number;
  used: number;
  pct: number;
  rank: number;
  topChannel: string;
  lastSpikeAt: string;
  trend: number[];
}

export interface UsageMetric {
  id: string;
  category: UsageCategory;
  label: string;
  unit: string;
  used: number;
  total: number;
  delta: number;
  trend: number[];
}

export interface AlertRule {
  id: string;
  name: string;
  scope: AlertScope;
  severity: AlertSeverity;
  metric: string;
  threshold: number;
  enabled: boolean;
  cooldown: string;
  notify: string[];
  lastTriggered: string;
  description: string;
}

export interface CreateBudgetVars {
  name: string;
  period: BudgetPeriod;
  totalCap: number;
  alertThreshold: number;
  rollover: boolean;
  owner: string;
}

export interface CreateAlertVars {
  name: string;
  scope: AlertScope;
  severity: AlertSeverity;
  metric: string;
  threshold: number;
  cooldown: string;
  notify: string;
}

export interface UpdateBudgetVars {
  id: string;
  patch: Partial<EnterpriseBudget>;
}

export interface ToggleAlertVars {
  id: string;
}