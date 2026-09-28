/**
 * AdminOperations 视觉常量 — 5 个 tab / session / span / severity 徽章与图标映射。
 */
import {
  Boxes, FileText, Brain, Sparkles, Wrench, Workflow,
  AlertCircle, AlertTriangle, RefreshCw, CheckCircle2,
  ListTree, Settings2,
} from 'lucide-react';
import type {
  SessionStatus, SpanKind, Severity, DrawerPanel, TabId,
} from '@/api/admin/operations/schema';

export const TABS: Array<{ id: TabId; label: string }> = [
  { id: 'overview', label: '链路总览' },
  { id: 'session', label: '会话列表' },
  { id: 'trace', label: '轨迹详情' },
  { id: 'kind', label: '类型分布' },
  { id: 'incident', label: '异常事件' },
];

export const SESSION_BADGE: Record<SessionStatus, { label: string; className: string; dot: string }> = {
  running: { label: '执行中', className: 'bg-sky-50 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300', dot: 'bg-sky-500' },
  success: { label: '完成', className: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300', dot: 'bg-emerald-500' },
  partial: { label: '部分成功', className: 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300', dot: 'bg-amber-500' },
  failed: { label: '失败', className: 'bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300', dot: 'bg-rose-500' },
};

export const SESSION_STATUS_ICON: Record<SessionStatus, typeof CheckCircle2> = {
  success: CheckCircle2,
  running: RefreshCw,
  partial: AlertCircle,
  failed: AlertTriangle,
};

export const SPAN_KIND_META: Record<SpanKind, { label: string; tone: string; icon: typeof Sparkles }> = {
  llm: { label: 'LLM', tone: 'bg-violet-50 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300', icon: Sparkles },
  tool: { label: '工具', tone: 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300', icon: Wrench },
  mcp: { label: 'MCP', tone: 'bg-sky-50 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300', icon: Boxes },
  retrieval: { label: '检索', tone: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300', icon: FileText },
  memory: { label: '记忆', tone: 'bg-pink-50 text-pink-700 dark:bg-pink-500/15 dark:text-pink-300', icon: Brain },
  orchestration: { label: '编排', tone: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300', icon: Workflow },
};

export const SEVERITY_BADGE: Record<Severity, { label: string; className: string; dot: string }> = {
  info: { label: '信息', className: 'bg-sky-50 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300', dot: 'bg-sky-500' },
  warning: { label: '警告', className: 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300', dot: 'bg-amber-500' },
  error: { label: '错误', className: 'bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300', dot: 'bg-rose-500' },
  critical: { label: '严重', className: 'bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300 ring-2 ring-rose-200', dot: 'bg-rose-600' },
};

export const DRAWER_NAV_ITEMS: Array<{ id: DrawerPanel; label: string; icon: typeof Settings2 }> = [
  { id: 'overview', label: '会话概要', icon: Settings2 },
  { id: 'spans', label: '调用链路', icon: ListTree },
  { id: 'context', label: '上下文', icon: Brain },
  { id: 'logs', label: '日志/事件', icon: FileText },
];

export const SPAN_FILTER: Array<{ id: 'all' | SpanKind; label: string }> = [
  { id: 'all', label: '全部类型' },
  { id: 'llm', label: 'LLM' },
  { id: 'tool', label: '工具' },
  { id: 'mcp', label: 'MCP' },
  { id: 'retrieval', label: '检索' },
  { id: 'memory', label: '记忆' },
  { id: 'orchestration', label: '编排' },
];

export const AGENT_OPTIONS: Array<{ id: string; label: string }> = [
  { id: 'all', label: '全部' },
  { id: 'cs', label: '客服助手' },
  { id: 'dev', label: '研发助手' },
  { id: 'ops', label: '运营分析' },
  { id: 'mkt', label: '营销助手' },
];