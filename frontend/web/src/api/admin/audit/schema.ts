/**
 * AdminToolAudit schema — 审计条目 / 风险事件 / 审计规则 / 权限范围 4 类实体。
 */
export type AuditTabId = 'overview' | 'record' | 'risk' | 'permission' | 'rule';
export type AuditSeverity = 'low' | 'medium' | 'high' | 'critical';
export type AuditOutcome = 'allowed' | 'denied' | 'pending' | 'timeout';
export type AuditCategory = 'tool' | 'data' | 'auth' | 'mcp';
export type AuditRuleAction = 'alert' | 'block' | 'confirm' | 'log';
export type AuditDrawerPanel = 'overview' | 'args' | 'rule' | 'log';

export interface AuditEntry {
  id: string;
  category: AuditCategory;
  toolName: string;
  actor: string;
  sessionId: string;
  severity: AuditSeverity;
  outcome: AuditOutcome;
  hasSensitive: boolean;
  riskScore: number;
  args: string;
  argsLabel: string;
  scope: string;
  occurredAt: string;
  retryCount: number;
  reason?: string;
  starred?: boolean;
}

export interface RiskEvent {
  id: string;
  title: string;
  severity: AuditSeverity;
  category: AuditCategory;
  sessionId: string;
  toolName: string;
  occurredAt: string;
  message: string;
  resolved: boolean;
  affectedUser: string;
  ruleId: string;
}

export interface AuditRule {
  id: string;
  name: string;
  category: AuditCategory;
  condition: string;
  action: AuditRuleAction;
  severity: AuditSeverity;
  enabled: boolean;
  hitCount: number;
  description: string;
}

export interface PermissionScope {
  id: string;
  role: string;
  scopes: string[];
  userCount: number;
  lastReview: string;
  reviewer: string;
}

export interface AuditStats {
  total: number;
  denied: number;
  critical: number;
  sensitive: number;
  allowed: number;
  blocked: number;
  pending: number;
  timeout: number;
  denyRate: number;
  byCategory: Record<AuditCategory, number>;
}

export interface CreateAuditRuleInput {
  name: string;
  category: AuditCategory;
  condition: string;
  action: AuditRuleAction;
  severity: AuditSeverity;
}