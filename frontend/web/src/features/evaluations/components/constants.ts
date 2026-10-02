import type { TabId, EvalStatus, EvalSuiteType, RiskLevel, DrawerPanel, ExchangeFormat } from '../schema';

export const TABS: Array<{ id: TabId; label: string }> = [
  { id: 'overview', label: '评测总览' },
  { id: 'suite', label: '评测套件' },
  { id: 'result', label: '评测结果' },
  { id: 'case', label: '评测用例' },
  { id: 'template', label: '评测模板' },
];

export const STATUS_BADGE: Record<EvalStatus, { label: string; className: string; dot: string }> = {
  passed:    { label: '已通过', className: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300', dot: 'bg-emerald-500' },
  failed:    { label: '未通过', className: 'bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300', dot: 'bg-rose-500' },
  running:   { label: '运行中', className: 'bg-sky-50 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300', dot: 'bg-sky-500' },
  queued:    { label: '排队中', className: 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300', dot: 'bg-amber-500' },
  cancelled: { label: '已取消', className: 'bg-[var(--bg-elevated)] text-[var(--text-secondary)]', dot: 'bg-[var(--text-muted)]' },
};

export const TYPE_META: Record<EvalSuiteType, { icon: string; tone: string; label: string }> = {
  capability: { icon: 'Sparkles',     tone: 'bg-violet-50 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300', label: '能力评测' },
  quality:    { icon: 'FlaskConical', tone: 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300', label: '质量评测' },
  safety:     { icon: 'ShieldCheck',  tone: 'bg-sky-50 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300', label: '安全评测' },
  regression: { icon: 'GitBranch',    tone: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300', label: '回归评测' },
};

export const RISK_BADGE: Record<RiskLevel, { label: string; className: string; icon: string }> = {
  low:    { label: '低风险',   className: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300', icon: 'ShieldCheck' },
  medium: { label: '中等风险', className: 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300', icon: 'ShieldQuestion' },
  high:   { label: '高风险',   className: 'bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300', icon: 'AlertTriangle' },
};

export const STATUS_FILTER: Array<{ id: 'all' | EvalStatus; label: string }> = [
  { id: 'all', label: '全部状态' },
  { id: 'passed', label: '已通过' },
  { id: 'failed', label: '未通过' },
  { id: 'running', label: '运行中' },
  { id: 'queued', label: '排队中' },
  { id: 'cancelled', label: '已取消' },
];

export const TYPE_FILTER: Array<{ id: 'all' | EvalSuiteType; label: string }> = [
  { id: 'all', label: '全部类型' },
  { id: 'capability', label: '能力' },
  { id: 'quality', label: '质量' },
  { id: 'safety', label: '安全' },
  { id: 'regression', label: '回归' },
];

export const DRAWER_NAV_ITEMS: Array<{ id: DrawerPanel; label: string; icon: string }> = [
  { id: 'basic',    label: '基本信息', icon: 'BookOpen' },
  { id: 'cases',    label: '测试用例', icon: 'ListChecks' },
  { id: 'criteria', label: '评分标准', icon: 'Layers' },
  { id: 'schedule', label: '调度与告警', icon: 'Calendar' },
  { id: 'history',  label: '运行历史', icon: 'History' },
];

export const EXCHANGE_FORMATS: ExchangeFormat[] = ['json', 'yaml'];

export function uid(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}`;
}

export function caseStatusLabel(s: 'pass' | 'fail' | 'skipped') {
  return s === 'pass' ? '通过' : s === 'fail' ? '未通过' : '跳过';
}

export function caseStatusClass(s: 'pass' | 'fail' | 'skipped') {
  return s === 'pass'
    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300'
    : s === 'fail'
    ? 'bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300'
    : 'bg-[var(--bg-elevated)] text-[var(--text-muted)]';
}