/**
 * AdminWorkflows 常量与映射 — TABS / TRIGGERS / NODE_KIND / STATUS / TRIGGER_BADGE / NODE_TEMPLATES。
 */
import {
  Brain, CheckCircle2, Clock, GitBranch, MessageSquare,
  Play, Plug, Webhook,
} from 'lucide-react';
import type {
  FlowStatus, NodeKind, NodeTemplate, NodeTypeGroup, NodeTypeTabId, TemplateChoice,
  TriggerType, VarField, WorkflowTabId,
} from '@/api/admin/workflows/schema';

export const TABS: Array<{ id: WorkflowTabId; label: string }> = [
  { id: 'all', label: '全部' },
  { id: 'draft', label: '草稿' },
  { id: 'graying', label: '灰度中' },
  { id: 'published', label: '已发布' },
  { id: 'retired', label: '已下线' },
];

export const TRIGGERS: TriggerType[] = ['消息触发', '定时触发', '事件触发', '手动触发'];

export const NODE_KIND_LABEL: Record<NodeKind, string> = {
  trigger: '触发器',
  tool: '工具',
  agent: '智能体',
  condition: '条件',
  end: '结束',
};

export const NODE_TONE_CLASS: Record<NodeKind, { wrap: string; text: string; sub: string; handle: string; iconBg: string }> = {
  trigger: { wrap: 'border-sky-300 bg-sky-50 dark:border-sky-500/40 dark:bg-sky-500/10', text: 'text-sky-700 dark:text-sky-300', sub: 'text-sky-500 dark:text-sky-400', handle: '!bg-sky-500', iconBg: 'bg-white/70 dark:bg-sky-500/20' },
  tool: { wrap: 'border-[var(--brand)]/40 bg-[var(--brand-light)] dark:bg-[var(--brand)]/15', text: 'text-[var(--brand)]', sub: 'text-[var(--brand)]/70', handle: '!bg-[var(--brand)]', iconBg: 'bg-white/70 dark:bg-[var(--brand)]/15' },
  agent: { wrap: 'border-emerald-300 bg-emerald-50 dark:border-emerald-500/40 dark:bg-emerald-500/10', text: 'text-emerald-700 dark:text-emerald-300', sub: 'text-emerald-500 dark:text-emerald-400', handle: '!bg-emerald-500', iconBg: 'bg-white/70 dark:bg-emerald-500/20' },
  condition: { wrap: 'border-amber-300 bg-amber-50 dark:border-amber-500/40 dark:bg-amber-500/10', text: 'text-amber-700 dark:text-amber-300', sub: 'text-amber-500 dark:text-amber-400', handle: '!bg-amber-500', iconBg: 'bg-white/70 dark:bg-amber-500/20' },
  end: { wrap: 'border-violet-300 bg-violet-50 dark:border-violet-500/40 dark:bg-violet-500/10', text: 'text-violet-700 dark:text-violet-300', sub: 'text-violet-500 dark:text-violet-400', handle: '!bg-violet-500', iconBg: 'bg-white/70 dark:bg-violet-500/20' },
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

export const NODE_TYPE_TREE: NodeTypeGroup[] = [
  {
    kind: 'trigger',
    label: '开始节点',
    children: [
      {
        id: 'start-msg', label: '用户消息触发', subtitle: '用户发消息时启动,输入含 query',
        defaults: { trigger: '消息触发' },
        inputs: [{ name: 'query', type: 'string', required: true, description: '用户原始消息' }],
        outputs: [{ name: 'query', type: 'string', description: '透传给下游' }, { name: 'user_id', type: 'string', description: '发消息的用户' }],
      },
      {
        id: 'start-cron', label: '定时触发', subtitle: '按 cron 计划启动',
        defaults: { trigger: '定时触发', cron: '0 9 * * 1' },
        outputs: [{ name: 'fired_at', type: 'string', description: '触发时间' }, { name: 'cron', type: 'string', description: 'cron 表达式' }],
      },
      {
        id: 'start-event', label: '事件触发', subtitle: '外部 webhook 事件',
        defaults: { trigger: '事件触发' },
        inputs: [{ name: 'payload', type: 'object', required: true, description: 'webhook body' }],
        outputs: [{ name: 'event_type', type: 'string' }, { name: 'payload', type: 'object' }],
      },
      {
        id: 'start-manual', label: '手动触发', subtitle: '管理员手动启动,需传参',
        defaults: { trigger: '手动触发' },
        inputs: [{ name: 'params', type: 'object', required: false, description: '调用方传入参数' }],
        outputs: [{ name: 'params', type: 'object' }],
      },
      {
        id: 'start-form', label: '表单提交', subtitle: '用户填表后启动',
        defaults: { trigger: '表单提交' },
        inputs: [{ name: 'form_id', type: 'string', required: true }],
        outputs: [{ name: 'form_data', type: 'object', description: '表单字段' }, { name: 'submitter', type: 'string', description: '提交人 id' }],
      },
      {
        id: 'start-im', label: 'IM 群消息', subtitle: '群内 @机器人或关键词触发',
        defaults: { trigger: 'IM 触发' },
        outputs: [{ name: 'message', type: 'string' }, { name: 'group_id', type: 'string' }, { name: 'sender', type: 'string' }],
      },
    ],
  },
  {
    kind: 'tool',
    label: '工具调用',
    children: [
      {
        id: 'tool-kb', label: '知识库检索', subtitle: '从 KB 检索片段',
        defaults: { tool: 'knowledge_search' },
        inputs: [{ name: 'query', type: 'string', required: true }, { name: 'kb_id', type: 'string', required: true }],
        outputs: [{ name: 'chunks', type: 'array', description: '命中的片段' }, { name: 'score', type: 'number' }],
      },
      {
        id: 'tool-http', label: 'HTTP 请求', subtitle: '调外部 API',
        defaults: { tool: 'http_request', method: 'POST', url: 'https://api.example.com' },
        inputs: [{ name: 'url', type: 'string', required: true }, { name: 'method', type: 'string' }, { name: 'body', type: 'object', required: false }, { name: 'headers', type: 'object', required: false }],
        outputs: [{ name: 'status', type: 'number' }, { name: 'data', type: 'object' }],
      },
      {
        id: 'tool-db', label: '数据库查询', subtitle: '查 Postgres / MySQL',
        defaults: { tool: 'db_query', sql: 'SELECT * FROM ...' },
        inputs: [{ name: 'sql', type: 'string', required: true }, { name: 'params', type: 'array', required: false }],
        outputs: [{ name: 'rows', type: 'array' }],
      },
      {
        id: 'tool-email', label: '发送邮件', subtitle: 'SMTP 发邮件',
        defaults: { tool: 'send_email' },
        inputs: [{ name: 'to', type: 'string', required: true }, { name: 'subject', type: 'string', required: true }, { name: 'body', type: 'string', required: true }],
        outputs: [{ name: 'message_id', type: 'string' }],
      },
      {
        id: 'tool-im', label: 'IM 推送', subtitle: '飞书 / 钉钉 / 企微',
        defaults: { tool: 'im_push', channel: 'feishu' },
        inputs: [{ name: 'channel', type: 'string', required: true }, { name: 'target', type: 'string', required: true }, { name: 'message', type: 'string', required: true }],
        outputs: [{ name: 'message_id', type: 'string' }, { name: 'delivered', type: 'boolean' }],
      },
      {
        id: 'tool-file', label: '文件解析', subtitle: 'PDF / Word / Excel 提取文本',
        defaults: { tool: 'file_parse' },
        inputs: [{ name: 'file', type: 'file', required: true }, { name: 'parser', type: 'string', required: false, description: 'auto / pdf / docx / xlsx' }],
        outputs: [{ name: 'text', type: 'string' }, { name: 'pages', type: 'number' }],
      },
      {
        id: 'tool-ocr', label: 'OCR 识别', subtitle: '从图片提取文字',
        defaults: { tool: 'ocr' },
        inputs: [{ name: 'image', type: 'file', required: true }, { name: 'lang', type: 'string', required: false }],
        outputs: [{ name: 'text', type: 'string' }, { name: 'confidence', type: 'number' }],
      },
      {
        id: 'tool-vector', label: '向量检索', subtitle: 'Milvus / Pinecone 语义查',
        defaults: { tool: 'vector_search', index: 'default' },
        inputs: [{ name: 'embedding', type: 'array', required: true }, { name: 'top_k', type: 'number', required: false }],
        outputs: [{ name: 'matches', type: 'array' }, { name: 'scores', type: 'array' }],
      },
      {
        id: 'tool-fn', label: '函数计算', subtitle: '跑一段 JS / Python',
        defaults: { tool: 'fn_eval', runtime: 'js' },
        inputs: [{ name: 'code', type: 'string', required: true }, { name: 'args', type: 'object', required: false }],
        outputs: [{ name: 'result', type: 'object' }],
      },
      {
        id: 'tool-mcp', label: 'MCP 服务', subtitle: '连接外部 MCP 工具集',
        defaults: { tool: 'mcp_call', server: 'mcp-default' },
        inputs: [{ name: 'server', type: 'string', required: true }, { name: 'method', type: 'string', required: true }, { name: 'params', type: 'object', required: false }],
        outputs: [{ name: 'result', type: 'object' }],
      },
    ],
  },
  {
    kind: 'agent',
    label: '智能体调用',
    children: [
      {
        id: 'agent-sales-coach', label: '销售教练', subtitle: 'sales-coach · 顾问式',
        defaults: { agent: 'sales-coach' },
        inputs: [{ name: 'topic', type: 'string', required: true }],
        outputs: [{ name: 'advice', type: 'string', description: '建议文本' }, { name: 'confidence', type: 'number' }],
      },
      {
        id: 'agent-support', label: '客服助手', subtitle: 'support-bot · 工单分流',
        defaults: { agent: 'support-bot' },
        inputs: [{ name: 'message', type: 'string', required: true }],
        outputs: [{ name: 'category', type: 'string' }, { name: 'reply', type: 'string' }],
      },
      {
        id: 'agent-researcher', label: '研究员', subtitle: 'researcher · 深度阅读',
        defaults: { agent: 'researcher' },
        inputs: [{ name: 'question', type: 'string', required: true }],
        outputs: [{ name: 'report', type: 'string' }, { name: 'sources', type: 'array' }],
      },
      {
        id: 'agent-writer', label: '文案写手', subtitle: 'writer · 营销文案',
        defaults: { agent: 'writer' },
        inputs: [{ name: 'topic', type: 'string', required: true }, { name: 'tone', type: 'string', required: false }],
        outputs: [{ name: 'copy', type: 'string' }],
      },
      {
        id: 'agent-llm', label: '通用 LLM', subtitle: '裸调大模型,可指定 system',
        defaults: { agent: 'llm-default', system: 'You are a helpful assistant.' },
        inputs: [{ name: 'prompt', type: 'string', required: true }, { name: 'system', type: 'string', required: false }],
        outputs: [{ name: 'text', type: 'string' }, { name: 'tokens', type: 'number' }],
      },
      {
        id: 'agent-code', label: '代码助手', subtitle: 'coder · 写 / 解释 / 改代码',
        defaults: { agent: 'coder' },
        inputs: [{ name: 'task', type: 'string', required: true, description: '写 / 解释 / 重构' }, { name: 'language', type: 'string', required: false }],
        outputs: [{ name: 'code', type: 'string' }, { name: 'language', type: 'string' }],
      },
      {
        id: 'agent-translator', label: '翻译助手', subtitle: 'translator · 多语种互译',
        defaults: { agent: 'translator' },
        inputs: [{ name: 'text', type: 'string', required: true }, { name: 'target_lang', type: 'string', required: true }],
        outputs: [{ name: 'translation', type: 'string' }, { name: 'detected_lang', type: 'string' }],
      },
      {
        id: 'agent-custom', label: '+ 新建智能体', subtitle: '跳到智能体管理',
        defaults: { agent: '__new__' },
      },
    ],
  },
  {
    kind: 'condition',
    label: '控制流',
    children: [
      {
        id: 'cond-if', label: 'IF 表达式', subtitle: 'true / false 双分支',
        defaults: { mode: 'if', op: '==' },
        inputs: [{ name: 'value', type: 'string', required: true }, { name: 'op', type: 'string' }, { name: 'compare', type: 'string' }],
        outputs: [{ name: 'branch_true', type: 'object', description: 'true 分支出口' }, { name: 'branch_false', type: 'object', description: 'false 分支出口' }],
      },
      {
        id: 'cond-switch', label: 'Switch 多路', subtitle: '按枚举分派',
        defaults: { mode: 'switch' },
        inputs: [{ name: 'value', type: 'string', required: true }, { name: 'cases', type: 'array', required: false, description: '可选枚举' }],
        outputs: [{ name: 'branch', type: 'string', description: '命中的分支 id' }],
      },
      {
        id: 'cond-loop', label: '循环遍历', subtitle: '对数组逐项处理',
        defaults: { mode: 'loop' },
        inputs: [{ name: 'items', type: 'array', required: true }],
        outputs: [{ name: 'item', type: 'object', description: '当前项' }, { name: 'index', type: 'number' }, { name: 'done', type: 'object', description: '循环结束出口' }],
      },
      {
        id: 'cond-parallel', label: '并行分支', subtitle: '同时跑多条子链',
        defaults: { mode: 'parallel' },
        inputs: [{ name: 'branches', type: 'array', required: true, description: 'N 条并行任务' }],
        outputs: [{ name: 'results', type: 'array', description: 'N 个结果按序' }, { name: 'failed', type: 'array', description: '失败分支索引' }],
      },
      {
        id: 'cond-wait', label: '等待信号', subtitle: '挂起直到外部事件或超时',
        defaults: { mode: 'wait', timeout_sec: '3600' },
        inputs: [{ name: 'event', type: 'string', required: true }, { name: 'timeout', type: 'number', required: false }],
        outputs: [{ name: 'payload', type: 'object' }, { name: 'timed_out', type: 'boolean' }],
      },
      {
        id: 'cond-try', label: '异常捕获', subtitle: 'try / catch 子链',
        defaults: { mode: 'try' },
        inputs: [{ name: 'try_chain', type: 'object', required: true }],
        outputs: [{ name: 'success', type: 'object', description: '正常出口' }, { name: 'error', type: 'object', description: '异常出口' }],
      },
    ],
  },
  {
    kind: 'end',
    label: '结束节点',
    children: [
      {
        id: 'end-return', label: '返回结果', subtitle: '把结果回传给调用方',
        defaults: { action: 'return' },
        inputs: [{ name: 'result', type: 'object', required: true, description: '工作流输出' }],
        outputs: [],
      },
      {
        id: 'end-notify', label: '发送通知', subtitle: '邮件 / 站内 / IM',
        defaults: { action: 'notify' },
        inputs: [{ name: 'to', type: 'string', required: true }, { name: 'message', type: 'string', required: true }, { name: 'channel', type: 'string', required: false }],
        outputs: [{ name: 'message_id', type: 'string' }],
      },
      {
        id: 'end-writeback', label: '写库', subtitle: '把结果写回 DB',
        defaults: { action: 'writeback' },
        inputs: [{ name: 'table', type: 'string', required: true }, { name: 'row', type: 'object', required: true }],
        outputs: [{ name: 'row_id', type: 'string' }],
      },
      {
        id: 'end-chain', label: '触发下个流', subtitle: '调用另一个工作流',
        defaults: { action: 'chain', target_flow: '' },
        inputs: [{ name: 'flow_id', type: 'string', required: true }, { name: 'args', type: 'object', required: false }],
        outputs: [{ name: 'sub_result', type: 'object' }],
      },
      {
        id: 'end-archive', label: '入归档', subtitle: '把本次执行归档',
        defaults: { action: 'archive' },
        inputs: [{ name: 'payload', type: 'object', required: false }],
        outputs: [{ name: 'archive_id', type: 'string' }],
      },
    ],
  },
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

export function countForTab(tabId: WorkflowTabId, flows: Array<{ status: FlowStatus }>): number {
  if (tabId === 'all') return flows.length;
  return flows.filter((f) => f.status === tabId).length;
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