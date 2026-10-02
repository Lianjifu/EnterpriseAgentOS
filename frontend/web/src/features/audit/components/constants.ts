/**
 * AdminToolAudit 常量 — TABS / severity / outcome / category 颜色与图标。
 */
import { Boxes, FileLock, FileSearch, KeyRound, type LucideIcon, Zap } from 'lucide-react';
import type {
  AuditCategory, AuditDrawerPanel, AuditOutcome, AuditRuleAction, AuditSeverity, AuditTabId,
} from '../schema';

export const TABS: Array<{ id: AuditTabId; label: string }> = [
  { id: 'overview', label: '审计总览' },
  { id: 'record', label: '调用记录' },
  { id: 'risk', label: '风险事件' },
  { id: 'permission', label: '权限审查' },
  { id: 'rule', label: '审计规则' },
];

export const SEVERITY_BADGE: Record<AuditSeverity, { label: string; className: string; dot: string }> = {
  low: { label: '低风险', className: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300', dot: 'bg-emerald-500' },
  medium: { label: '中风险', className: 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300', dot: 'bg-amber-500' },
  high: { label: '高风险', className: 'bg-orange-50 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300', dot: 'bg-orange-500' },
  critical: { label: '严重', className: 'bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300 ring-2 ring-rose-200', dot: 'bg-rose-600' },
};

export const OUTCOME_BADGE: Record<AuditOutcome, { label: string; className: string }> = {
  allowed: { label: '允许', className: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300' },
  denied: { label: '拒绝', className: 'bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300' },
  pending: { label: '待审批', className: 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300' },
  timeout: { label: '超时', className: 'bg-sky-50 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300' },
};

export const CATEGORY_META: Record<AuditCategory, { label: string; tone: string; icon: LucideIcon }> = {
  tool: { label: '工具', tone: 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300', icon: Zap },
  data: { label: '数据', tone: 'bg-violet-50 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300', icon: FileSearch },
  auth: { label: '鉴权', tone: 'bg-sky-50 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300', icon: KeyRound },
  mcp: { label: 'MCP', tone: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300', icon: Boxes },
};

export const RULE_ACTION_LABEL: Record<AuditRuleAction, string> = {
  log: '记录',
  alert: '告警',
  confirm: '需审批',
  block: '阻断',
};

export const DRAWER_NAV: Array<{ id: AuditDrawerPanel; label: string; icon: LucideIcon }> = [
  { id: 'overview', label: '调用概要', icon: FileSearch },
  { id: 'args', label: '入参与输出', icon: FileLock },
  { id: 'rule', label: '命中规则', icon: Zap },
  { id: 'log', label: '审计日志', icon: KeyRound },
];

export const RULE_FILTER: Array<{ id: 'all' | AuditCategory; label: string }> = [
  { id: 'all', label: '全部类型' },
  { id: 'tool', label: '工具' },
  { id: 'data', label: '数据' },
  { id: 'auth', label: '鉴权' },
  { id: 'mcp', label: 'MCP' },
];