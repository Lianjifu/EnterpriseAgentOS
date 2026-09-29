/**
 * AdminWorkflows 常量与映射 — TABS / TRIGGERS / NODE_KIND / STATUS / TRIGGER_BADGE / NODE_TEMPLATES。
 */
import {
  Brain, CheckCircle2, Clock, GitBranch, MessageSquare,
  Play, Plug, Webhook,
} from 'lucide-react';
import type {
  FlowStatus, NodeKind, NodeTemplate, NodeTypeTabId, TemplateChoice,
  TriggerType, WorkflowTabId,
} from '@/api/admin/workflows/schema';

export const TABS: Array<{ id: WorkflowTabId; label: string }> = [
  { id: 'overview', label: '总览' },
  { id: 'nodes', label: '节点库' },
  { id: 'integrations', label: '集成' },
  { id: 'publish', label: '发布' },
  { id: 'versions', label: '版本' },
];

export const TRIGGERS: TriggerType[] = ['消息触发', '定时触发', '事件触发', '手动触发'];

export const NODE_KIND_LABEL: Record<NodeKind, string> = {
  trigger: '触发器',
  tool: '工具',
  agent: '智能体',
  condition: '条件',
  end: '结束',
};

export const NODE_TONE_CLASS: Record<NodeKind, { wrap: string; text: string; sub: string; handle: string }> = {
  trigger: { wrap: 'border-sky-300 bg-sky-50', text: 'text-sky-700', sub: 'text-sky-500', handle: '!bg-sky-500' },
  tool: { wrap: 'border-[var(--brand)]/40 bg-[var(--brand-light)]', text: 'text-[var(--brand)]', sub: 'text-[var(--brand)]/70', handle: '!bg-[var(--brand)]' },
  agent: { wrap: 'border-emerald-300 bg-emerald-50', text: 'text-emerald-700', sub: 'text-emerald-500', handle: '!bg-emerald-500' },
  condition: { wrap: 'border-amber-300 bg-amber-50', text: 'text-amber-700', sub: 'text-amber-500', handle: '!bg-amber-500' },
  end: { wrap: 'border-violet-300 bg-violet-50', text: 'text-violet-700', sub: 'text-violet-500', handle: '!bg-violet-500' },
};

export const STATUS_BADGE: Record<FlowStatus, { label: string; className: string; dot: string }> = {
  draft: { label: '草稿', className: 'bg-[var(--bg-elevated)] text-[var(--text-secondary)]', dot: 'bg-[var(--text-muted)]' },
  graying: { label: '灰度中', className: 'bg-sky-50 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300', dot: 'bg-sky-500' },
  published: { label: '已发布', className: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300', dot: 'bg-emerald-500' },
  retired: { label: '已下线', className: 'bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300', dot: 'bg-rose-500' },
};

export const TRIGGER_BADGE: Record<TriggerType, { label: string; icon: typeof MessageSquare; className: string }> = {
  '消息触发': { label: '消息', icon: MessageSquare, className: 'bg-sky-50 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300' },
  '定时触发': { label: '定时', icon: Clock, className: 'bg-violet-50 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300' },
  '事件触发': { label: '事件', icon: Webhook, className: 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300' },
  '手动触发': { label: '手动', icon: Play, className: 'bg-[var(--bg-elevated)] text-[var(--text-secondary)]' },
};

export const NODE_TEMPLATES: NodeTemplate[] = [
  { kind: 'trigger', label: '触发器', subtitle: '工作流入口', tone: 'info', description: '触发器是工作流的入口,4 种:消息、定时、事件、手动。', defaults: { trigger: '消息触发', cron: '0 9 * * *' } },
  { kind: 'tool', label: '工具调用', subtitle: '调用外部能力', tone: 'brand', description: '调起一个工具,传入参数,等待结果。', defaults: { tool: 'knowledge_search', input: '{query}' } },
  { kind: 'agent', label: '智能体调用', subtitle: '委托给智能体', tone: 'success', description: '委托一个智能体执行子任务,可指定 model / prompt。', defaults: { agent: 'sales-coach', prompt: '请根据 {topic} 给出建议' } },
  { kind: 'condition', label: '条件分支', subtitle: 'IF / Switch', tone: 'warn', description: '根据表达式分流到不同分支,支持 IF / Switch / 循环。', defaults: { mode: 'if', op: '==' } },
  { kind: 'end', label: '结束节点', subtitle: '返回 / 通知 / 写库', tone: 'purple', description: '工作流出口:返回结果、发送通知或写入数据库。', defaults: { action: 'return', target: 'caller' } },
];

export const TEMPLATE_CHOICES: TemplateChoice[] = [
  { id: 'blank', name: '空白工作流', desc: '从空白画布开始', icon: 'Workflow', tone: 'info' },
  { id: 'complaint', name: '客户投诉处理', desc: '触发器 → 分类 → 分配 → 通知 → 写库', icon: 'AlertCircle', tone: 'danger' },
  { id: 'lead', name: '销售线索分发', desc: '触发器 → 查 CRM → IF 等级 → 分配销售', icon: 'Sparkles', tone: 'brand' },
  { id: 'weekly', name: '数据周报生成', desc: '定时触发 → 查数据 → 智能体润色 → 通知', icon: 'History', tone: 'success' },
];

export function uid(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}`;
}

export function countForTab(
  tabId: WorkflowTabId,
  flows: Array<{ status: FlowStatus; initialNodes: Array<{ data?: { kind?: NodeKind } }>; boundAgents?: string[]; versions?: unknown[] }>,
): number {
  if (tabId === 'overview') return flows.length;
  if (tabId === 'nodes') return flows.length;
  if (tabId === 'integrations') {
    return flows.reduce((sum, f) => sum + (f.boundAgents?.length ?? 0), 0);
  }
  if (tabId === 'versions') {
    return flows.reduce((sum, f) => sum + (f.versions?.length ?? 0), 0);
  }
  return flows.filter((f) => f.status === 'published').length;
}

export function nodeKindIcon(kind: NodeKind) {
  if (kind === 'trigger') return Play;
  if (kind === 'tool') return Plug;
  if (kind === 'agent') return Brain;
  if (kind === 'condition') return GitBranch;
  return CheckCircle2;
}

export const NODE_TYPE_TAB_META: Record<NodeTypeTabId, { title: string; subtitle: string }> = {
  trigger: { title: '触发器类型', subtitle: '触发器是工作流的入口;选择合适的触发方式,从左侧加入画布。' },
  action: { title: '动作节点类型', subtitle: '动作节点是工作流的执行步骤;工具调用 / 智能体调用 / HTTP / 数据库 / 通知。' },
  condition: { title: '条件分支类型', subtitle: '条件分支决定工作流的走向;IF / Switch / 循环 / 并行。' },
};