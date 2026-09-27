import {
  Activity, AlertTriangle, Beaker, BookOpen, Bot, Brain, CheckCircle2, CheckSquare, ChevronDown, ChevronLeft, ChevronRight,
  Clock, Copy, Download, Edit3, FileJson, FileSpreadsheet, FileText, FolderTree, GitBranch, History, Info, Layers,
  Maximize2, MessageSquareText, MoreVertical, Play, Plus, RotateCcw, Save, Search, ShieldCheck, Sparkles, Square, Star,
  Timer, Trash2, TrendingUp, Upload, Workflow, X,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { CenterModal } from '@/components/feedback/CenterModal';
import { NoticeBanner } from '@/components/feedback/NoticeBanner';

type Tone = 'brand' | 'info' | 'success' | 'warn' | 'danger' | 'purple';
type Status = 'draft' | 'pending' | 'graying' | 'published' | 'retired';
type TabId = 'all' | 'draft' | 'pending' | 'graying' | 'published' | 'retired';
type SortKey = 'calls' | 'updated' | 'rating' | 'name';
type DrawerPanel = 'basic' | 'prompt' | 'skills' | 'knowledge' | 'memory' | 'flow' | 'versions' | 'evaluation' | 'permission';
type PromptKey = 'prompt' | 'soul' | 'agents' | 'user' | 'tools';
type ExportField = 'meta' | 'prompt' | 'skills' | 'knowledge' | 'memory' | 'flow';
type ExportFormat = 'json' | 'csv' | 'yaml';
type ExportScope = 'all' | 'tab' | 'selected';
type MemoryRetention = 7 | 30 | 90 | 365;
type MemoryScope = 'session' | 'user' | 'tenant';
type FlowTrigger = '消息触发' | '定时触发' | '事件触发' | '手动触发';
type ImportExtension = 'json' | 'csv' | 'yaml' | 'zip';

interface WizardDraft {
  name: string;
  description: string;
  category: string;
  owner: string;
  icon: string;
  tags: string[];
  template: 'blank' | 'customer-service' | 'sales-support';
  model: string;
  defaultSkills: string[];
  visibleScope: '公开' | '部门' | '个人';
}

interface ImportRow {
  source: Record<string, string>;
  status: 'ok' | 'duplicate' | 'missing';
  message?: string;
}

interface DeletePayload {
  kind: 'single' | 'bulk';
  ids: string[];
}

const TABS: Array<{ id: TabId; label: string }> = [
  { id: 'all', label: '全部' },
  { id: 'draft', label: '草稿' },
  { id: 'pending', label: '待审核' },
  { id: 'graying', label: '灰度中' },
  { id: 'published', label: '已发布' },
  { id: 'retired', label: '已下线' },
];

const SCENES = ['全部场景', '客服', '销售', '数据', '财务', '流程', 'HR', 'IT'];

const toneClass: Record<Tone, string> = {
  brand: 'bg-[var(--brand-light)] text-[var(--brand)]',
  info: 'bg-sky-50 text-sky-600 dark:bg-sky-500/15 dark:text-sky-300',
  success: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300',
  warn: 'bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300',
  danger: 'bg-rose-50 text-rose-600 dark:bg-rose-500/15 dark:text-rose-300',
  purple: 'bg-violet-50 text-violet-600 dark:bg-violet-500/15 dark:text-violet-300',
};

const statusBadge: Record<Status, { label: string; className: string; dot: string }> = {
  draft: { label: '草稿', className: 'bg-[var(--bg-elevated)] text-[var(--text-secondary)]', dot: 'bg-[var(--text-muted)]' },
  pending: { label: '待审核', className: 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300', dot: 'bg-amber-500' },
  graying: { label: '灰度中', className: 'bg-sky-50 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300', dot: 'bg-sky-500' },
  published: { label: '已发布', className: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300', dot: 'bg-emerald-500' },
  retired: { label: '已下线', className: 'bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300', dot: 'bg-rose-500' },
};

const SORT_OPTIONS: Array<{ id: SortKey; label: string }> = [
  { id: 'calls', label: '调用量' },
  { id: 'updated', label: '最近更新' },
  { id: 'rating', label: '评分' },
  { id: 'name', label: '名称' },
];

const EXPORT_FIELDS: Array<{ id: ExportField; label: string }> = [
  { id: 'meta', label: '元信息' },
  { id: 'prompt', label: 'Prompt' },
  { id: 'skills', label: '技能' },
  { id: 'knowledge', label: '知识' },
  { id: 'memory', label: '记忆' },
  { id: 'flow', label: '流程' },
];

const WIZARD_TEMPLATES: Array<{ id: WizardDraft['template']; title: string; description: string; icon: typeof Bot; tone: Tone }> = [
  { id: 'blank', title: '空白智能体', description: '从零开始,自行配置 Prompt、技能与权限。', icon: Bot, tone: 'info' },
  { id: 'customer-service', title: '客服场景模板', description: '内置订单查询、退换货、情绪识别等客服常用技能。', icon: MessageSquareText, tone: 'brand' },
  { id: 'sales-support', title: '销售支持模板', description: '内置 CRM 查询、报价引擎、合同条款检索。', icon: TrendingUp, tone: 'success' },
];

const WIZARD_ICONS: Array<{ name: string; Icon: typeof Bot }> = [
  { name: 'Bot', Icon: Bot },
  { name: 'Sparkles', Icon: Sparkles },
  { name: 'MessageSquareText', Icon: MessageSquareText },
  { name: 'TrendingUp', Icon: TrendingUp },
  { name: 'Beaker', Icon: Beaker },
  { name: 'ShieldCheck', Icon: ShieldCheck },
];

const WIZARD_MODELS = ['GPT-4o (默认)', 'Claude Sonnet 4.5', 'Qwen 2.5 72B', 'DeepSeek V3', '混元 Pro'];
const WIZARD_SKILLS = ['订单查询', '客户画像', 'CRM 查询', '知识检索', '邮件发送', '审批中心', '日程预约', '敏感词检测'];

const SAMPLE_IMPORT: ImportRow[] = [
  { source: { name: '合同摘要助手', description: '快速摘要合同正文,提取关键条款', category: '法务', owner: '孙浩' }, status: 'ok' },
  { source: { name: '客户沟通助手', description: '处理客户咨询、订单查询', category: '客服一组', owner: '张敏' }, status: 'duplicate', message: '已存在同名智能体' },
  { source: { name: '差旅助手', description: '差旅政策查询与报销引导', category: 'HR', owner: '' }, status: 'missing', message: '缺少负责人字段' },
  { source: { name: '翻译小助手', description: '中英互译,保留专有名词', category: 'IT', owner: '周强' }, status: 'ok' },
  { source: { name: '销售支持', description: '客户画像、报价辅助、合同查询', category: '销售支持', owner: '李雷' }, status: 'duplicate', message: '已存在同名智能体' },
];

const SAMPLE_IMPORT_ZIP: ImportRow[] = [
  { source: { name: '差旅助手', description: '差旅政策查询与报销引导', category: 'HR', owner: '赵琳' }, status: 'ok' },
  { source: { name: '差旅助手 v2', description: '差旅审批流接入与机票比价', category: 'HR', owner: '赵琳' }, status: 'ok' },
  { source: { name: '差旅助手', description: '已存在同名', category: 'HR', owner: '赵琳' }, status: 'duplicate', message: '已存在同名智能体' },
  { source: { name: '会议纪要助手', description: '实时转写 + 待办抽取', category: 'IT', owner: '周强' }, status: 'ok' },
  { source: { name: '招聘 JD 生成', description: '根据岗位关键词生成 JD', category: 'HR', owner: '赵琳' }, status: 'ok' },
  { source: { name: '招聘 JD 生成', description: '根据岗位关键词生成 JD', category: 'HR', owner: '赵琳' }, status: 'duplicate', message: '已存在同名智能体' },
  { source: { name: '', description: '空名称条目', category: 'IT', owner: '周强' }, status: 'missing', message: '缺少名称字段' },
  { source: { name: '客户回访', description: '', category: '客服一组', owner: '' }, status: 'missing', message: '缺少描述与负责人' },
  { source: { name: '客户回访', description: '周度客户回访脚本生成', category: '客服一组', owner: '张敏' }, status: 'ok' },
];

const IMPORT_FORMATS: Array<{ ext: ImportExtension; label: string; description: string }> = [
  { ext: 'json', label: 'JSON', description: '结构化数组,字段一一映射' },
  { ext: 'csv', label: 'CSV', description: '表格导入,首行为表头' },
  { ext: 'yaml', label: 'YAML', description: 'YAML 列表,支持注释' },
  { ext: 'zip', label: 'ZIP', description: '压缩包,可包含多个文件' },
];

const INITIAL_WIZARD_DRAFT: WizardDraft = {
  name: '',
  description: '',
  category: '客服一组',
  owner: '张敏',
  icon: 'Bot',
  tags: [],
  template: 'blank',
  model: 'GPT-4o (默认)',
  defaultSkills: [],
  visibleScope: '部门',
};

const DEFAULT_EXPORT_FIELDS: Record<ExportField, boolean> = {
  meta: true,
  prompt: true,
  skills: true,
  knowledge: true,
  memory: true,
  flow: false,
};

interface VersionEntry {
  version: string;
  publisher: string;
  releasedAt: string;
  current?: boolean;
}

interface PromptDocs {
  prompt: string;
  soul: string;
  agents: string;
  user: string;
  tools: string;
}

interface KnowledgeRef {
  id: string;
  name: string;
  scope: '公开' | '部门' | '个人';
  enabled: boolean;
}

interface MemoryPolicy {
  enabled: boolean;
  retentionDays: MemoryRetention;
  scope: MemoryScope;
  autoSummarize: boolean;
}

interface FlowRef {
  id: string;
  name: string;
  trigger: FlowTrigger;
  enabled: boolean;
}

interface EvalCase {
  id: string;
  name: string;
  status: 'pass' | 'fail';
  latency: number;
}

interface DiffOp {
  type: 'eq' | 'del' | 'add' | 'mod';
  leftLine?: string;
  rightLine?: string;
}

interface AgentEntry {
  id: string;
  name: string;
  description: string;
  category: string;
  owner: string;
  tone: Tone;
  status: Status;
  version: string;
  lastUpdate: string;
  calls: number;
  successRate: number;
  errorRate: number;
  avgLatencyMs: number;
  rating: number;
  tools: string[];
  starred: boolean;
  visibleScope: Array<'公开' | '部门' | '个人'>;
  dataAccess: string;
  versions: VersionEntry[];
  evaluationPassRate: number;
  evaluationRuns: number;
  evaluationFailedCases: number;
  trend: number[];
  prompts: PromptDocs;
  knowledgeRefs: KnowledgeRef[];
  memoryPolicy: MemoryPolicy;
  flowRefs: FlowRef[];
}

const PROMPT_DOCS: Array<{ key: PromptKey; file: string; label: string; description: string }> = [
  { key: 'prompt', file: 'PROMPT.md', label: 'PROMPT', description: '主提示词 · 决定智能体的任务目标与输出格式' },
  { key: 'soul', file: 'SOUL.md', label: 'SOUL', description: '人格与价值观 · 语气、立场、行为边界' },
  { key: 'agents', file: 'AGENTS.md', label: 'AGENTS', description: '子智能体协作 · 拆分任务、转发与回传结果' },
  { key: 'user', file: 'USER.md', label: 'USER', description: '用户画像 · 行业、角色、偏好与上下文' },
  { key: 'tools', file: 'TOOLS.md', label: 'TOOLS', description: '工具说明 · Skill / Tool / MCP 调用意图' },
];

const MEMORY_RETENTION_OPTIONS: MemoryRetention[] = [7, 30, 90, 365];

const MEMORY_SCOPE_OPTIONS: Array<{ value: MemoryScope; label: string; description: string }> = [
  { value: 'session', label: '单次会话', description: '随对话结束自动清除' },
  { value: 'user', label: '用户级', description: '同一用户跨会话保留' },
  { value: 'tenant', label: '租户级', description: '团队内共享上下文' },
];

const FLOW_TRIGGERS: FlowTrigger[] = ['消息触发', '定时触发', '事件触发', '手动触发'];

const KNOWLEDGE_POOL: Record<string, KnowledgeRef[]> = {
  客服: [
    { id: 'kb-order', name: '订单知识库', scope: '公开', enabled: true },
    { id: 'kb-faq', name: 'FAQ 词库', scope: '公开', enabled: true },
    { id: 'kb-emotion', name: '情绪识别手册', scope: '部门', enabled: false },
  ],
  销售: [
    { id: 'kb-product', name: '产品手册', scope: '公开', enabled: true },
    { id: 'kb-crm', name: 'CRM 客户画像', scope: '部门', enabled: true },
    { id: 'kb-contract', name: '合同条款库', scope: '部门', enabled: true },
  ],
  数据: [
    { id: 'kb-metrics', name: '指标字典', scope: '部门', enabled: true },
    { id: 'kb-sql', name: 'SQL 查询模板', scope: '部门', enabled: true },
    { id: 'kb-report', name: '历史分析报告', scope: '部门', enabled: false },
  ],
  财务: [
    { id: 'kb-finance-rules', name: '报销与税务规则', scope: '部门', enabled: true },
    { id: 'kb-budget', name: '预算执行手册', scope: '部门', enabled: true },
    { id: 'kb-audit', name: '合规审计清单', scope: '部门', enabled: true },
  ],
  流程: [
    { id: 'kb-flow-engine', name: '流程引擎文档', scope: '公开', enabled: true },
    { id: 'kb-approval', name: '审批节点定义', scope: '部门', enabled: true },
    { id: 'kb-incident', name: '异常处理预案', scope: '部门', enabled: false },
  ],
  HR: [
    { id: 'kb-hr-policy', name: 'HR 政策手册', scope: '部门', enabled: true },
    { id: 'kb-onboard', name: '入职离职流程', scope: '部门', enabled: true },
    { id: 'kb-compensation', name: '薪酬与绩效档案', scope: '部门', enabled: true },
  ],
  IT: [
    { id: 'kb-runbook', name: '运维 Runbook', scope: '部门', enabled: true },
    { id: 'kb-ticket', name: '工单模板', scope: '部门', enabled: true },
    { id: 'kb-change', name: '变更审批清单', scope: '部门', enabled: true },
  ],
  法务: [
    { id: 'kb-contract-tpl', name: '合同模板库', scope: '部门', enabled: true },
    { id: 'kb-compliance', name: '合规规则', scope: '部门', enabled: true },
    { id: 'kb-clause-risk', name: '风险条款示例', scope: '部门', enabled: true },
  ],
  市场: [
    { id: 'kb-brand', name: '品牌中心', scope: '部门', enabled: true },
    { id: 'kb-campaign', name: '活动案例库', scope: '部门', enabled: true },
    { id: 'kb-tone', name: '语气词库', scope: '部门', enabled: false },
  ],
  实验: [
    { id: 'kb-misc', name: '实验性知识库', scope: '部门', enabled: false },
    { id: 'kb-archive', name: '归档材料', scope: '部门', enabled: false },
    { id: 'kb-notes', name: '研究笔记', scope: '个人', enabled: false },
  ],
};

const FLOW_POOL: Record<string, Array<{ name: string; trigger: FlowTrigger; enabled: boolean }>> = {
  客服: [
    { name: '工单自动建档', trigger: '消息触发', enabled: true },
    { name: '高情绪升级人工', trigger: '事件触发', enabled: true },
  ],
  销售: [
    { name: '新线索邮件跟进', trigger: '事件触发', enabled: true },
    { name: '合同到期提醒', trigger: '定时触发', enabled: true },
    { name: '客户画像更新', trigger: '手动触发', enabled: false },
  ],
  数据: [
    { name: '日报生成', trigger: '定时触发', enabled: true },
    { name: '异常指标告警', trigger: '事件触发', enabled: true },
  ],
  财务: [
    { name: '月度对账汇总', trigger: '定时触发', enabled: true },
    { name: '超预算审批', trigger: '事件触发', enabled: true },
  ],
  流程: [
    { name: '节点异常时通知', trigger: '事件触发', enabled: true },
  ],
  HR: [
    { name: '入职待办生成', trigger: '事件触发', enabled: true },
    { name: '月度考勤报表', trigger: '定时触发', enabled: false },
  ],
  IT: [
    { name: '故障应急通知', trigger: '事件触发', enabled: true },
    { name: '变更窗口提醒', trigger: '定时触发', enabled: true },
  ],
  法务: [
    { name: '合同到期复查', trigger: '定时触发', enabled: true },
    { name: '合规风险告警', trigger: '事件触发', enabled: true },
  ],
  市场: [
    { name: '周报素材整理', trigger: '定时触发', enabled: true },
  ],
  实验: [
    { name: '数据归档', trigger: '手动触发', enabled: false },
  ],
};

function buildPrompts(name: string, category: string, owner: string): PromptDocs {
  const tpl = category.split(/[一-龥]/)[0] || '通用';
  const persona = tpl === '客' ? '客服'
    : tpl === '销' ? '销售'
    : tpl === '数' ? '数据'
    : tpl === '财' ? '财务'
    : tpl === '流' ? '流程'
    : tpl === 'H' ? 'HR'
    : tpl === 'I' ? 'IT'
    : tpl === '法' ? '法务'
    : tpl === '市' ? '市场'
    : '通用';
  return {
    prompt: `# ${name} · 主提示词\n\n你是「${name}」,由 ${owner} 维护,核心职责是服务「${category}」场景下的真实业务问题。\n\n## 任务目标\n- 接到用户请求后,先识别意图与所需上下文\n- 优先调用已授权的 Skill / Tool / MCP 获取事实\n- 输出结构化结论,给出可追溯的依据\n\n## 输出约束\n- 使用 Markdown,首行说明结论\n- 关键判断附上数据/条款来源\n- 不确定时说明限制与下一步建议\n\n## 边界\n- 仅回答与「${category}」相关的问题\n- 不代替人工决策的关键审批\n- 涉及个人敏感信息时脱敏后再输出`,
    soul: `# SOUL · 人格与价值观\n\n## 人格定位\n- 语气专业、稳定,不夸张也不敷衍\n- 面对冲突先承认事实,再给出建议\n- 默认站在用户业务目标一边\n\n## 立场\n- 真实性优于流畅性\n- 不确定时坦诚,不编造数据\n- 拒绝在不熟悉的领域硬答\n\n## 行为边界\n- 不冒充身份(不假装是真人)\n- 不提供违法、违规、医疗/法律终局判断\n- 涉及金额、人数、合规条款时主动提示复核`,
    agents: `# AGENTS · 子智能体协作\n\n## 协作角色\n- \`researcher\` · 资料检索与事实核对\n- \`writer\` · 长文档撰写与润色\n- \`reviewer\` · 风险与合规复核\n\n## 任务编排\n1. 接收请求,定位问题类型\n2. 视情况分发给 researcher / writer\n3. 复杂产出交 reviewer 复核\n4. 汇总后回写主智能体输出\n\n## 回传规范\n- 子智能体只输出事实与候选结论\n- 不在子智能体层面给出最终判断\n- 异常必须显式标注,不允许静默吞错`,
    user: `# USER · 用户画像\n\n## 默认画像\n- 企业内部员工,可能跨多个角色\n- 默认中文沟通,熟悉日常办公协作\n- 时间敏感,希望快速得到结论\n\n## 偏好\n- 喜欢结构化要点 + 简短解释\n- 关键数字与日期会再次核对\n- 倾向给出可执行的下一步\n\n## 上下文\n- 已绑定企业身份与组织架构\n- 已授予「${category}」范围内的数据访问\n- 跨会话记忆开启,会保留偏好与历史`,
    tools: `# TOOLS · 工具使用说明\n\n## 工具调用原则\n- 只在确实需要事实/动作时调用\n- 单次调用最小化,避免无意义轮询\n- 调用失败需要重试或显式告知\n\n## 工具分类\n- 查询类:订单 / 客户 / 知识 / 指标\n- 动作类:发送邮件 / 创建工单 / 触发流程\n- 审计类:操作前需复核,失败要回滚\n\n## 边界\n- 超出授权范围时主动询问\n- 不在无授权情况下执行破坏性操作\n- 关键操作前请求人工确认`,
  };
}

function buildKnowledgeRefs(category: string): KnowledgeRef[] {
  const scopedCategory = category.startsWith('客服') ? '客服'
    : category.startsWith('销售') ? '销售'
    : category.startsWith('数据') ? '数据'
    : category.startsWith('财务') ? '财务'
    : category.startsWith('流程') ? '流程'
    : category.startsWith('HR') ? 'HR'
    : category.startsWith('IT') ? 'IT'
    : category.startsWith('法务') ? '法务'
    : category.startsWith('市场') ? '市场'
    : category.startsWith('实验') ? '实验'
    : '客服';
  return (KNOWLEDGE_POOL[scopedCategory] || KNOWLEDGE_POOL.客服).map((item) => ({ ...item }));
}

function buildFlowRefs(category: string): FlowRef[] {
  const scopedCategory = category.startsWith('客服') ? '客服'
    : category.startsWith('销售') ? '销售'
    : category.startsWith('数据') ? '数据'
    : category.startsWith('财务') ? '财务'
    : category.startsWith('流程') ? '流程'
    : category.startsWith('HR') ? 'HR'
    : category.startsWith('IT') ? 'IT'
    : category.startsWith('法务') ? '法务'
    : category.startsWith('市场') ? '市场'
    : category.startsWith('实验') ? '实验'
    : '客服';
  const items = FLOW_POOL[scopedCategory] || FLOW_POOL.客服;
  return items.map((item, idx) => ({
    id: `flow-${scopedCategory}-${idx}`,
    name: item.name,
    trigger: item.trigger,
    enabled: item.enabled,
  }));
}

const DEFAULT_MEMORY_POLICY: MemoryPolicy = {
  enabled: true,
  retentionDays: 30,
  scope: 'user',
  autoSummarize: true,
};

function diffLines(left: string, right: string): DiffOp[] {
  const leftLines = left.split('\n');
  const rightLines = right.split('\n');
  const m = leftLines.length;
  const n = rightLines.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = m - 1; i >= 0; i -= 1) {
    for (let j = n - 1; j >= 0; j -= 1) {
      if (leftLines[i] === rightLines[j]) dp[i][j] = dp[i + 1][j + 1] + 1;
      else dp[i][j] = Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const ops: DiffOp[] = [];
  let i = 0;
  let j = 0;
  while (i < m && j < n) {
    if (leftLines[i] === rightLines[j]) {
      ops.push({ type: 'eq', leftLine: leftLines[i], rightLine: rightLines[j] });
      i += 1; j += 1;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      ops.push({ type: 'del', leftLine: leftLines[i] });
      i += 1;
    } else {
      ops.push({ type: 'add', rightLine: rightLines[j] });
      j += 1;
    }
  }
  while (i < m) { ops.push({ type: 'del', leftLine: leftLines[i] }); i += 1; }
  while (j < n) { ops.push({ type: 'add', rightLine: rightLines[j] }); j += 1; }

  // 合并相邻 del+add 为 mod(长度相等时)
  const merged: DiffOp[] = [];
  for (let k = 0; k < ops.length; k += 1) {
    const op = ops[k];
    if (op.type === 'del' && k + 1 < ops.length && ops[k + 1].type === 'add' && op.leftLine !== undefined && ops[k + 1].rightLine !== undefined) {
      merged.push({ type: 'mod', leftLine: op.leftLine, rightLine: ops[k + 1].rightLine });
      k += 1;
    } else {
      merged.push(op);
    }
  }
  return merged;
}

function mockHistoricalPrompts(version: string, current: PromptDocs): PromptDocs {
  const v = version.toLowerCase();
  if (v.includes('v3.1') || v.includes('v2.6')) {
    return {
      ...current,
      soul: current.soul.replace('默认站在用户业务目标一边', '默认站在用户业务目标与合规一边'),
      user: current.user + '\n- v3.1 新增:支持多语言切换\n',
    };
  }
  if (v.includes('v3.0') || v.includes('v2.5')) {
    return {
      ...current,
      prompt: current.prompt.replace('使用 Markdown,首行说明结论', '使用结构化 Markdown,首行先回答结论'),
      soul: current.soul + '\n## 旧版边界\n- 不接管人工最终决策\n',
      tools: current.tools.replace('关键操作前请求人工确认', '关键操作前请求人工复核'),
    };
  }
  if (v.includes('v2.4') || v.includes('v1.7')) {
    return {
      ...current,
      prompt: current.prompt.replace('不确定时说明限制', '明确标注不确定性来源'),
    };
  }
  return current;
}

function generateEvalCases(agentId: string): EvalCase[] {
  const pool = [
    '订单查询', '退换货流程', '情绪识别', 'FAQ 检索', '工单创建',
    '客户画像', '知识引用', '敏感词检测', '多轮上下文', '工具路由',
    '错误恢复', '回归一致性',
  ];
  const seed = (agentId.charCodeAt(0) || 0) % 4;
  return pool.map((name, idx) => ({
    id: `c-${idx + 1}`,
    name,
    status: (idx + seed) % 7 === 0 ? 'fail' : 'pass',
    latency: 1.2 + ((idx * 0.27) % 1.8),
  }));
}

type AgentSeed = Omit<AgentEntry, 'prompts' | 'knowledgeRefs' | 'memoryPolicy' | 'flowRefs'>;

const INITIAL_AGENTS: AgentEntry[] = ([
  {
    id: 'a-customer-v3',
    name: '客户沟通助手',
    description: '处理客户咨询、订单查询、退换货引导,自动识别情绪并升级人工。',
    category: '客服一组',
    owner: '张敏',
    tone: 'brand',
    status: 'published',
    version: 'v3.2',
    lastUpdate: '2 小时前',
    calls: 18200,
    successRate: 99.62,
    errorRate: 0.42,
    avgLatencyMs: 1820,
    rating: 4.7,
    tools: ['订单查询', '退换货流程', '知识检索', '情绪识别', '人工坐席', '邮件发送'],
    starred: true,
    visibleScope: ['公开', '部门'],
    dataAccess: '客户档案 · 订单系统',
    versions: [
      { version: 'v3.2', publisher: '张敏', releasedAt: '2026-09-24', current: true },
      { version: 'v3.1', publisher: '张敏', releasedAt: '2026-09-03' },
      { version: 'v3.0', publisher: '李雷', releasedAt: '2026-08-21' },
      { version: 'v2.4', publisher: '张敏', releasedAt: '2026-07-12' },
    ],
    evaluationPassRate: 96.4,
    evaluationRuns: 12,
    evaluationFailedCases: 3,
    trend: [180, 220, 260, 310, 340, 380, 420, 470, 510, 540, 580, 620],
  },
  {
    id: 'a-sales-v2',
    name: '销售支持',
    description: '为销售提供客户画像、报价辅助、合同条款查询与跟进建议。',
    category: '销售支持',
    owner: '李雷',
    tone: 'success',
    status: 'published',
    version: 'v2.7',
    lastUpdate: '昨天',
    calls: 14700,
    successRate: 99.41,
    errorRate: 0.55,
    avgLatencyMs: 1980,
    rating: 4.5,
    tools: ['客户画像', 'CRM 查询', '报价引擎', '合同条款检索', '邮件发送', '日程预约'],
    starred: true,
    visibleScope: ['部门'],
    dataAccess: 'CRM · 销售订单',
    versions: [
      { version: 'v2.7', publisher: '李雷', releasedAt: '2026-09-20', current: true },
      { version: 'v2.6', publisher: '李雷', releasedAt: '2026-08-30' },
      { version: 'v2.5', publisher: '王芳', releasedAt: '2026-08-15' },
    ],
    evaluationPassRate: 93.1,
    evaluationRuns: 9,
    evaluationFailedCases: 5,
    trend: [120, 140, 160, 180, 210, 230, 250, 270, 290, 310, 330, 350],
  },
  {
    id: 'a-insight-v2',
    name: '数据洞察助手',
    description: '自然语言提问企业数据,自动生成 SQL、可视化与解读报告。',
    category: '数据团队',
    owner: '王芳',
    tone: 'info',
    status: 'published',
    version: 'v2.4',
    lastUpdate: '3 天前',
    calls: 9800,
    successRate: 98.92,
    errorRate: 0.74,
    avgLatencyMs: 2400,
    rating: 4.6,
    tools: ['SQL 生成', '图表渲染', '指标库查询', '数据脱敏', '导出 PDF'],
    starred: false,
    visibleScope: ['部门'],
    dataAccess: '数据仓库 · 指标平台',
    versions: [
      { version: 'v2.4', publisher: '王芳', releasedAt: '2026-09-15', current: true },
      { version: 'v2.3', publisher: '王芳', releasedAt: '2026-08-25' },
      { version: 'v2.2', publisher: '周强', releasedAt: '2026-07-30' },
    ],
    evaluationPassRate: 91.8,
    evaluationRuns: 14,
    evaluationFailedCases: 7,
    trend: [80, 90, 100, 110, 120, 140, 150, 160, 170, 175, 180, 190],
  },
  {
    id: 'a-finance-v1',
    name: '财务问答',
    description: '回答费用报销、预算执行、税务规则等问题,支持单据 OCR 与对账。',
    category: '财务',
    owner: '陈晨',
    tone: 'purple',
    status: 'published',
    version: 'v1.8',
    lastUpdate: '今天 09:14',
    calls: 6100,
    successRate: 99.81,
    errorRate: 0.21,
    avgLatencyMs: 1620,
    rating: 4.8,
    tools: ['OCR 单据', '报销规则', '预算查询', '对账核对', '审批中心'],
    starred: false,
    visibleScope: ['部门'],
    dataAccess: 'ERP · 报销系统',
    versions: [
      { version: 'v1.8', publisher: '陈晨', releasedAt: '2026-09-12', current: true },
      { version: 'v1.7', publisher: '陈晨', releasedAt: '2026-08-22' },
      { version: 'v1.6', publisher: '李雷', releasedAt: '2026-07-18' },
    ],
    evaluationPassRate: 97.2,
    evaluationRuns: 11,
    evaluationFailedCases: 2,
    trend: [60, 70, 75, 80, 85, 90, 95, 100, 105, 110, 115, 120],
  },
  {
    id: 'a-flow-v1',
    name: '流程编排',
    description: '把重复工作配置成可追踪、可复用的自动化流程,支持条件分支与人工介入。',
    category: '流程',
    owner: '李雷',
    tone: 'warn',
    status: 'published',
    version: 'v1.5',
    lastUpdate: '上周',
    calls: 5400,
    successRate: 99.55,
    errorRate: 0.34,
    avgLatencyMs: 2100,
    rating: 4.4,
    tools: ['流程编辑器', '触发器', '人工审批', '通知中心', '审计日志'],
    starred: false,
    visibleScope: ['公开'],
    dataAccess: '流程引擎',
    versions: [
      { version: 'v1.5', publisher: '李雷', releasedAt: '2026-09-08', current: true },
      { version: 'v1.4', publisher: '李雷', releasedAt: '2026-08-18' },
    ],
    evaluationPassRate: 92.0,
    evaluationRuns: 8,
    evaluationFailedCases: 4,
    trend: [40, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100],
  },
  {
    id: 'a-customer-gray',
    name: '客户沟通助手 v4',
    description: '在 v3 基础上引入多模态订单图片识别与上下文记忆。',
    category: '客服一组',
    owner: '张敏',
    tone: 'info',
    status: 'graying',
    version: 'v4.0-beta',
    lastUpdate: '今天 10:32',
    calls: 320,
    successRate: 99.10,
    errorRate: 0.62,
    avgLatencyMs: 2050,
    rating: 4.6,
    tools: ['订单查询', '图片 OCR', '上下文记忆', '情绪识别', '人工坐席'],
    starred: false,
    visibleScope: ['部门'],
    dataAccess: '客户档案 · 订单系统',
    versions: [
      { version: 'v4.0-beta', publisher: '张敏', releasedAt: '2026-09-26', current: true },
      { version: 'v3.2', publisher: '张敏', releasedAt: '2026-09-24' },
    ],
    evaluationPassRate: 89.5,
    evaluationRuns: 4,
    evaluationFailedCases: 6,
    trend: [10, 20, 40, 80, 120, 160, 200, 240, 280, 300, 320, 340],
  },
  {
    id: 'a-hr-gray',
    name: 'HR 助手',
    description: '解答员工假勤、薪酬政策、入离职流程与社保公积金问题。',
    category: 'HR',
    owner: '赵琳',
    tone: 'info',
    status: 'graying',
    version: 'v1.0-beta',
    lastUpdate: '昨天',
    calls: 180,
    successRate: 98.42,
    errorRate: 1.10,
    avgLatencyMs: 1700,
    rating: 4.2,
    tools: ['假勤查询', '薪酬政策', '入职流程', '社保查询', '审批中心'],
    starred: false,
    visibleScope: ['部门'],
    dataAccess: 'HR 系统',
    versions: [
      { version: 'v1.0-beta', publisher: '赵琳', releasedAt: '2026-09-25', current: true },
    ],
    evaluationPassRate: 85.3,
    evaluationRuns: 3,
    evaluationFailedCases: 8,
    trend: [0, 10, 20, 30, 60, 90, 120, 140, 160, 170, 175, 180],
  },
  {
    id: 'a-sales-pending',
    name: '销售话术审核助手',
    description: '辅助销售准备合规话术,检查敏感词与价格一致性。',
    category: '销售支持',
    owner: '李雷',
    tone: 'warn',
    status: 'pending',
    version: 'v1.0',
    lastUpdate: '3 小时前',
    calls: 0,
    successRate: 0,
    errorRate: 0,
    avgLatencyMs: 0,
    rating: 0,
    tools: ['敏感词检测', '价格一致性', '话术模板', '审批中心'],
    starred: false,
    visibleScope: ['部门'],
    dataAccess: 'CRM · 话术库',
    versions: [{ version: 'v1.0-rc', publisher: '李雷', releasedAt: '2026-09-26', current: true }],
    evaluationPassRate: 92.6,
    evaluationRuns: 2,
    evaluationFailedCases: 1,
    trend: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  },
  {
    id: 'a-legal-draft',
    name: '法务合规审查',
    description: '辅助合同条款审查,识别风险条款并给出建议。',
    category: '法务',
    owner: '孙浩',
    tone: 'warn',
    status: 'draft',
    version: 'draft',
    lastUpdate: '今天 11:08',
    calls: 0,
    successRate: 0,
    errorRate: 0,
    avgLatencyMs: 0,
    rating: 0,
    tools: ['条款检索', '风险识别', '审批中心'],
    starred: false,
    visibleScope: ['部门'],
    dataAccess: '合同库',
    versions: [],
    evaluationPassRate: 0,
    evaluationRuns: 0,
    evaluationFailedCases: 0,
    trend: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  },
  {
    id: 'a-marketing-draft',
    name: '营销文案',
    description: '辅助市场撰写产品介绍、活动文案与社交媒体推文。',
    category: '市场',
    owner: '周强',
    tone: 'purple',
    status: 'draft',
    version: 'draft',
    lastUpdate: '昨天',
    calls: 0,
    successRate: 0,
    errorRate: 0,
    avgLatencyMs: 0,
    rating: 0,
    tools: ['文案生成', '品牌词库', '多平台适配'],
    starred: false,
    visibleScope: ['部门'],
    dataAccess: '品牌中心',
    versions: [],
    evaluationPassRate: 0,
    evaluationRuns: 0,
    evaluationFailedCases: 0,
    trend: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  },
  {
    id: 'a-customer-v1',
    name: '旧版客服助手',
    description: '上一代客服助手,已迁移到 v3.2 后停止维护。',
    category: '客服一组',
    owner: '张敏',
    tone: 'danger',
    status: 'retired',
    version: 'v1.x',
    lastUpdate: '2026-08-10',
    calls: 0,
    successRate: 0,
    errorRate: 0,
    avgLatencyMs: 0,
    rating: 3.6,
    tools: ['订单查询', 'FAQ'],
    starred: false,
    visibleScope: ['公开'],
    dataAccess: '客户档案',
    versions: [
      { version: 'v1.4', publisher: '张敏', releasedAt: '2026-03-12', current: true },
      { version: 'v1.3', publisher: '张敏', releasedAt: '2025-12-22' },
    ],
    evaluationPassRate: 78.2,
    evaluationRuns: 6,
    evaluationFailedCases: 12,
    trend: [120, 80, 40, 20, 10, 5, 0, 0, 0, 0, 0, 0],
  },
  {
    id: 'a-writer-retired',
    name: '实验性 AI 写手',
    description: '2025 年下半年的探索性项目,已完成实验归档。',
    category: '实验',
    owner: '周强',
    tone: 'danger',
    status: 'retired',
    version: 'v0.3',
    lastUpdate: '2026-06-15',
    calls: 0,
    successRate: 0,
    errorRate: 0,
    avgLatencyMs: 0,
    rating: 3.2,
    tools: ['内容生成'],
    starred: false,
    visibleScope: ['部门'],
    dataAccess: '无',
    versions: [{ version: 'v0.3', publisher: '周强', releasedAt: '2026-04-08', current: true }],
    evaluationPassRate: 68.0,
    evaluationRuns: 4,
    evaluationFailedCases: 18,
    trend: [40, 30, 20, 15, 10, 8, 6, 4, 2, 1, 0, 0],
  },
] satisfies AgentSeed[]).map((seed) => ({
  ...seed,
  prompts: buildPrompts(seed.name, seed.category, seed.owner),
  knowledgeRefs: buildKnowledgeRefs(seed.category),
  memoryPolicy: { ...DEFAULT_MEMORY_POLICY },
  flowRefs: buildFlowRefs(seed.category),
}));

function formatCalls(value: number): string {
  if (value === 0) return '—';
  if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
  return value.toString();
}

function getLifecycleMetrics(list: AgentEntry[]) {
  return {
    all: list.length,
    draft: list.filter((item) => item.status === 'draft').length,
    pending: list.filter((item) => item.status === 'pending').length,
    graying: list.filter((item) => item.status === 'graying').length,
    published: list.filter((item) => item.status === 'published').length,
    retired: list.filter((item) => item.status === 'retired').length,
  };
}

function Sparkline({ data, stroke }: { data: number[]; stroke: string }) {
  const width = 96;
  const height = 28;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = Math.max(max - min, 0.01);
  const x = (index: number) => (index * width) / Math.max(data.length - 1, 1);
  const y = (value: number) => height - ((value - min) / range) * height;
  const line = data.map((value, index) => `${index === 0 ? 'M' : 'L'} ${x(index)} ${y(value)}`).join(' ');
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-7 w-24" preserveAspectRatio="none" aria-hidden="true">
      <path d={line} fill="none" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function StepIndicator({ current, total, labels }: { current: number; total: number; labels: string[] }) {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: total }).map((_, idx) => {
        const stepNum = idx + 1;
        const isActive = stepNum === current;
        const isDone = stepNum < current;
        return (
          <div key={stepNum} className="flex items-center gap-2">
            <div className="flex items-center gap-2">
              <span
                className={`grid h-6 w-6 place-items-center rounded-full text-[10px] font-semibold ${
                  isActive || isDone ? 'bg-[var(--brand)] text-white' : 'bg-[var(--bg-elevated)] text-[var(--text-muted)]'
                }`}
              >
                {stepNum}
              </span>
              <span className={`text-[11px] font-medium ${isActive ? 'text-[var(--brand)]' : 'text-[var(--text-muted)]'}`}>
                {labels[idx]}
              </span>
            </div>
            {stepNum < total && <span className={`h-px w-8 ${isDone ? 'bg-[var(--brand)]' : 'bg-[var(--border)]'}`} />}
          </div>
        );
      })}
    </div>
  );
}

interface AgentCardProps {
  agent: AgentEntry;
  onSelect: (agent: AgentEntry) => void;
  onToggleStar: (id: string) => void;
  selected: boolean;
  onToggleSelect: (id: string) => void;
  menuOpen: boolean;
  onToggleMenu: (id: string | null) => void;
  onEdit: (agent: AgentEntry) => void;
  onDuplicate: (agent: AgentEntry) => void;
  onExportOne: (agent: AgentEntry) => void;
  onRequestDelete: (agent: AgentEntry) => void;
}

function AgentCard({
  agent, onSelect, onToggleStar, selected, onToggleSelect, menuOpen, onToggleMenu,
  onEdit, onDuplicate, onExportOne, onRequestDelete,
}: AgentCardProps) {
  const badge = statusBadge[agent.status];
  const Icon = Bot;
  const isInactive = agent.calls === 0;
  return (
    <div
      className={`group relative flex flex-col gap-4 rounded-2xl border bg-[var(--surface-1)] p-5 text-left transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-sm)] ${
        selected ? 'border-[var(--brand)] shadow-[var(--shadow-sm)]' : 'border-[var(--border)] hover:border-[var(--brand)]'
      }`}
    >
      <div
        role="button"
        tabIndex={0}
        onClick={() => onSelect(agent)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onSelect(agent);
          }
        }}
        aria-label={`查看 ${agent.name} 详情`}
        className="absolute inset-0 z-0 cursor-pointer rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)]"
      />
      <div className="relative z-10 flex items-start justify-between">
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onToggleSelect(agent.id);
          }}
          aria-label={selected ? `取消选择 ${agent.name}` : `选择 ${agent.name}`}
          aria-pressed={selected}
          className={`grid h-9 w-9 place-items-center rounded-lg transition ${
            selected ? 'bg-[var(--brand-light)] text-[var(--brand)]' : 'text-[var(--text-muted)] hover:bg-[var(--bg-hover)]'
          }`}
        >
          {selected ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}
        </button>
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label={agent.starred ? '取消收藏' : '收藏'}
            aria-pressed={agent.starred}
            onClick={(event) => {
              event.stopPropagation();
              onToggleStar(agent.id);
            }}
            className={`grid h-9 w-9 place-items-center rounded-lg transition ${agent.starred ? 'bg-amber-50 text-amber-500 dark:bg-amber-500/15' : 'text-[var(--text-muted)] hover:bg-[var(--bg-hover)] hover:text-amber-500'}`}
          >
            <Star className={`h-4 w-4 ${agent.starred ? 'fill-current' : ''}`} />
          </button>
          <div className="relative">
            <button
              type="button"
              aria-label="操作菜单"
              aria-expanded={menuOpen}
              onClick={(event) => {
                event.stopPropagation();
                onToggleMenu(menuOpen ? null : agent.id);
              }}
              className="grid h-9 w-9 place-items-center rounded-lg text-[var(--text-muted)] transition hover:bg-[var(--bg-hover)] hover:text-[var(--text)]"
            >
              <MoreVertical className="h-4 w-4" />
            </button>
            {menuOpen && (
              <div
                role="menu"
                className="absolute right-0 top-10 z-30 w-36 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] py-1 shadow-lg"
                onClick={(event) => event.stopPropagation()}
              >
                <button type="button" role="menuitem" onClick={() => { onEdit(agent); onToggleMenu(null); }} className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]">
                  <Edit3 className="h-3.5 w-3.5" />编辑
                </button>
                <button type="button" role="menuitem" onClick={() => { onDuplicate(agent); onToggleMenu(null); }} className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]">
                  <Copy className="h-3.5 w-3.5" />复制
                </button>
                <button type="button" role="menuitem" onClick={() => { onExportOne(agent); onToggleMenu(null); }} className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]">
                  <Download className="h-3.5 w-3.5" />导出
                </button>
                <div className="my-1 h-px bg-[var(--border)]" />
                <button type="button" role="menuitem" onClick={() => { onRequestDelete(agent); onToggleMenu(null); }} className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-rose-600 hover:bg-rose-50 dark:text-rose-300 dark:hover:bg-rose-500/15">
                  <Trash2 className="h-3.5 w-3.5" />删除
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="relative z-10 flex items-start gap-3">
        <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl ${toneClass[agent.tone]}`}>
          <Icon className="h-6 w-6" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--text-muted)]">{agent.category} · {agent.owner}</p>
          <h4 className="mt-1.5 text-base font-semibold tracking-tight text-[var(--text)]">{agent.name}</h4>
        </div>
      </div>
      <p className="relative z-10 line-clamp-2 text-xs leading-5 text-[var(--text-muted)]">{agent.description}</p>
      <div className="relative z-10 mt-auto flex flex-wrap items-center gap-3 border-t border-[var(--border)] pt-3 text-[11px]">
        <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 font-semibold ${badge.className}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${badge.dot}`} aria-hidden="true" />
          {badge.label} · {agent.version}
        </span>
        {isInactive ? (
          <span className="inline-flex items-center gap-1 text-[var(--text-muted)]">
            <Clock className="h-3 w-3" />{agent.lastUpdate}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-[var(--text-muted)]">
            <TrendingUp className="h-3 w-3" />调用 {formatCalls(agent.calls)}
          </span>
        )}
      </div>
      {isInactive ? (
        <div className="relative z-10 text-[11px] text-[var(--text-muted)]">{agent.lastUpdate} · 等待评估</div>
      ) : (
        <div className="relative z-10 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-[var(--text-muted)]">
          <span className="inline-flex items-center gap-1"><Sparkles className="h-3 w-3" />评分 {agent.rating.toFixed(1)}</span>
          <span className="inline-flex items-center gap-1"><AlertTriangle className="h-3 w-3" />错误 {agent.errorRate.toFixed(2)}%</span>
          <span className="inline-flex items-center gap-1"><Timer className="h-3 w-3" />延迟 {(agent.avgLatencyMs / 1000).toFixed(1)}s</span>
        </div>
      )}
    </div>
  );
}

function DrawerPanelBasic({ draft, onChange }: { draft: AgentEntry; onChange: (patch: Partial<AgentEntry>) => void }) {
  const update = (patch: Partial<AgentEntry>) => onChange(patch);
  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">名称</label>
          <input
            type="text"
            value={draft.name}
            onChange={(event) => update({ name: event.target.value })}
            className="mt-1.5 h-10 w-full rounded-xl border border-[var(--border-strong)] bg-[var(--bg-elevated)] px-3 text-sm outline-none focus:border-[var(--brand)]"
          />
        </div>
        <div>
          <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">场景分类</label>
          <input
            type="text"
            value={draft.category}
            onChange={(event) => update({ category: event.target.value })}
            className="mt-1.5 h-10 w-full rounded-xl border border-[var(--border-strong)] bg-[var(--bg-elevated)] px-3 text-sm outline-none focus:border-[var(--brand)]"
          />
        </div>
      </div>
      <div>
        <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">描述</label>
        <textarea
          value={draft.description}
          onChange={(event) => update({ description: event.target.value })}
          rows={3}
          className="mt-1.5 w-full rounded-xl border border-[var(--border-strong)] bg-[var(--bg-elevated)] px-3 py-2 text-sm outline-none focus:border-[var(--brand)]"
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">负责人</label>
          <input
            type="text"
            value={draft.owner}
            onChange={(event) => update({ owner: event.target.value })}
            className="mt-1.5 h-10 w-full rounded-xl border border-[var(--border-strong)] bg-[var(--bg-elevated)] px-3 text-sm outline-none focus:border-[var(--brand)]"
          />
        </div>
        <div>
          <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">版本号</label>
          <input
            type="text"
            value={draft.version}
            onChange={(event) => update({ version: event.target.value })}
            className="mt-1.5 h-10 w-full rounded-xl border border-[var(--border-strong)] bg-[var(--bg-elevated)] px-3 text-sm font-mono outline-none focus:border-[var(--brand)]"
          />
        </div>
      </div>
      <div>
        <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">可见范围</label>
        <div className="mt-2 flex flex-wrap gap-2">
          {(['公开', '部门', '个人'] as const).map((scope) => {
            const active = draft.visibleScope.includes(scope);
            return (
              <button
                key={scope}
                type="button"
                onClick={() => update({
                  visibleScope: active
                    ? draft.visibleScope.filter((s) => s !== scope)
                    : [...draft.visibleScope, scope],
                })}
                aria-pressed={active}
                className={`rounded-full border px-3 py-1.5 text-[11px] font-medium transition ${active ? 'border-[var(--brand)] bg-[var(--brand-light)] text-[var(--brand)]' : 'border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--brand)] hover:text-[var(--brand)]'}`}
              >
                {scope}
              </button>
            );
          })}
        </div>
      </div>
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">当前状态</p>
        <div className="mt-3 flex flex-wrap items-center gap-4 text-xs">
          <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-1 font-semibold ${statusBadge[draft.status].className}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${statusBadge[draft.status].dot}`} aria-hidden="true" />
            {statusBadge[draft.status].label}
          </span>
          <span className="text-[var(--text-muted)]">· 最后更新 {draft.lastUpdate}</span>
          <span className="text-[var(--text-muted)]">· 调用 {formatCalls(draft.calls)}</span>
          <span className="text-[var(--text-muted)]">· 评分 {draft.rating > 0 ? draft.rating.toFixed(1) : '—'}</span>
        </div>
        <p className="mt-2 text-[10px] text-[var(--text-muted)]">状态由发布流程控制,不可在编辑器直接修改。</p>
      </div>
    </div>
  );
}

function DrawerPanelVersions({ draft, onOpenDiff }: { draft: AgentEntry; onOpenDiff?: () => void }) {
  if (draft.versions.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-[var(--border)] p-6 text-center">
        <GitBranch className="mx-auto h-6 w-6 text-[var(--text-muted)]" />
        <p className="mt-3 text-sm font-semibold">暂无历史版本</p>
        <p className="mt-1 text-xs text-[var(--text-muted)]">提交审核后将自动记录每个发布版本与发布时间。</p>
      </div>
    );
  }
  const current = draft.versions.find((v) => v.current);
  const previous = draft.versions.filter((v) => !v.current).slice(-1)[0];
  const defaultLeft = previous?.version ?? draft.versions[draft.versions.length - 1].version;
  const defaultRight = current?.version ?? draft.versions[0].version;
  return (
    <div className="space-y-3">
      {draft.versions.map((version) => (
        <div key={version.version} className={`flex items-center gap-3 rounded-xl border p-4 ${version.current ? 'border-emerald-200 bg-emerald-50/40 dark:border-emerald-500/30 dark:bg-emerald-500/5' : 'border-[var(--border)]'}`}>
          <span className={`grid h-10 w-10 place-items-center rounded-lg ${version.current ? 'bg-emerald-100 text-emerald-700' : 'bg-[var(--bg-elevated)] text-[var(--text-muted)]'}`}>
            <GitBranch className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold">{version.version}</p>
              {version.current && <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">当前</span>}
            </div>
            <p className="mt-0.5 text-xs text-[var(--text-muted)]">{version.publisher} · 发布于 {version.releasedAt}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onOpenDiff?.()}
              className="rounded-lg border border-[var(--border)] px-2.5 py-1 text-[11px] font-semibold hover:border-[var(--brand)]"
            >
              查看 diff
            </button>
            {!version.current && <button type="button" className="rounded-lg border border-[var(--border)] px-2.5 py-1 text-[11px] font-semibold hover:border-[var(--brand)]">回滚</button>}
          </div>
        </div>
      ))}
      {draft.versions.length > 1 && (
        <p className="px-1 text-[11px] text-[var(--text-muted)]">共 {draft.versions.length} 个版本 · 默认对比 {defaultLeft} → {defaultRight}。</p>
      )}
    </div>
  );
}

function DrawerPanelSkills({ draft }: { draft: AgentEntry }) {
  if (draft.tools.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-[var(--border)] p-6 text-center">
        <Layers className="mx-auto h-6 w-6 text-[var(--text-muted)]" />
        <p className="mt-3 text-sm font-semibold">暂未绑定技能</p>
        <p className="mt-1 text-xs text-[var(--text-muted)]">在智能体编辑器中关联 Skill / Tool / MCP。</p>
      </div>
    );
  }
  return (
    <div>
      <p className="text-xs text-[var(--text-muted)]">当前智能体可调用的技能能力,修改后将随下次版本发布生效。</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {draft.tools.map((tool) => (
          <span key={tool} className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] px-3 py-2 text-xs font-medium">
            <Layers className="h-3.5 w-3.5 text-[var(--brand)]" />
            {tool}
          </span>
        ))}
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-[var(--border)] p-4">
          <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--text-muted)]">Skill</p>
          <p className="mt-2 text-base font-semibold">{Math.ceil(draft.tools.length / 2)}</p>
        </div>
        <div className="rounded-xl border border-[var(--border)] p-4">
          <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--text-muted)]">Tool</p>
          <p className="mt-2 text-base font-semibold">{Math.floor(draft.tools.length / 2)}</p>
        </div>
        <div className="rounded-xl border border-[var(--border)] p-4">
          <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--text-muted)]">MCP</p>
          <p className="mt-2 text-base font-semibold">{draft.tools.length >= 5 ? 2 : 1}</p>
        </div>
      </div>
    </div>
  );
}

function DrawerPanelEvaluation({
  draft, isRunning, progress, lastResult, onRunEval,
}: {
  draft: AgentEntry;
  isRunning?: boolean;
  progress?: number;
  lastResult?: EvalCase[] | null;
  onRunEval?: () => void;
}) {
  if (draft.evaluationRuns === 0 && !lastResult) {
    return (
      <div className="rounded-2xl border border-dashed border-[var(--border)] p-6 text-center">
        <Beaker className="mx-auto h-6 w-6 text-[var(--text-muted)]" />
        <p className="mt-3 text-sm font-semibold">暂未运行评测</p>
        <p className="mt-1 text-xs text-[var(--text-muted)]">点击下方按钮运行一次基线评测,结果将纳入回归追踪。</p>
        {onRunEval && (
          <button
            type="button"
            onClick={onRunEval}
            disabled={isRunning}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[var(--brand)] px-4 py-2 text-xs font-semibold text-white hover:bg-[var(--brand-hover)] disabled:opacity-50"
          >
            <Play className="h-3.5 w-3.5" />{isRunning ? '运行中...' : '运行评测'}
          </button>
        )}
      </div>
    );
  }
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4 rounded-2xl border border-[var(--border)] p-5">
        <span className="grid h-12 w-12 place-items-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300">
          <Sparkles className="h-6 w-6" />
        </span>
        <div className="flex-1">
          <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--text-muted)]">综合评分</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">{draft.rating.toFixed(1)} <span className="text-xs font-normal text-[var(--text-muted)]">/ 5.0</span></p>
        </div>
        <div className="text-right">
          <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--text-muted)]">通过率</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">{draft.evaluationPassRate.toFixed(1)}%</p>
        </div>
        {onRunEval && (
          <button
            type="button"
            onClick={onRunEval}
            disabled={isRunning}
            className="inline-flex items-center gap-2 rounded-xl border border-[var(--brand)] bg-[var(--brand-light)] px-3 py-2 text-xs font-semibold text-[var(--brand)] hover:bg-white disabled:opacity-50"
          >
            <Play className="h-3.5 w-3.5" />{isRunning ? '运行中...' : '运行评测'}
          </button>
        )}
      </div>
      {isRunning && <EvalProgress progress={progress ?? 0} />}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-[var(--border)] p-4">
          <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--text-muted)]">评测批次</p>
          <p className="mt-2 text-lg font-semibold tabular-nums">{draft.evaluationRuns}</p>
        </div>
        <div className="rounded-xl border border-[var(--border)] p-4">
          <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--text-muted)]">失败用例</p>
          <p className="mt-2 text-lg font-semibold tabular-nums">{draft.evaluationFailedCases}</p>
        </div>
        <div className="rounded-xl border border-[var(--border)] p-4">
          <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--text-muted)]">响应延迟</p>
          <p className="mt-2 text-lg font-semibold tabular-nums">{(draft.avgLatencyMs / 1000).toFixed(2)}s</p>
        </div>
        <div className="rounded-xl border border-[var(--border)] p-4">
          <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--text-muted)]">回归用例</p>
          <p className="mt-2 text-lg font-semibold tabular-nums">{Math.max(draft.evaluationRuns * 12, 12)}</p>
        </div>
      </div>
      {lastResult && (
        <div className="rounded-2xl border border-[var(--border)] p-5">
          <p className="text-xs font-semibold">本次评测 · {lastResult.length} 个用例</p>
          <ul className="mt-3 grid gap-1 sm:grid-cols-2">
            {lastResult.map((c) => (
              <li key={c.id} className="flex items-center justify-between rounded-lg bg-[var(--bg-elevated)] px-3 py-1.5 text-[11px]">
                <span className="font-medium">{c.name}</span>
                {c.status === 'pass'
                  ? <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-300">✓ {c.latency.toFixed(2)}s</span>
                  : <span className="inline-flex items-center gap-1 text-rose-600 dark:text-rose-300">✗ {c.latency.toFixed(2)}s</span>}
              </li>
            ))}
          </ul>
        </div>
      )}
      {!lastResult && (
        <div className="rounded-2xl border border-[var(--border)] p-5">
          <p className="text-xs font-semibold">最近评测批次</p>
          <ul className="mt-3 space-y-2 text-xs">
            {[0, 1, 2].map((i) => (
              <li key={i} className="flex items-center justify-between rounded-lg bg-[var(--bg-elevated)] px-3 py-2">
                <span>基线评测 #{draft.evaluationRuns - i} · 通过 {Math.max(draft.evaluationPassRate - i, 60).toFixed(1)}%</span>
                <span className="text-[var(--text-muted)]">{i === 0 ? '刚刚' : i === 1 ? '昨天' : '3 天前'}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function DrawerPanelPermission({ draft }: { draft: AgentEntry }) {
  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-semibold">可见范围</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {draft.visibleScope.map((scope) => (
            <span key={scope} className="inline-flex items-center gap-2 rounded-full bg-[var(--bg-elevated)] px-3 py-1.5 text-xs font-medium">
              <ShieldCheck className="h-3.5 w-3.5 text-[var(--brand)]" />
              {scope}
            </span>
          ))}
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-[var(--border)] p-4">
          <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--text-muted)]">数据访问范围</p>
          <p className="mt-2 text-sm font-medium">{draft.dataAccess}</p>
        </div>
        <div className="rounded-xl border border-[var(--border)] p-4">
          <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--text-muted)]">负责人</p>
          <p className="mt-2 text-sm font-medium">{draft.owner}</p>
        </div>
      </div>
      <div className="rounded-2xl border border-[var(--border)] p-5">
        <p className="text-xs font-semibold">操作审计</p>
        <p className="mt-1 text-xs text-[var(--text-muted)]">查看该智能体的发布、权限变更与下线记录。</p>
        <ul className="mt-3 space-y-2 text-xs">
          <li className="flex items-center justify-between rounded-lg bg-[var(--bg-elevated)] px-3 py-2"><span>{draft.owner} · 调整可见范围</span><span className="text-[var(--text-muted)]">{draft.lastUpdate}</span></li>
          <li className="flex items-center justify-between rounded-lg bg-[var(--bg-elevated)] px-3 py-2"><span>系统 · 自动回归通过</span><span className="text-[var(--text-muted)]">3 天前</span></li>
          <li className="flex items-center justify-between rounded-lg bg-[var(--bg-elevated)] px-3 py-2"><span>合规 · 内容安全扫描通过</span><span className="text-[var(--text-muted)]">上周</span></li>
        </ul>
      </div>
    </div>
  );
}

function DrawerPanelPrompt({
  draft, promptDoc, setPromptDoc, onChange,
}: {
  draft: AgentEntry;
  promptDoc: PromptKey;
  setPromptDoc: (k: PromptKey) => void;
  onChange: (patch: Partial<PromptDocs>) => void;
}) {
  const currentDoc = PROMPT_DOCS.find((item) => item.key === promptDoc)!;
  const content = draft.prompts[promptDoc];
  const chars = content.length;
  const lines = content.split('\n').length;

  const handleCopy = async () => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(content);
      }
    } catch {
      // 静默失败,演示场景无需提示
    }
  };

  const handleReset = () => {
    const initial = buildPrompts(draft.name, draft.category, draft.owner);
    onChange({ [promptDoc]: initial[promptDoc] });
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-4">
        <p className="text-xs text-[var(--text-secondary)]">智能体运行时使用的 5 份核心文档,变更后随下次版本发布生效。</p>
      </div>
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-1.5">
        {PROMPT_DOCS.map((item) => {
          const active = item.key === promptDoc;
          const isDirty = draft.prompts[item.key] !== buildPrompts(draft.name, draft.category, draft.owner)[item.key];
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => setPromptDoc(item.key)}
              aria-pressed={active}
              className={`relative inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${active ? 'bg-[var(--brand-light)] text-[var(--brand)]' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'}`}
            >
              <FileText className="h-3.5 w-3.5" />
              {item.file}
              {isDirty && <span className="absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full bg-rose-500" aria-label="已修改" />}
            </button>
          );
        })}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-[var(--text-muted)]">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleReset}
            className="inline-flex items-center gap-1 rounded-lg border border-[var(--border)] bg-[var(--surface-1)] px-2.5 py-1 text-[11px] font-semibold hover:border-[var(--brand)]"
          >
            <RotateCcw className="h-3 w-3" />重置为模板
          </button>
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-1 rounded-lg border border-[var(--border)] bg-[var(--surface-1)] px-2.5 py-1 text-[11px] font-semibold hover:border-[var(--brand)]"
          >
            <Copy className="h-3 w-3" />复制全文
          </button>
        </div>
        <div className="flex items-center gap-3">
          <span>{chars.toLocaleString()} 字 · {lines} 行</span>
          <span>· {currentDoc.label} 文件</span>
        </div>
      </div>
      <div>
        <p className="text-[10px] text-[var(--text-muted)]">{currentDoc.description}</p>
        <textarea
          value={content}
          onChange={(event) => onChange({ [promptDoc]: event.target.value })}
          rows={16}
          spellCheck={false}
          className="mt-2 w-full rounded-xl border border-[var(--border-strong)] bg-[var(--bg-elevated)] p-3 font-mono text-xs leading-6 outline-none focus:border-[var(--brand)]"
        />
      </div>
      <p className="text-[10px] text-[var(--text-muted)]">支持 Markdown 语法 · 保存后随下次版本发布生效。</p>
    </div>
  );
}

function DrawerPanelKnowledge({ draft, onChange }: { draft: AgentEntry; onChange: (refs: KnowledgeRef[]) => void }) {
  const toggle = (id: string) => {
    onChange(draft.knowledgeRefs.map((ref) => ref.id === id ? { ...ref, enabled: !ref.enabled } : ref));
  };
  const enabledCount = draft.knowledgeRefs.filter((ref) => ref.enabled).length;
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-4">
        <div>
          <p className="text-xs font-semibold">已启用 {enabledCount} / {draft.knowledgeRefs.length} 个知识库</p>
          <p className="mt-0.5 text-[11px] text-[var(--text-muted)]">智能体只在引用范围内检索,变更后随下次版本发布生效。</p>
        </div>
        <FolderTree className="h-5 w-5 text-[var(--brand)]" />
      </div>
      <div className="space-y-2">
        {draft.knowledgeRefs.map((ref) => (
          <label key={ref.id} className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition ${ref.enabled ? 'border-[var(--brand)] bg-[var(--brand-light)]/40' : 'border-[var(--border)] bg-[var(--surface-1)]'}`}>
            <input
              type="checkbox"
              checked={ref.enabled}
              onChange={() => toggle(ref.id)}
              className="mt-0.5 h-4 w-4 accent-[var(--brand)]"
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold">{ref.name}</p>
                <span className="rounded-full bg-[var(--bg-elevated)] px-2 py-0.5 text-[10px] text-[var(--text-muted)]">{ref.scope}</span>
              </div>
              <p className="mt-0.5 text-[11px] text-[var(--text-muted)]">{ref.id}</p>
            </div>
          </label>
        ))}
      </div>
      <button type="button" className="inline-flex items-center gap-1.5 rounded-xl border border-dashed border-[var(--border)] px-4 py-2 text-xs font-semibold text-[var(--text-muted)] hover:border-[var(--brand)] hover:text-[var(--brand)]">
        <Plus className="h-3.5 w-3.5" />从知识库目录添加
      </button>
    </div>
  );
}

function DrawerPanelMemory({ draft, onChange }: { draft: AgentEntry; onChange: (policy: MemoryPolicy) => void }) {
  const policy = draft.memoryPolicy;
  const update = (patch: Partial<MemoryPolicy>) => onChange({ ...policy, ...patch });
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-4">
        <div>
          <p className="text-xs font-semibold">跨会话记忆</p>
          <p className="mt-0.5 text-[11px] text-[var(--text-muted)]">开启后,智能体可在指定范围内保留偏好与上下文。</p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={policy.enabled}
          onClick={() => update({ enabled: !policy.enabled })}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${policy.enabled ? 'bg-[var(--brand)]' : 'bg-[var(--bg-hover)]'}`}
        >
          <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${policy.enabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
        </button>
      </div>
      {policy.enabled && (
        <>
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">保留时长</label>
            <div className="mt-2 grid grid-cols-4 gap-2">
              {MEMORY_RETENTION_OPTIONS.map((days) => {
                const active = policy.retentionDays === days;
                return (
                  <button
                    key={days}
                    type="button"
                    onClick={() => update({ retentionDays: days })}
                    aria-pressed={active}
                    className={`rounded-xl border px-3 py-2 text-xs font-semibold transition ${active ? 'border-[var(--brand)] bg-[var(--brand-light)] text-[var(--brand)]' : 'border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--brand)] hover:text-[var(--brand)]'}`}
                  >
                    {days} 天
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">可见范围</label>
            <div className="mt-2 space-y-2">
              {MEMORY_SCOPE_OPTIONS.map((opt) => {
                const active = policy.scope === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => update({ scope: opt.value })}
                    aria-pressed={active}
                    className={`flex w-full items-start gap-3 rounded-xl border p-3 text-left transition ${active ? 'border-[var(--brand)] bg-[var(--brand-light)]/40' : 'border-[var(--border)] hover:border-[var(--brand)]'}`}
                  >
                    <span className={`mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full border ${active ? 'border-[var(--brand)] bg-[var(--brand)]' : 'border-[var(--border)]'}`}>
                      {active && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
                    </span>
                    <div>
                      <p className="text-xs font-semibold">{opt.label}</p>
                      <p className="mt-0.5 text-[11px] text-[var(--text-muted)]">{opt.description}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
          <div className="flex items-center justify-between rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-4">
            <div>
              <p className="text-xs font-semibold">自动总结</p>
              <p className="mt-0.5 text-[11px] text-[var(--text-muted)]">每次会话结束自动生成摘要,便于下次快速续接。</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={policy.autoSummarize}
              onClick={() => update({ autoSummarize: !policy.autoSummarize })}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${policy.autoSummarize ? 'bg-[var(--brand)]' : 'bg-[var(--bg-hover)]'}`}
            >
              <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${policy.autoSummarize ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function DrawerPanelFlow({ draft, onChange }: { draft: AgentEntry; onChange: (refs: FlowRef[]) => void }) {
  const toggle = (id: string) => {
    onChange(draft.flowRefs.map((ref) => ref.id === id ? { ...ref, enabled: !ref.enabled } : ref));
  };
  const enabledCount = draft.flowRefs.filter((ref) => ref.enabled).length;
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-4">
        <div>
          <p className="text-xs font-semibold">已绑定 {enabledCount} / {draft.flowRefs.length} 个流程</p>
          <p className="mt-0.5 text-[11px] text-[var(--text-muted)]">智能体可作为触发器、节点或被调用的步骤参与这些流程。</p>
        </div>
        <Workflow className="h-5 w-5 text-[var(--brand)]" />
      </div>
      <div className="space-y-2">
        {draft.flowRefs.map((ref) => (
          <label key={ref.id} className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition ${ref.enabled ? 'border-[var(--brand)] bg-[var(--brand-light)]/40' : 'border-[var(--border)] bg-[var(--surface-1)]'}`}>
            <input
              type="checkbox"
              checked={ref.enabled}
              onChange={() => toggle(ref.id)}
              className="mt-0.5 h-4 w-4 accent-[var(--brand)]"
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold">{ref.name}</p>
                <span className="rounded-full bg-[var(--bg-elevated)] px-2 py-0.5 text-[10px] text-[var(--text-muted)]">{ref.trigger}</span>
              </div>
              <p className="mt-0.5 text-[11px] text-[var(--text-muted)]">{ref.id}</p>
            </div>
          </label>
        ))}
      </div>
      <button type="button" className="inline-flex items-center gap-1.5 rounded-xl border border-dashed border-[var(--border)] px-4 py-2 text-xs font-semibold text-[var(--text-muted)] hover:border-[var(--brand)] hover:text-[var(--brand)]">
        <Plus className="h-3.5 w-3.5" />从流程目录添加
      </button>
    </div>
  );
}

const DRAWER_NAV_ITEMS: Array<{ id: DrawerPanel; label: string; icon: typeof Activity }> = [
  { id: 'basic', label: '基本信息', icon: BookOpen },
  { id: 'prompt', label: 'Prompt', icon: FileText },
  { id: 'skills', label: '技能', icon: Layers },
  { id: 'knowledge', label: '知识', icon: FolderTree },
  { id: 'memory', label: '记忆', icon: Brain },
  { id: 'flow', label: '流程', icon: Workflow },
  { id: 'versions', label: '版本', icon: GitBranch },
  { id: 'evaluation', label: '评测', icon: Beaker },
  { id: 'permission', label: '权限', icon: ShieldCheck },
];

function DrawerSidebar({ panel, setPanel }: { panel: DrawerPanel; setPanel: (p: DrawerPanel) => void }) {
  return (
    <nav aria-label="智能体工作区导航" className="hidden w-[220px] shrink-0 flex-col gap-1 border-r border-[var(--border)] bg-[var(--bg-elevated)] p-4 sm:flex">
      <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">工作区</p>
      {DRAWER_NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        const active = panel === item.id;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => setPanel(item.id)}
            aria-pressed={active}
            className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs font-semibold transition ${active ? 'bg-[var(--brand-light)] text-[var(--brand)]' : 'text-[var(--text-secondary)] hover:bg-[var(--surface-1)]'}`}
          >
            <Icon className="h-4 w-4" />
            {item.label}
          </button>
        );
      })}
    </nav>
  );
}

function BatchToolbar({
  count, onClear, onBatchPublish, onBatchRetire, onBatchDelete, onBatchExport,
}: {
  count: number;
  onClear: () => void;
  onBatchPublish: () => void;
  onBatchRetire: () => void;
  onBatchDelete: () => void;
  onBatchExport: () => void;
}) {
  return (
    <section
      aria-label="批量操作"
      className="flex flex-wrap items-center gap-3 rounded-2xl border border-[var(--brand)] bg-[var(--brand-light)] px-4 py-3 sm:px-5"
    >
      <div className="flex items-center gap-2 text-sm font-semibold text-[var(--brand)]">
        <CheckSquare className="h-4 w-4" />已选 {count} 项
      </div>
      <div className="ml-auto flex flex-wrap items-center gap-2">
        <button type="button" onClick={onBatchPublish} className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--brand)] bg-[var(--surface-1)] px-3 py-1.5 text-[11px] font-semibold text-[var(--brand)] hover:bg-[var(--brand-light)]">
          <CheckCircle2 className="h-3.5 w-3.5" />批量发布
        </button>
        <button type="button" onClick={onBatchRetire} className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface-1)] px-3 py-1.5 text-[11px] font-semibold text-[var(--text-secondary)] hover:border-[var(--brand)] hover:text-[var(--brand)]">
          <Clock className="h-3.5 w-3.5" />批量下线
        </button>
        <button type="button" onClick={onBatchDelete} className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-[var(--surface-1)] px-3 py-1.5 text-[11px] font-semibold text-rose-600 hover:bg-rose-50 dark:border-rose-500/40 dark:text-rose-300 dark:hover:bg-rose-500/15">
          <Trash2 className="h-3.5 w-3.5" />批量删除
        </button>
        <button type="button" onClick={onBatchExport} className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface-1)] px-3 py-1.5 text-[11px] font-semibold text-[var(--text-secondary)] hover:border-[var(--brand)] hover:text-[var(--brand)]">
          <Download className="h-3.5 w-3.5" />批量导出
        </button>
        <button type="button" onClick={onClear} className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-semibold text-[var(--text-muted)] hover:text-[var(--brand)]">
          <X className="h-3.5 w-3.5" />取消选择
        </button>
      </div>
    </section>
  );
}

function EvalProgress({ progress }: { progress: number }) {
  const total = 12;
  const current = Math.min(Math.ceil((progress / 100) * total), total);
  return (
    <div className="rounded-2xl border border-[var(--brand)] bg-[var(--brand-light)]/30 p-4">
      <div className="flex items-center justify-between text-xs">
        <span className="inline-flex items-center gap-2 font-semibold text-[var(--brand)]">
          <Play className="h-3.5 w-3.5" />正在运行评测
        </span>
        <span className="tabular-nums text-[var(--text-muted)]">{progress}%</span>
      </div>
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[var(--bg-elevated)]">
        <div className="h-full bg-[var(--brand)] transition-all duration-200" style={{ width: `${progress}%` }} />
      </div>
      <p className="mt-2 text-[11px] text-[var(--text-muted)]">执行用例 {current}/{total}</p>
    </div>
  );
}

function DiffDialog({
  open, onClose, agent, leftVersion, rightVersion,
}: {
  open: boolean;
  onClose: () => void;
  agent: AgentEntry | null;
  leftVersion: string;
  rightVersion: string;
}) {
  const [subDoc, setSubDoc] = useState<PromptKey>('prompt');
  const [pair, setPair] = useState<{ left: string; right: string }>({ left: leftVersion, right: rightVersion });
  useEffect(() => {
    setPair({ left: leftVersion, right: rightVersion });
  }, [leftVersion, rightVersion, open]);
  if (!agent) return null;

  const leftPrompts = mockHistoricalPrompts(pair.left, agent.prompts);
  const rightPrompts = mockHistoricalPrompts(pair.right, agent.prompts);
  const ops = diffLines(leftPrompts[subDoc], rightPrompts[subDoc]);
  const summary = ops.reduce(
    (acc, op) => {
      if (op.type === 'add') acc.add += 1;
      else if (op.type === 'del') acc.del += 1;
      else if (op.type === 'mod') acc.mod += 1;
      else acc.eq += 1;
      return acc;
    },
    { add: 0, del: 0, mod: 0, eq: 0 },
  );

  const title = <span className="flex items-center gap-2"><GitBranch className="h-5 w-5 text-[var(--brand)]" />版本对比 · {agent.name}</span>;
  const description = `行级 diff · ${pair.left} → ${pair.right}`;
  const footer = (
    <button type="button" onClick={onClose} className="rounded-xl border border-[var(--border)] px-4 py-2 text-xs font-semibold hover:border-[var(--brand)]">关闭</button>
  );

  return (
    <CenterModal
      open={open}
      onClose={onClose}
      ariaLabel="版本对比"
      title={title}
      description={description}
      panelClassName="max-w-5xl"
      footer={footer}
    >
      <div className="mt-4 space-y-4">
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] p-3">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">左</span>
            <select
              value={pair.left}
              onChange={(event) => setPair((prev) => ({ ...prev, left: event.target.value }))}
              className="h-9 rounded-lg border border-[var(--border-strong)] bg-[var(--surface-1)] px-2 text-xs font-medium outline-none focus:border-[var(--brand)]"
            >
              {agent.versions.map((v) => <option key={v.version} value={v.version}>{v.version}</option>)}
            </select>
          </div>
          <ChevronRight className="h-4 w-4 text-[var(--text-muted)]" />
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">右</span>
            <select
              value={pair.right}
              onChange={(event) => setPair((prev) => ({ ...prev, right: event.target.value }))}
              className="h-9 rounded-lg border border-[var(--border-strong)] bg-[var(--surface-1)] px-2 text-xs font-medium outline-none focus:border-[var(--brand)]"
            >
              {agent.versions.map((v) => <option key={v.version} value={v.version}>{v.version}</option>)}
            </select>
          </div>
          <span className="ml-auto text-[11px] text-[var(--text-muted)]">
            <span className="font-semibold text-rose-600">− {summary.del}</span>
            {' · '}
            <span className="font-semibold text-emerald-600">+ {summary.add}</span>
            {' · '}
            <span className="font-semibold text-amber-600">~ {summary.mod}</span>
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-1.5">
          {PROMPT_DOCS.map((item) => {
            const active = item.key === subDoc;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => setSubDoc(item.key)}
                aria-pressed={active}
                className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${active ? 'bg-[var(--brand-light)] text-[var(--brand)]' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'}`}
              >
                <FileText className="h-3.5 w-3.5" />
                {item.file}
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-2 overflow-hidden rounded-xl border border-[var(--border)]">
          <div className="border-r border-[var(--border)] bg-[var(--bg-elevated)] p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">{pair.left}</span>
              <span className="text-[10px] text-[var(--text-muted)]">{leftPrompts[subDoc].split('\n').length} 行</span>
            </div>
            <div className="font-mono text-[11px] leading-6">
              {ops.map((op, idx) => {
                if (op.type === 'add') {
                  return (
                    <div key={`L-${idx}`} className="flex gap-2 px-1 text-[var(--text-muted)]/30">
                      <span className="w-5 shrink-0 select-none text-right">+</span>
                      <span>{' '}</span>
                    </div>
                  );
                }
                const bg = op.type === 'del' ? 'bg-rose-50 text-rose-700' : op.type === 'mod' ? 'bg-amber-50 text-amber-800' : 'text-[var(--text)]';
                return (
                  <div key={`L-${idx}`} className={`flex gap-2 px-1 ${bg}`}>
                    <span className="w-5 shrink-0 select-none text-right text-[var(--text-muted)]">
                      {op.type === 'del' ? '−' : op.type === 'mod' ? '~' : ' '}
                    </span>
                    <span className="whitespace-pre-wrap">{op.leftLine || ' '}</span>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="bg-[var(--bg-elevated)] p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">{pair.right}</span>
              <span className="text-[10px] text-[var(--text-muted)]">{rightPrompts[subDoc].split('\n').length} 行</span>
            </div>
            <div className="font-mono text-[11px] leading-6">
              {ops.map((op, idx) => {
                if (op.type === 'del') {
                  return (
                    <div key={`R-${idx}`} className="flex gap-2 px-1 text-[var(--text-muted)]/30">
                      <span className="w-5 shrink-0 select-none text-right">−</span>
                      <span>{' '}</span>
                    </div>
                  );
                }
                const bg = op.type === 'add' ? 'bg-emerald-50 text-emerald-700' : op.type === 'mod' ? 'bg-amber-50 text-amber-800' : 'text-[var(--text)]';
                return (
                  <div key={`R-${idx}`} className={`flex gap-2 px-1 ${bg}`}>
                    <span className="w-5 shrink-0 select-none text-right text-[var(--text-muted)]">
                      {op.type === 'add' ? '+' : op.type === 'mod' ? '~' : ' '}
                    </span>
                    <span className="whitespace-pre-wrap">{op.rightLine || ' '}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <p className="text-[11px] text-[var(--text-muted)]">
          {summary.eq} 行相同 · {summary.mod} 行修改 · {summary.add} 行新增 · {summary.del} 行删除
        </p>
      </div>
    </CenterModal>
  );
}

function FullscreenWorkspace({
  agent, draft, panel, setPanel, promptDoc, setPromptDoc, onChange, onSave, onCancelEdit, hasUnsaved, onClose,
  isEvalRunningForAgent, evalProgress, lastEvalResultForAgent, onRunEval, onOpenDiff,
}: {
  agent: AgentEntry;
  draft: AgentEntry;
  panel: DrawerPanel;
  setPanel: (p: DrawerPanel) => void;
  promptDoc: PromptKey;
  setPromptDoc: (k: PromptKey) => void;
  onChange: (patch: Partial<AgentEntry>) => void;
  onSave: () => void;
  onCancelEdit: () => void;
  hasUnsaved: boolean;
  onClose: () => void;
  isEvalRunningForAgent: boolean;
  evalProgress: number;
  lastEvalResultForAgent: EvalCase[] | null;
  onRunEval: () => void;
  onOpenDiff: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-[var(--surface-1)]">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] bg-[var(--surface-1)] px-6 py-3">
        <div className="flex flex-wrap items-center gap-3">
          <span className={`grid h-10 w-10 place-items-center rounded-xl ${toneClass[agent.tone]}`}>
            <Bot className="h-5 w-5" />
          </span>
          <div>
            <h3 className="text-lg font-semibold">{agent.name}</h3>
            <p className="text-[11px] text-[var(--text-muted)]">{agent.category} · 负责人 {agent.owner}</p>
          </div>
          <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[11px] font-semibold ${statusBadge[agent.status].className}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${statusBadge[agent.status].dot}`} aria-hidden="true" />
            {statusBadge[agent.status].label} · {agent.version}
          </span>
          {hasUnsaved && <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-1 text-[11px] font-semibold text-amber-700 dark:bg-amber-500/15 dark:text-amber-300"><span className="h-1.5 w-1.5 rounded-full bg-amber-500" />未保存</span>}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={onClose} className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border)] px-3 py-1.5 text-xs font-semibold text-[var(--text-secondary)] hover:border-[var(--brand)]">
            <X className="h-3.5 w-3.5" />退出全屏
          </button>
          <button type="button" onClick={onCancelEdit} disabled={!hasUnsaved} className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border)] px-3 py-1.5 text-xs font-semibold hover:border-[var(--brand)] disabled:cursor-not-allowed disabled:opacity-50">
            <RotateCcw className="h-3.5 w-3.5" />取消编辑
          </button>
          <button type="button" onClick={onSave} disabled={!hasUnsaved} className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--brand)] px-3 py-1.5 text-xs font-semibold text-white shadow-[var(--shadow-sm)] hover:bg-[var(--brand-hover)] disabled:cursor-not-allowed disabled:opacity-50">
            <Save className="h-3.5 w-3.5" />保存修改
          </button>
        </div>
      </header>
      <div className="flex flex-1 overflow-hidden">
        <nav aria-label="智能体工作区导航" className="hidden w-[220px] shrink-0 flex-col gap-1 border-r border-[var(--border)] bg-[var(--bg-elevated)] p-4 sm:flex">
          <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">工作区</p>
          {DRAWER_NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = panel === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setPanel(item.id)}
                aria-pressed={active}
                className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs font-semibold transition ${active ? 'bg-[var(--brand-light)] text-[var(--brand)]' : 'text-[var(--text-secondary)] hover:bg-[var(--surface-1)]'}`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </button>
            );
          })}
        </nav>
        <main className="min-w-0 flex-1 overflow-y-auto px-8 py-6">
          <div className="space-y-6">
            <div className="flex items-start gap-3">
              <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl ${toneClass[agent.tone]}`}>
                <Bot className="h-6 w-6" />
              </span>
              <div className="min-w-0 flex-1">
                <h3 className="text-2xl font-semibold tracking-tight">{agent.name}</h3>
                <p className="mt-1 text-xs text-[var(--text-muted)]">{agent.category} · 负责人 {agent.owner}</p>
                <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{agent.description}</p>
              </div>
            </div>
            <div className="min-h-[260px]">
              {panel === 'basic' && <DrawerPanelBasic draft={draft} onChange={onChange} />}
              {panel === 'prompt' && (
                <DrawerPanelPrompt
                  draft={draft}
                  promptDoc={promptDoc}
                  setPromptDoc={setPromptDoc}
                  onChange={(patch) => onChange({ prompts: { ...draft.prompts, ...patch } })}
                />
              )}
              {panel === 'skills' && <DrawerPanelSkills draft={draft} />}
              {panel === 'knowledge' && (
                <DrawerPanelKnowledge draft={draft} onChange={(refs) => onChange({ knowledgeRefs: refs })} />
              )}
              {panel === 'memory' && (
                <DrawerPanelMemory draft={draft} onChange={(policy) => onChange({ memoryPolicy: policy })} />
              )}
              {panel === 'flow' && (
                <DrawerPanelFlow draft={draft} onChange={(refs) => onChange({ flowRefs: refs })} />
              )}
              {panel === 'versions' && <DrawerPanelVersions draft={draft} onOpenDiff={onOpenDiff} />}
              {panel === 'evaluation' && (
                <DrawerPanelEvaluation
                  draft={draft}
                  isRunning={isEvalRunningForAgent}
                  progress={evalProgress}
                  lastResult={lastEvalResultForAgent}
                  onRunEval={onRunEval}
                />
              )}
              {panel === 'permission' && <DrawerPanelPermission draft={draft} />}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export default function AdminAgents() {
  const [agents, setAgents] = useState<AgentEntry[]>(INITIAL_AGENTS);
  const [tab, setTab] = useState<TabId>('all');
  const [search, setSearch] = useState('');
  const [scene, setScene] = useState<string>('全部场景');
  const [sortKey, setSortKey] = useState<SortKey>('calls');
  const [sortOpen, setSortOpen] = useState(false);
  const [active, setActive] = useState<AgentEntry | null>(null);
  const [editingDraft, setEditingDraft] = useState<AgentEntry | null>(null);
  const [hasUnsaved, setHasUnsaved] = useState(false);
  const [panel, setPanel] = useState<DrawerPanel>('basic');
  const [promptDoc, setPromptDoc] = useState<PromptKey>('prompt');
  const [starredIds, setStarredIds] = useState<Set<string>>(() => new Set(agents.filter((a) => a.starred).map((a) => a.id)));
  const [notice, setNotice] = useState('');

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [openCardMenuId, setOpenCardMenuId] = useState<string | null>(null);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3 | 4>(1);
  const [wizardDraft, setWizardDraft] = useState<WizardDraft>(INITIAL_WIZARD_DRAFT);
  const [importOpen, setImportOpen] = useState(false);
  const [importStep, setImportStep] = useState<1 | 2 | 3>(1);
  const [importPreview, setImportPreview] = useState<ImportRow[]>([]);
  const [importFileName, setImportFileName] = useState('');
  const [exportOpen, setExportOpen] = useState(false);
  const [exportScope, setExportScope] = useState<ExportScope>('tab');
  const [exportFormat, setExportFormat] = useState<ExportFormat>('json');
  const [exportFields, setExportFields] = useState<Record<ExportField, boolean>>(DEFAULT_EXPORT_FIELDS);
  const [confirmDelete, setConfirmDelete] = useState<DeletePayload | null>(null);
  const [confirmDeleteInput, setConfirmDeleteInput] = useState('');

  const [diffState, setDiffState] = useState<{ open: boolean; agentId: string | null; left: string; right: string }>({ open: false, agentId: null, left: '', right: '' });
  const [fullscreenOpen, setFullscreenOpen] = useState(false);
  const [isEvalRunning, setIsEvalRunning] = useState<string | null>(null);
  const [evalProgress, setEvalProgress] = useState(0);
  const [lastEvalResult, setLastEvalResult] = useState<Record<string, EvalCase[]> | null>(null);
  const [importExtension, setImportExtension] = useState<ImportExtension>('json');
  const evalTimerRef = useRef<{ interval: number; timeout: number } | null>(null);

  const menuRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!openCardMenuId) return;
    const onClick = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpenCardMenuId(null);
      }
    };
    window.addEventListener('mousedown', onClick);
    return () => window.removeEventListener('mousedown', onClick);
  }, [openCardMenuId]);

  useEffect(() => {
    setConfirmDeleteInput('');
  }, [confirmDelete]);

  const metrics = useMemo(() => getLifecycleMetrics(agents), [agents]);

  const filtered = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    const next = agents
      .filter((agent) => tab === 'all' || agent.status === tab)
      .filter((agent) => scene === '全部场景' || agent.category.startsWith(scene))
      .filter((agent) => {
        if (!keyword) return true;
        return agent.name.toLowerCase().includes(keyword) || agent.description.toLowerCase().includes(keyword) || agent.owner.toLowerCase().includes(keyword);
      });
    const sorted = [...next];
    if (sortKey === 'calls') sorted.sort((a, b) => b.calls - a.calls);
    else if (sortKey === 'updated') sorted.sort((a, b) => (b.lastUpdate.length - a.lastUpdate.length) || b.name.localeCompare(a.name, 'zh'));
    else if (sortKey === 'rating') sorted.sort((a, b) => b.rating - a.rating);
    else sorted.sort((a, b) => a.name.localeCompare(b.name, 'zh'));
    return sorted;
  }, [agents, tab, search, scene, sortKey]);

  const displayed = useMemo(() => filtered.map((a) => starredIds.has(a.id) ? { ...a, starred: true } : starredIds.has(a.id) === false && a.starred ? { ...a, starred: false } : a), [filtered, starredIds]);

  const visibleCount = filtered.length;

  const selectedAgents = useMemo(
    () => agents.filter((agent) => selectedIds.has(agent.id)),
    [agents, selectedIds],
  );
  const allVisibleSelected = visibleCount > 0 && filtered.every((a) => selectedIds.has(a.id));

  const openDetail = (agent: AgentEntry) => {
    setActive(agent);
    setEditingDraft(structuredClone(agent));
    setHasUnsaved(false);
    setPanel('basic');
    setPromptDoc('prompt');
  };

  const closeDetail = () => {
    setActive(null);
    setEditingDraft(null);
    setHasUnsaved(false);
    setPromptDoc('prompt');
  };

  const updateDraft = (patch: Partial<AgentEntry>) => {
    setEditingDraft((prev) => prev ? { ...prev, ...patch } : prev);
    setHasUnsaved(true);
  };

  const handleSave = () => {
    if (!editingDraft || !active) return;
    const next = editingDraft;
    setAgents((prev) => prev.map((a) => a.id === next.id ? next : a));
    setActive(next);
    setHasUnsaved(false);
    setNotice(`已保存「${next.name}」的修改(演示)。`);
  };

  const handleCancelEdit = () => {
    if (!active) return;
    setEditingDraft(structuredClone(active));
    setHasUnsaved(false);
  };

  const handleToggleStar = (id: string) => {
    setStarredIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAllVisible = () => {
    if (allVisibleSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map((a) => a.id)));
    }
  };

  const handleClearSelection = () => setSelectedIds(new Set());

  const handleEdit = (agent: AgentEntry) => openDetail(agent);

  const handleDuplicate = (source: AgentEntry) => {
    const id = `a-${source.id}-copy-${Date.now()}`;
    const copy: AgentEntry = {
      ...source,
      id,
      name: `${source.name} (副本)`,
      status: 'draft',
      version: 'draft',
      lastUpdate: '刚刚',
      calls: 0,
      successRate: 0,
      errorRate: 0,
      avgLatencyMs: 0,
      rating: 0,
      starred: false,
      versions: [],
      evaluationPassRate: 0,
      evaluationRuns: 0,
      evaluationFailedCases: 0,
      trend: Array.from({ length: 12 }, () => 0),
      prompts: { ...source.prompts },
      knowledgeRefs: source.knowledgeRefs.map((item) => ({ ...item })),
      memoryPolicy: { ...source.memoryPolicy },
      flowRefs: source.flowRefs.map((item) => ({ ...item })),
    };
    setAgents((prev) => [copy, ...prev]);
    setNotice(`已复制「${source.name}」为新草稿,可在编辑器中修改。`);
    setActive(copy);
    setEditingDraft(structuredClone(copy));
    setHasUnsaved(false);
    setPanel('basic');
    setPromptDoc('prompt');
  };

  const handleRequestDelete = (agent: AgentEntry) => {
    setConfirmDelete({ kind: 'single', ids: [agent.id] });
  };

  const handleRequestDeleteSelected = () => {
    if (selectedIds.size === 0) return;
    setConfirmDelete({ kind: 'bulk', ids: Array.from(selectedIds) });
  };

  const handleConfirmDelete = () => {
    if (!confirmDelete) return;
    const idSet = new Set(confirmDelete.ids);
    setAgents((prev) => prev.filter((a) => !idSet.has(a.id)));
    setStarredIds((prev) => {
      const next = new Set(prev);
      confirmDelete.ids.forEach((id) => next.delete(id));
      return next;
    });
    setSelectedIds((prev) => {
      const next = new Set(prev);
      confirmDelete.ids.forEach((id) => next.delete(id));
      return next;
    });
    if (active && idSet.has(active.id)) setActive(null);
    setNotice(confirmDelete.kind === 'single' ? '已删除该智能体。' : `已批量删除 ${confirmDelete.ids.length} 个智能体。`);
    setConfirmDelete(null);
  };

  const handleBatchPublish = () => {
    if (selectedIds.size === 0) return;
    setAgents((prev) => prev.map((a) => selectedIds.has(a.id) && a.status === 'published' ? a : selectedIds.has(a.id) ? { ...a, status: 'published', version: a.version === 'draft' ? 'v1.0' : a.version, lastUpdate: '刚刚' } : a));
    setSelectedIds(new Set());
    setNotice(`已将 ${selectedIds.size} 个智能体标记为已发布(演示)。`);
  };

  const handleBatchRetire = () => {
    if (selectedIds.size === 0) return;
    setAgents((prev) => prev.map((a) => selectedIds.has(a.id) && a.status === 'retired' ? a : selectedIds.has(a.id) ? { ...a, status: 'retired', lastUpdate: '刚刚' } : a));
    setSelectedIds(new Set());
    setNotice(`已将 ${selectedIds.size} 个智能体下线(演示)。`);
  };

  const handleBatchExport = () => {
    setExportScope('selected');
    setExportOpen(true);
  };

  const handleExportOne = (agent: AgentEntry) => {
    setExportScope('all');
    setSelectedIds(new Set([agent.id]));
    setExportOpen(true);
  };

  const openWizard = () => {
    setWizardDraft(INITIAL_WIZARD_DRAFT);
    setWizardStep(1);
    setWizardOpen(true);
  };

  const closeWizard = () => {
    setWizardOpen(false);
    setWizardStep(1);
  };

  const handleCreateFromWizard = () => {
    if (!wizardDraft.name.trim()) return;
    const id = `a-${wizardDraft.name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`;
    const toneFromIcon: Tone = wizardDraft.template === 'customer-service' ? 'brand' : wizardDraft.template === 'sales-support' ? 'success' : 'info';
    const newAgent: AgentEntry = {
      id,
      name: wizardDraft.name.trim(),
      description: wizardDraft.description.trim() || `${wizardDraft.template === 'blank' ? '新建' : '基于模板创建'}的智能体`,
      category: wizardDraft.category,
      owner: wizardDraft.owner,
      tone: toneFromIcon,
      status: 'draft',
      version: 'draft',
      lastUpdate: '刚刚',
      calls: 0,
      successRate: 0,
      errorRate: 0,
      avgLatencyMs: 0,
      rating: 0,
      tools: wizardDraft.defaultSkills,
      starred: false,
      visibleScope: [wizardDraft.visibleScope],
      dataAccess: '尚未配置',
      versions: [],
      evaluationPassRate: 0,
      evaluationRuns: 0,
      evaluationFailedCases: 0,
      trend: Array.from({ length: 12 }, () => 0),
      prompts: buildPrompts(wizardDraft.name.trim(), wizardDraft.category, wizardDraft.owner),
      knowledgeRefs: buildKnowledgeRefs(wizardDraft.category),
      memoryPolicy: { ...DEFAULT_MEMORY_POLICY },
      flowRefs: buildFlowRefs(wizardDraft.category),
    };
    setAgents((prev) => [newAgent, ...prev]);
    setNotice(`已创建智能体「${newAgent.name}」,进入编辑器继续配置。`);
    setWizardOpen(false);
    setWizardStep(1);
    setActive(newAgent);
    setEditingDraft(structuredClone(newAgent));
    setHasUnsaved(false);
    setPanel('basic');
    setPromptDoc('prompt');
  };

  const openImport = () => {
    setImportStep(1);
    setImportFileName('');
    setImportPreview([]);
    setImportOpen(true);
  };

  const closeImport = () => setImportOpen(false);

  const handleImportConfirm = (force: boolean) => {
    const rowsToImport = force ? importPreview.filter((row) => row.status !== 'missing') : importPreview.filter((row) => row.status === 'ok');
    if (rowsToImport.length === 0) {
      setNotice('未导入任何智能体。');
      setImportOpen(false);
      return;
    }
    const tonePalette: Tone[] = ['brand', 'info', 'success', 'warn', 'purple'];
    const created: AgentEntry[] = rowsToImport.map((row, idx) => ({
      id: `a-import-${Date.now()}-${idx}`,
      name: row.source.name || `导入智能体 ${idx + 1}`,
      description: row.source.description || '通过导入创建的智能体',
      category: row.source.category || '未分类',
      owner: row.source.owner || '未指定',
      tone: tonePalette[idx % tonePalette.length],
      status: 'draft',
      version: 'draft',
      lastUpdate: '刚刚',
      calls: 0,
      successRate: 0,
      errorRate: 0,
      avgLatencyMs: 0,
      rating: 0,
      tools: [],
      starred: false,
      visibleScope: ['部门'],
      dataAccess: '尚未配置',
      versions: [],
      evaluationPassRate: 0,
      evaluationRuns: 0,
      evaluationFailedCases: 0,
      trend: Array.from({ length: 12 }, () => 0),
      prompts: buildPrompts(row.source.name || `导入智能体 ${idx + 1}`, row.source.category || '未分类', row.source.owner || '未指定'),
      knowledgeRefs: buildKnowledgeRefs(row.source.category || '未分类'),
      memoryPolicy: { ...DEFAULT_MEMORY_POLICY },
      flowRefs: buildFlowRefs(row.source.category || '未分类'),
    }));
    setAgents((prev) => [...created, ...prev]);
    setNotice(`已导入 ${created.length} 个智能体到草稿(演示)。`);
    setImportOpen(false);
  };

  const openExport = () => {
    setExportScope('tab');
    setExportFormat('json');
    setExportFields(DEFAULT_EXPORT_FIELDS);
    setExportOpen(true);
  };

  const closeExport = () => setExportOpen(false);

  const handleExportConfirm = () => {
    let target = agents;
    if (exportScope === 'tab') target = filtered;
    else if (exportScope === 'selected') target = selectedAgents;
    const enabledFields = EXPORT_FIELDS.filter((f) => exportFields[f.id]).map((f) => f.label).join('、');
    setNotice(`已导出 ${target.length} 个智能体(${exportFormat.toUpperCase()} · ${enabledFields || '无字段'})(演示)。`);
    setExportOpen(false);
  };

  const handleImportFile = (file: File) => {
    const lower = file.name.toLowerCase();
    const ext: ImportExtension = lower.endsWith('.zip')
      ? 'zip'
      : lower.endsWith('.yaml') || lower.endsWith('.yml')
        ? 'yaml'
        : lower.endsWith('.csv')
          ? 'csv'
          : 'json';
    setImportExtension(ext);
    setImportFileName(file.name);
    setImportPreview(ext === 'zip' ? SAMPLE_IMPORT_ZIP : SAMPLE_IMPORT);
    setImportStep(2);
  };

  const handleLoadSample = (ext: ImportExtension = 'json') => {
    setImportExtension(ext);
    setImportFileName(`agents-sample.${ext}`);
    setImportPreview(ext === 'zip' ? SAMPLE_IMPORT_ZIP : SAMPLE_IMPORT);
    setImportStep(2);
  };

  const openFullscreen = () => {
    setFullscreenOpen(true);
  };

  const closeFullscreen = () => {
    setFullscreenOpen(false);
    setActive(null);
    setEditingDraft(null);
  };

  const openDiff = (agent: AgentEntry, leftVersion: string, rightVersion: string) => {
    setDiffState({ open: true, agentId: agent.id, left: leftVersion, right: rightVersion });
  };

  const defaultLeftVer = (agent: AgentEntry) => {
    const previous = agent.versions.filter((v) => !v.current).slice(-1)[0];
    return previous?.version ?? agent.versions[agent.versions.length - 1]?.version ?? agent.version;
  };

  const defaultRightVer = (agent: AgentEntry) => {
    const current = agent.versions.find((v) => v.current);
    return current?.version ?? agent.versions[0]?.version ?? agent.version;
  };

  const closeDiff = () => {
    setDiffState({ open: false, agentId: null, left: '', right: '' });
  };

  const handleRunEval = (agentId: string, agentName: string) => {
    if (evalTimerRef.current) {
      window.clearInterval(evalTimerRef.current.interval);
      window.clearTimeout(evalTimerRef.current.timeout);
      evalTimerRef.current = null;
    }
    setIsEvalRunning(agentId);
    setEvalProgress(0);
    const interval = window.setInterval(() => {
      setEvalProgress((prev) => Math.min(prev + 8, 95));
    }, 200);
    const timeout = window.setTimeout(() => {
      window.clearInterval(interval);
      setEvalProgress(100);
      const cases = generateEvalCases(agentId);
      const passCount = cases.filter((c) => c.status === 'pass').length;
      const passRate = (passCount / cases.length) * 100;
      setAgents((prev) => prev.map((a) => a.id === agentId
        ? {
          ...a,
          evaluationPassRate: passRate,
          evaluationRuns: a.evaluationRuns + 1,
          evaluationFailedCases: cases.filter((c) => c.status === 'fail').length,
        }
        : a));
      setLastEvalResult((prev) => ({ ...(prev || {}), [agentId]: cases }));
      setIsEvalRunning(null);
      setNotice(`已完成「${agentName}」评测 · 通过 ${passCount}/${cases.length} (${passRate.toFixed(1)}%)(演示)。`);
      evalTimerRef.current = null;
    }, 2500);
    evalTimerRef.current = { interval, timeout };
  };

  useEffect(() => {
    return () => {
      if (evalTimerRef.current) {
        window.clearInterval(evalTimerRef.current.interval);
        window.clearTimeout(evalTimerRef.current.timeout);
      }
    };
  }, []);

  const deleteTargetNames = useMemo(() => {
    if (!confirmDelete) return [];
    return agents.filter((a) => confirmDelete.ids.includes(a.id)).map((a) => a.name);
  }, [agents, confirmDelete]);

  const deleteExpectedName = deleteTargetNames[0] ?? '';
  const deleteButtonDisabled = !confirmDelete || confirmDeleteInput.trim() !== deleteExpectedName;

  const drawerActions = (() => {
    if (!active) return null;
    const primary = (() => {
      switch (active.status) {
        case 'draft': return { label: '提交审核', tone: 'brand' };
        case 'pending': return { label: '审核通过', tone: 'brand' };
        case 'graying': return { label: '全量发布', tone: 'brand' };
        case 'published': return { label: '新建版本', tone: 'brand' };
        case 'retired': return { label: '恢复发布', tone: 'brand' };
      }
    })();
    const secondary = active.status === 'pending'
      ? <button type="button" className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] px-4 py-2 text-xs font-semibold hover:border-[var(--brand)]">审核驳回</button>
      : active.status === 'graying'
        ? <button type="button" className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] px-4 py-2 text-xs font-semibold hover:border-[var(--brand)]">停止灰度</button>
        : null;
    return (
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => active && handleDuplicate(active)} className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] px-4 py-2 text-xs font-semibold hover:border-[var(--brand)]">
          <Copy className="h-3.5 w-3.5" />复制
        </button>
        <button type="button" onClick={() => active && handleRequestDelete(active)} className="inline-flex items-center gap-2 rounded-xl border border-rose-200 px-4 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:border-rose-500/40 dark:text-rose-300 dark:hover:bg-rose-500/15">
          <Trash2 className="h-3.5 w-3.5" />删除
        </button>
        {secondary}
        <button type="button" onClick={handleCancelEdit} disabled={!hasUnsaved} className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] px-4 py-2 text-xs font-semibold hover:border-[var(--brand)] disabled:cursor-not-allowed disabled:opacity-50">
          <RotateCcw className="h-3.5 w-3.5" />取消编辑
        </button>
        <button type="button" onClick={handleSave} disabled={!hasUnsaved} className="inline-flex items-center gap-2 rounded-xl bg-[var(--brand)] px-4 py-2 text-xs font-semibold text-white shadow-[var(--shadow-sm)] hover:bg-[var(--brand-hover)] disabled:cursor-not-allowed disabled:opacity-50">
          <Save className="h-3.5 w-3.5" />保存修改
        </button>
        <button type="button" className="inline-flex items-center gap-2 rounded-xl border border-[var(--brand)] bg-white px-4 py-2 text-xs font-semibold text-[var(--brand)] hover:bg-[var(--brand-light)]">
          <CheckCircle2 className="h-4 w-4" />{primary.label}
        </button>
      </div>
    );
  })();

  return (
    <div className="mx-auto w-full max-w-[1440px] space-y-6 p-5 pb-16 sm:p-8 xl:px-10" ref={menuRef}>
      <section className="relative overflow-hidden rounded-[28px] border border-[var(--border)] bg-[var(--surface-1)] px-6 py-8 shadow-[var(--shadow-sm)] sm:px-8">
        <div aria-hidden="true" className="pointer-events-none absolute right-0 top-0 h-full w-1/2 bg-[radial-gradient(circle_at_top_right,var(--brand-light),transparent_68%)]" />
        <div className="relative flex flex-col justify-between gap-6 xl:flex-row xl:items-end">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--brand)]">ADMIN / 智能体管理</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">把企业智能体的全生命周期握在手里。</h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--text-muted)]">创建 → 审核 → 灰度 → 发布 → 监控 → 下线。当前 {metrics.all} 个智能体,其中已发布 {metrics.published} 个,待审核 {metrics.pending} 个,灰度中 {metrics.graying} 个。</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" onClick={openExport} className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] px-3.5 py-2.5 text-xs font-semibold text-[var(--text-secondary)] hover:border-[var(--brand)] hover:text-[var(--brand)]">
              <Download className="h-4 w-4" />导出
            </button>
            <button type="button" onClick={openImport} className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] px-3.5 py-2.5 text-xs font-semibold text-[var(--text-secondary)] hover:border-[var(--brand)] hover:text-[var(--brand)]">
              <Upload className="h-4 w-4" />导入
            </button>
            <button type="button" onClick={openWizard} className="inline-flex items-center gap-2 rounded-xl bg-[var(--brand)] px-3.5 py-2.5 text-xs font-semibold text-white shadow-[var(--shadow-sm)] hover:bg-[var(--brand-hover)]">
              <Plus className="h-4 w-4" />新建智能体
            </button>
          </div>
        </div>
      </section>

      {notice && <NoticeBanner tone="emerald" onClose={() => setNotice('')}>{notice}</NoticeBanner>}

      {selectedIds.size > 0 && (
        <BatchToolbar
          count={selectedIds.size}
          onClear={handleClearSelection}
          onBatchPublish={handleBatchPublish}
          onBatchRetire={handleBatchRetire}
          onBatchDelete={handleRequestDeleteSelected}
          onBatchExport={handleBatchExport}
        />
      )}

      <section aria-label="生命周期 Tab" className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-3 sm:p-4">
        <div className="flex flex-wrap items-center gap-2">
          {TABS.map((item) => {
            const count = metrics[item.id];
            const activeTab = tab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                aria-pressed={activeTab}
                className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition ${activeTab ? 'bg-[var(--brand-light)] text-[var(--brand)] dark:text-indigo-200' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'}`}
              >
                {item.label}
                <span className={`rounded-full px-1.5 py-0.5 text-[10px] tabular-nums ${activeTab ? 'bg-white/70 text-[var(--brand)]' : 'bg-[var(--bg-elevated)] text-[var(--text-muted)]'}`}>{count}</span>
              </button>
            );
          })}
        </div>
      </section>

      <section aria-label="筛选" className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-3">
          <label className="relative flex-1 min-w-[240px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="按名称、描述、负责人搜索"
              className="h-11 w-full rounded-xl border border-[var(--border-strong)] bg-[var(--bg-elevated)] pl-10 pr-3 text-sm outline-none focus:border-[var(--brand)]"
            />
          </label>
          <div className="flex flex-wrap items-center gap-2">
            {SCENES.map((item) => {
              const activeScene = scene === item;
              return (
                <button
                  key={item}
                  type="button"
                  onClick={() => setScene(item)}
                  aria-pressed={activeScene}
                  className={`rounded-full border px-3 py-1.5 text-[11px] font-medium transition ${activeScene ? 'border-[var(--brand)] bg-[var(--brand-light)] text-[var(--brand)]' : 'border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--brand)] hover:text-[var(--brand)]'}`}
                >
                  {item}
                </button>
              );
            })}
          </div>
          <div className="relative">
            <button type="button" onClick={() => setSortOpen((v) => !v)} className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] px-3 py-2 text-xs font-semibold text-[var(--text-secondary)] hover:border-[var(--brand)] hover:text-[var(--brand)]">
              排序:{SORT_OPTIONS.find((option) => option.id === sortKey)?.label}
              <ChevronDown className={`h-3.5 w-3.5 transition ${sortOpen ? 'rotate-180' : ''}`} />
            </button>
            {sortOpen && (
              <div className="absolute right-0 top-12 z-30 w-36 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] py-1 shadow-lg">
                {SORT_OPTIONS.map((option) => (
                  <button key={option.id} type="button" onClick={() => { setSortKey(option.id); setSortOpen(false); }} className={`block w-full px-3 py-2 text-left text-xs ${sortKey === option.id ? 'bg-[var(--brand-light)] text-[var(--brand)]' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'}`}>
                    {option.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        {filtered.length > 0 && (
          <div className="mt-3 flex items-center gap-2 text-[11px] text-[var(--text-muted)]">
            <button
              type="button"
              onClick={handleSelectAllVisible}
              aria-pressed={allVisibleSelected}
              className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 hover:bg-[var(--bg-hover)] hover:text-[var(--brand)]"
            >
              {allVisibleSelected ? <CheckSquare className="h-3.5 w-3.5 text-[var(--brand)]" /> : <Square className="h-3.5 w-3.5" />}
              {allVisibleSelected ? '取消全选' : '全选当前视图'}
            </button>
            <span>· 当前 {filtered.length} 个 · 已选 {selectedIds.size} 个</span>
          </div>
        )}
      </section>

      <section aria-label="智能体列表">
        {displayed.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface-1)] py-16 text-center">
            <Bot className="mx-auto h-8 w-8 text-[var(--text-muted)]" />
            <p className="mt-3 text-sm font-semibold">没有匹配的智能体</p>
            <p className="mt-1 text-xs text-[var(--text-muted)]">尝试调整 Tab、场景或搜索关键词。</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {displayed.map((agent) => (
              <AgentCard
                key={agent.id}
                agent={agent}
                onSelect={openDetail}
                onToggleStar={handleToggleStar}
                selected={selectedIds.has(agent.id)}
                onToggleSelect={handleToggleSelect}
                menuOpen={openCardMenuId === agent.id}
                onToggleMenu={setOpenCardMenuId}
                onEdit={handleEdit}
                onDuplicate={handleDuplicate}
                onExportOne={handleExportOne}
                onRequestDelete={handleRequestDelete}
              />
            ))}
          </div>
        )}
      </section>

      {active && editingDraft && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/45 p-4 sm:items-center sm:p-8"
          role="dialog"
          aria-modal="true"
          aria-label={active ? `${active.name} 详情` : '智能体详情'}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeDetail();
          }}
        >
          <div className="my-4 flex w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-[var(--surface-1)] shadow-2xl sm:my-0" style={{ maxHeight: 'calc(100vh - 4rem)' }}>
            <div className="flex items-center justify-between border-b border-[var(--border)] px-6 py-3">
              <div className="min-w-0 flex-1">
                {active ? (
                  <div className="flex flex-wrap items-center gap-2 text-[11px]">
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-1 font-semibold ${statusBadge[active.status].className}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${statusBadge[active.status].dot}`} aria-hidden="true" />
                      {statusBadge[active.status].label} · {active.version}
                    </span>
                    <span className="text-[var(--text-muted)]">· 最后更新 {active.lastUpdate}</span>
                    {hasUnsaved && <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-1 font-semibold text-amber-700 dark:bg-amber-500/15 dark:text-amber-300"><span className="h-1.5 w-1.5 rounded-full bg-amber-500" />未保存</span>}
                    <button
                      type="button"
                      onClick={openFullscreen}
                      className="ml-2 inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface-1)] px-2.5 py-1 text-[11px] font-semibold text-[var(--text-secondary)] hover:border-[var(--brand)] hover:text-[var(--brand)]"
                    >
                      <Maximize2 className="h-3.5 w-3.5" />全屏编辑
                    </button>
                  </div>
                ) : null}
              </div>
              <button
                type="button"
                onClick={closeDetail}
                aria-label="关闭面板"
                className="ml-3 rounded-lg p-2 text-[var(--text-muted)] hover:bg-[var(--bg-hover)]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="-mt-2 flex flex-1 overflow-hidden">
              <DrawerSidebar panel={panel} setPanel={setPanel} />
              <div className="min-w-0 flex-1 space-y-6 overflow-y-auto px-6 py-6 sm:px-8">
                <div className="sm:hidden">
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {DRAWER_NAV_ITEMS.map((item) => {
                      const Icon = item.icon;
                      const isActive = panel === item.id;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setPanel(item.id)}
                          aria-pressed={isActive}
                          className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-semibold transition ${isActive ? 'border-[var(--brand)] bg-[var(--brand-light)] text-[var(--brand)]' : 'border-[var(--border)] text-[var(--text-secondary)]'}`}
                        >
                          <Icon className="h-3 w-3" />
                          {item.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl ${toneClass[active.tone]}`}>
                    <Bot className="h-6 w-6" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-2xl font-semibold tracking-tight">{active.name}</h3>
                    <p className="mt-1 text-xs text-[var(--text-muted)]">{active.category} · 负责人 {active.owner}</p>
                    <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{active.description}</p>
                  </div>
                </div>
                <div className="min-h-[260px]">
                  {panel === 'basic' && <DrawerPanelBasic draft={editingDraft} onChange={updateDraft} />}
                  {panel === 'prompt' && (
                    <DrawerPanelPrompt
                      draft={editingDraft}
                      promptDoc={promptDoc}
                      setPromptDoc={setPromptDoc}
                      onChange={(patch) => updateDraft({ prompts: { ...editingDraft.prompts, ...patch } })}
                    />
                  )}
                  {panel === 'skills' && <DrawerPanelSkills draft={editingDraft} />}
                  {panel === 'knowledge' && (
                    <DrawerPanelKnowledge
                      draft={editingDraft}
                      onChange={(refs) => updateDraft({ knowledgeRefs: refs })}
                    />
                  )}
                  {panel === 'memory' && (
                    <DrawerPanelMemory
                      draft={editingDraft}
                      onChange={(policy) => updateDraft({ memoryPolicy: policy })}
                    />
                  )}
                  {panel === 'flow' && (
                    <DrawerPanelFlow
                      draft={editingDraft}
                      onChange={(refs) => updateDraft({ flowRefs: refs })}
                    />
                  )}
                  {panel === 'versions' && <DrawerPanelVersions draft={editingDraft} onOpenDiff={() => active && openDiff(active, defaultLeftVer(active), defaultRightVer(active))} />}
                  {panel === 'evaluation' && (
                    <DrawerPanelEvaluation
                      draft={editingDraft}
                      isRunning={isEvalRunning === active?.id}
                      progress={evalProgress}
                      lastResult={active ? lastEvalResult?.[active.id] ?? null : null}
                      onRunEval={() => active && handleRunEval(active.id, active.name)}
                    />
                  )}
                  {panel === 'permission' && <DrawerPanelPermission draft={editingDraft} />}
                </div>
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-5">
                  <p className="text-xs font-semibold">变更说明</p>
                  <p className="mt-1 text-xs text-[var(--text-muted)]">所有动作会写入审计日志并通知团队,正式环境需要管理员审批。</p>
                  <div className="mt-3 flex items-start gap-2 rounded-xl bg-[var(--surface-1)] p-3 text-[11px] text-[var(--text-muted)]">
                    <MessageSquareText className="mt-0.5 h-3.5 w-3.5 text-[var(--brand)]" />
                    <span>{active.owner} 在 {active.lastUpdate} 更新了「{active.name}」 · 自动回归已加入下次发布检查。</span>
                  </div>
                </div>
                <div className="sticky bottom-0 -mx-6 border-t border-[var(--border)] bg-[var(--surface-1)] px-6 py-4 sm:-mx-8 sm:px-8">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <button type="button" onClick={closeDetail} className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--brand)]">
                      <ChevronRight className="h-3.5 w-3.5 rotate-180" />返回列表
                    </button>
                    {drawerActions}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <CreateWizard
        open={wizardOpen}
        onClose={closeWizard}
        step={wizardStep}
        setStep={setWizardStep}
        draft={wizardDraft}
        setDraft={setWizardDraft}
        onCreate={handleCreateFromWizard}
      />

      <ImportDialog
        open={importOpen}
        onClose={closeImport}
        step={importStep}
        setStep={setImportStep}
        fileName={importFileName}
        preview={importPreview}
        extension={importExtension}
        onLoadSample={handleLoadSample}
        onImportFile={handleImportFile}
        onConfirm={handleImportConfirm}
      />

      <ExportDialog
        open={exportOpen}
        onClose={closeExport}
        scope={exportScope}
        setScope={setExportScope}
        format={exportFormat}
        setFormat={setExportFormat}
        fields={exportFields}
        setFields={setExportFields}
        counts={{
          all: agents.length,
          tab: filtered.length,
          selected: selectedAgents.length,
        }}
        onConfirm={handleExportConfirm}
      />

      <DeleteConfirmDialog
        payload={confirmDelete}
        names={deleteTargetNames}
        input={confirmDeleteInput}
        setInput={setConfirmDeleteInput}
        expectedName={deleteExpectedName}
        disabled={deleteButtonDisabled}
        onCancel={() => setConfirmDelete(null)}
        onConfirm={handleConfirmDelete}
      />

      <DiffDialog
        open={diffState.open}
        onClose={closeDiff}
        agent={diffState.agentId ? agents.find((a) => a.id === diffState.agentId) || null : null}
        leftVersion={diffState.left}
        rightVersion={diffState.right}
      />

      {fullscreenOpen && active && editingDraft && (
        <FullscreenWorkspace
          agent={active}
          draft={editingDraft}
          panel={panel}
          setPanel={setPanel}
          promptDoc={promptDoc}
          setPromptDoc={setPromptDoc}
          onChange={updateDraft}
          onSave={handleSave}
          onCancelEdit={handleCancelEdit}
          hasUnsaved={hasUnsaved}
          onClose={closeFullscreen}
          isEvalRunningForAgent={isEvalRunning === active.id}
          evalProgress={evalProgress}
          lastEvalResultForAgent={lastEvalResult?.[active.id] ?? null}
          onRunEval={() => handleRunEval(active.id, active.name)}
          onOpenDiff={() => openDiff(active, defaultLeftVer(active), defaultRightVer(active))}
        />
      )}

      <p className="text-center text-xs text-[var(--text-muted)]">本页为前端演示数据,生产环境将接入智能体生命周期服务与权限审批流。</p>
    </div>
  );
}

function CreateWizard({
  open, onClose, step, setStep, draft, setDraft, onCreate,
}: {
  open: boolean;
  onClose: () => void;
  step: 1 | 2 | 3 | 4;
  setStep: (s: 1 | 2 | 3 | 4) => void;
  draft: WizardDraft;
  setDraft: React.Dispatch<React.SetStateAction<WizardDraft>>;
  onCreate: () => void;
}) {
  const labels = ['基本信息', '模板选择', '快速配置', '确认创建'];
  const canNext =
    step === 1 ? draft.name.trim().length > 0
      : step === 2 ? true
        : step === 3 ? draft.defaultSkills.length > 0
          : true;
  const isLast = step === 4;

  const title = <span className="flex items-center gap-2"><Plus className="h-5 w-5 text-[var(--brand)]" />新建智能体 · {labels[step - 1]}</span>;
  const description = `第 ${step} / 4 步 · 完成后将进入编辑器继续配置。`;

  const footer = (
    <>
      <button type="button" onClick={onClose} className="rounded-xl border border-[var(--border)] px-4 py-2 text-xs font-semibold text-[var(--text-secondary)] hover:border-[var(--brand)]">取消</button>
      {step > 1 && (
        <button type="button" onClick={() => setStep((step - 1) as 1 | 2 | 3 | 4)} className="inline-flex items-center gap-1 rounded-xl border border-[var(--border)] px-4 py-2 text-xs font-semibold hover:border-[var(--brand)]">
          <ChevronLeft className="h-3.5 w-3.5" />上一步
        </button>
      )}
      {isLast ? (
        <button type="button" onClick={onCreate} disabled={!canNext} className="inline-flex items-center gap-2 rounded-xl bg-[var(--brand)] px-4 py-2 text-xs font-semibold text-white hover:bg-[var(--brand-hover)] disabled:opacity-50">
          <Plus className="h-3.5 w-3.5" />创建并进入编辑器
        </button>
      ) : (
        <button type="button" onClick={() => setStep((step + 1) as 1 | 2 | 3 | 4)} disabled={!canNext} className="inline-flex items-center gap-1 rounded-xl bg-[var(--brand)] px-4 py-2 text-xs font-semibold text-white hover:bg-[var(--brand-hover)] disabled:opacity-50">
          下一步<ChevronRight className="h-3.5 w-3.5" />
        </button>
      )}
    </>
  );

  return (
    <CenterModal
      open={open}
      onClose={onClose}
      ariaLabel="新建智能体向导"
      title={title}
      description={description}
      panelClassName="max-w-2xl"
      footer={footer}
    >
      <div className="mt-4">
        <StepIndicator current={step} total={4} labels={labels} />
      </div>

      {step === 1 && (
        <div className="mt-6 space-y-4">
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">名称 *</label>
            <input
              type="text"
              value={draft.name}
              onChange={(event) => setDraft((d) => ({ ...d, name: event.target.value }))}
              placeholder="例如:差旅助手"
              className="mt-1.5 h-10 w-full rounded-xl border border-[var(--border-strong)] bg-[var(--bg-elevated)] px-3 text-sm outline-none focus:border-[var(--brand)]"
            />
          </div>
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">描述</label>
            <textarea
              value={draft.description}
              onChange={(event) => setDraft((d) => ({ ...d, description: event.target.value }))}
              rows={3}
              placeholder="一句话说明这个智能体解决什么问题"
              className="mt-1.5 w-full rounded-xl border border-[var(--border-strong)] bg-[var(--bg-elevated)] px-3 py-2 text-sm outline-none focus:border-[var(--brand)]"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">场景分类</label>
              <select
                value={draft.category}
                onChange={(event) => setDraft((d) => ({ ...d, category: event.target.value }))}
                className="mt-1.5 h-10 w-full rounded-xl border border-[var(--border-strong)] bg-[var(--bg-elevated)] px-3 text-sm outline-none focus:border-[var(--brand)]"
              >
                {SCENES.filter((s) => s !== '全部场景').map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">负责人</label>
              <input
                type="text"
                value={draft.owner}
                onChange={(event) => setDraft((d) => ({ ...d, owner: event.target.value }))}
                className="mt-1.5 h-10 w-full rounded-xl border border-[var(--border-strong)] bg-[var(--bg-elevated)] px-3 text-sm outline-none focus:border-[var(--brand)]"
              />
            </div>
          </div>
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">头像图标</label>
            <div className="mt-2 flex flex-wrap gap-2">
              {WIZARD_ICONS.map(({ name, Icon }) => {
                const active = draft.icon === name;
                return (
                  <button
                    key={name}
                    type="button"
                    onClick={() => setDraft((d) => ({ ...d, icon: name }))}
                    aria-pressed={active}
                    className={`grid h-10 w-10 place-items-center rounded-xl border ${active ? 'border-[var(--brand)] bg-[var(--brand-light)] text-[var(--brand)]' : 'border-[var(--border)] bg-[var(--bg-elevated)] text-[var(--text-muted)] hover:border-[var(--brand)] hover:text-[var(--brand)]'}`}
                  >
                    <Icon className="h-5 w-5" />
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="mt-6 space-y-3">
          {WIZARD_TEMPLATES.map((tpl) => {
            const active = draft.template === tpl.id;
            const Icon = tpl.icon;
            return (
              <button
                key={tpl.id}
                type="button"
                onClick={() => setDraft((d) => ({ ...d, template: tpl.id }))}
                aria-pressed={active}
                className={`flex w-full items-start gap-3 rounded-xl border p-4 text-left transition ${active ? 'border-[var(--brand)] bg-[var(--brand-light)]' : 'border-[var(--border)] hover:border-[var(--brand)]'}`}
              >
                <span className={`grid h-10 w-10 place-items-center rounded-lg ${toneClass[tpl.tone]}`}>
                  <Icon className="h-5 w-5" />
                </span>
                <div className="flex-1">
                  <p className="text-sm font-semibold">{tpl.title}</p>
                  <p className="mt-1 text-[11px] text-[var(--text-muted)]">{tpl.description}</p>
                </div>
                <span className={`grid h-5 w-5 place-items-center rounded-full border ${active ? 'border-[var(--brand)] bg-[var(--brand)] text-white' : 'border-[var(--border)]'}`}>
                  {active && <CheckCircle2 className="h-3.5 w-3.5" />}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {step === 3 && (
        <div className="mt-6 space-y-5">
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">默认模型</label>
            <select
              value={draft.model}
              onChange={(event) => setDraft((d) => ({ ...d, model: event.target.value }))}
              className="mt-1.5 h-10 w-full rounded-xl border border-[var(--border-strong)] bg-[var(--bg-elevated)] px-3 text-sm outline-none focus:border-[var(--brand)]"
            >
              {WIZARD_MODELS.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">默认技能 (至少选 1 个)</label>
            <div className="mt-2 flex flex-wrap gap-2">
              {WIZARD_SKILLS.map((skill) => {
                const active = draft.defaultSkills.includes(skill);
                return (
                  <button
                    key={skill}
                    type="button"
                    onClick={() => setDraft((d) => ({ ...d, defaultSkills: active ? d.defaultSkills.filter((s) => s !== skill) : [...d.defaultSkills, skill] }))}
                    aria-pressed={active}
                    className={`inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-[11px] font-medium transition ${active ? 'border-[var(--brand)] bg-[var(--brand-light)] text-[var(--brand)]' : 'border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--brand)] hover:text-[var(--brand)]'}`}
                  >
                    {active ? <CheckSquare className="h-3 w-3" /> : <Square className="h-3 w-3" />}
                    {skill}
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">可见范围</label>
            <div className="mt-2 flex gap-2">
              {(['公开', '部门', '个人'] as const).map((scope) => {
                const active = draft.visibleScope === scope;
                return (
                  <button
                    key={scope}
                    type="button"
                    onClick={() => setDraft((d) => ({ ...d, visibleScope: scope }))}
                    aria-pressed={active}
                    className={`flex-1 rounded-xl border px-3 py-2 text-xs font-semibold transition ${active ? 'border-[var(--brand)] bg-[var(--brand-light)] text-[var(--brand)]' : 'border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--brand)] hover:text-[var(--brand)]'}`}
                  >
                    {scope}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="mt-6 space-y-4">
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--brand)]">基本信息</p>
            <dl className="mt-3 grid gap-2 text-xs">
              <div className="flex justify-between"><dt className="text-[var(--text-muted)]">名称</dt><dd className="font-medium">{draft.name || '—'}</dd></div>
              <div className="flex justify-between"><dt className="text-[var(--text-muted)]">场景</dt><dd className="font-medium">{draft.category}</dd></div>
              <div className="flex justify-between"><dt className="text-[var(--text-muted)]">负责人</dt><dd className="font-medium">{draft.owner}</dd></div>
              <div className="flex justify-between"><dt className="text-[var(--text-muted)]">图标</dt><dd className="font-medium">{draft.icon}</dd></div>
              {draft.description && <p className="text-[var(--text-muted)]">{draft.description}</p>}
            </dl>
          </div>
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--brand)]">模板</p>
            <p className="mt-2 text-xs">{WIZARD_TEMPLATES.find((t) => t.id === draft.template)?.title}</p>
          </div>
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--brand)]">快速配置</p>
            <dl className="mt-3 grid gap-2 text-xs">
              <div className="flex justify-between"><dt className="text-[var(--text-muted)]">模型</dt><dd className="font-medium">{draft.model}</dd></div>
              <div><dt className="text-[var(--text-muted)]">技能</dt><dd className="mt-1 flex flex-wrap gap-1">{draft.defaultSkills.length ? draft.defaultSkills.map((s) => <span key={s} className="rounded-full bg-[var(--surface-1)] px-2 py-0.5 text-[10px]">{s}</span>) : <span className="text-[var(--text-muted)]">—</span>}</dd></div>
              <div className="flex justify-between"><dt className="text-[var(--text-muted)]">可见范围</dt><dd className="font-medium">{draft.visibleScope}</dd></div>
            </dl>
          </div>
          <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50/50 p-3 text-[11px] text-amber-700 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200">
            <Info className="mt-0.5 h-3.5 w-3.5" />
            <span>智能体创建后将进入「草稿」状态,你可以在编辑器中继续完善 Prompt、技能、知识、流程等。</span>
          </div>
        </div>
      )}
    </CenterModal>
  );
}

function ImportDialog({
  open, onClose, step, setStep, fileName, preview, extension, onLoadSample, onImportFile, onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  step: 1 | 2 | 3;
  setStep: (s: 1 | 2 | 3) => void;
  fileName: string;
  preview: ImportRow[];
  extension: ImportExtension;
  onLoadSample: (ext: ImportExtension) => void;
  onImportFile: (file: File) => void;
  onConfirm: (force: boolean) => void;
}) {
  const labels = ['上传文件', '字段映射', '校验结果'];
  const okCount = preview.filter((r) => r.status === 'ok').length;
  const duplicateCount = preview.filter((r) => r.status === 'duplicate').length;
  const missingCount = preview.filter((r) => r.status === 'missing').length;

  const title = <span className="flex items-center gap-2"><Upload className="h-5 w-5 text-[var(--brand)]" />导入智能体 · {labels[step - 1]}</span>;
  const description = `第 ${step} / 3 步 · 支持 JSON / CSV / YAML / ZIP 格式的批量导入。`;

  const footer = (
    <>
      <button type="button" onClick={onClose} className="rounded-xl border border-[var(--border)] px-4 py-2 text-xs font-semibold text-[var(--text-secondary)] hover:border-[var(--brand)]">取消</button>
      {step > 1 && (
        <button type="button" onClick={() => setStep((step - 1) as 1 | 2 | 3)} className="inline-flex items-center gap-1 rounded-xl border border-[var(--border)] px-4 py-2 text-xs font-semibold hover:border-[var(--brand)]">
          <ChevronLeft className="h-3.5 w-3.5" />上一步
        </button>
      )}
      {step < 3 ? (
        <button type="button" onClick={() => setStep((step + 1) as 1 | 2 | 3)} disabled={step === 1 ? !fileName : preview.length === 0} className="inline-flex items-center gap-1 rounded-xl bg-[var(--brand)] px-4 py-2 text-xs font-semibold text-white hover:bg-[var(--brand-hover)] disabled:opacity-50">
          下一步<ChevronRight className="h-3.5 w-3.5" />
        </button>
      ) : (
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => onConfirm(false)} disabled={okCount === 0} className="rounded-xl border border-[var(--border)] px-4 py-2 text-xs font-semibold text-[var(--text-secondary)] hover:border-[var(--brand)] disabled:opacity-50">跳过重复 · 导入 {okCount} 条</button>
          <button type="button" onClick={() => onConfirm(true)} disabled={okCount + duplicateCount === 0} className="inline-flex items-center gap-2 rounded-xl bg-[var(--brand)] px-4 py-2 text-xs font-semibold text-white hover:bg-[var(--brand-hover)] disabled:opacity-50">
            <Upload className="h-3.5 w-3.5" />强制导入 {okCount + duplicateCount} 条
          </button>
        </div>
      )}
    </>
  );

  return (
    <CenterModal
      open={open}
      onClose={onClose}
      ariaLabel="导入智能体"
      title={title}
      description={description}
      panelClassName="max-w-2xl"
      footer={footer}
    >
      <div className="mt-4">
        <StepIndicator current={step} total={3} labels={labels} />
      </div>

      {step === 1 && (
        <div className="mt-6 space-y-4">
          <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[var(--border)] bg-[var(--bg-elevated)] px-6 py-10 text-center">
            <FileJson className="h-8 w-8 text-[var(--brand)]" />
            <p className="mt-3 text-sm font-semibold">拖放 JSON / CSV / YAML / ZIP 文件到此</p>
            <p className="mt-1 text-[11px] text-[var(--text-muted)]">或</p>
            <label className="mt-3 inline-flex cursor-pointer items-center gap-2 rounded-xl border border-[var(--brand)] bg-[var(--brand-light)] px-4 py-2 text-xs font-semibold text-[var(--brand)] hover:bg-white">
              <Upload className="h-4 w-4" />选择本地文件
              <input
                type="file"
                accept=".json,.csv,.yaml,.yml,.zip"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) onImportFile(file);
                  event.target.value = '';
                }}
              />
            </label>
            {fileName && (
              <p className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[var(--surface-1)] px-3 py-1.5 text-[11px] text-[var(--text-muted)]">
                <FileJson className="h-3 w-3" />已选择:{fileName}
                <span className="rounded bg-[var(--brand-light)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--brand)]">{extension.toUpperCase()}</span>
              </p>
            )}
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">或选择示例数据</p>
            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {IMPORT_FORMATS.map((fmt) => {
                const active = extension === fmt.ext && fileName.startsWith('agents-sample');
                return (
                  <button
                    key={fmt.ext}
                    type="button"
                    onClick={() => onLoadSample(fmt.ext)}
                    className={`flex flex-col items-start gap-0.5 rounded-xl border px-3 py-2 text-left transition ${active ? 'border-[var(--brand)] bg-[var(--brand-light)]' : 'border-[var(--border)] hover:border-[var(--brand)]'}`}
                  >
                    <span className="text-xs font-semibold">{fmt.label}</span>
                    <span className="text-[10px] text-[var(--text-muted)]">{fmt.description}</span>
                  </button>
                );
              })}
            </div>
          </div>
          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] p-3 text-[11px] text-[var(--text-muted)]">
            <p className="font-semibold text-[var(--text)]">支持的字段</p>
            <p className="mt-1">name · description · category · owner · tags · tools · visibleScope</p>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="mt-6 space-y-3">
          <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)]">
            <span>从 <code className="rounded bg-[var(--bg-elevated)] px-1.5 py-0.5 font-mono">{fileName}</code> 识别到 {preview.length} 条记录</span>
            <span>字段映射关系如下</span>
          </div>
          <div className="overflow-hidden rounded-xl border border-[var(--border)]">
            <table className="w-full text-xs">
              <thead className="bg-[var(--bg-elevated)] text-[var(--text-muted)]">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold">文件字段</th>
                  <th className="px-3 py-2 text-left font-semibold">平台字段</th>
                  <th className="px-3 py-2 text-center font-semibold">导入</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { from: 'name', to: '名称' },
                  { from: 'description', to: '描述' },
                  { from: 'category', to: '场景分类' },
                  { from: 'owner', to: '负责人' },
                  { from: 'tags', to: '标签' },
                  { from: 'tools', to: '技能' },
                  { from: 'visibleScope', to: '可见范围' },
                ].map((row) => (
                  <tr key={row.from} className="border-t border-[var(--border)]">
                    <td className="px-3 py-2 font-mono text-[var(--brand)]">{row.from}</td>
                    <td className="px-3 py-2">{row.to}</td>
                    <td className="px-3 py-2 text-center"><CheckSquare className="inline h-4 w-4 text-[var(--brand)]" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="mt-6 space-y-3">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3 text-center dark:border-emerald-500/30 dark:bg-emerald-500/10">
              <CheckCircle2 className="mx-auto h-5 w-5 text-emerald-600 dark:text-emerald-300" />
              <p className="mt-2 text-xl font-semibold tabular-nums text-emerald-700 dark:text-emerald-200">{okCount}</p>
              <p className="mt-0.5 text-[10px] text-emerald-700/80 dark:text-emerald-200/80">可正常导入</p>
            </div>
            <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-3 text-center dark:border-amber-500/30 dark:bg-amber-500/10">
              <AlertTriangle className="mx-auto h-5 w-5 text-amber-600 dark:text-amber-300" />
              <p className="mt-2 text-xl font-semibold tabular-nums text-amber-700 dark:text-amber-200">{duplicateCount}</p>
              <p className="mt-0.5 text-[10px] text-amber-700/80 dark:text-amber-200/80">重名需确认</p>
            </div>
            <div className="rounded-xl border border-rose-200 bg-rose-50/50 p-3 text-center dark:border-rose-500/30 dark:bg-rose-500/10">
              <Info className="mx-auto h-5 w-5 text-rose-600 dark:text-rose-300" />
              <p className="mt-2 text-xl font-semibold tabular-nums text-rose-700 dark:text-rose-200">{missingCount}</p>
              <p className="mt-0.5 text-[10px] text-rose-700/80 dark:text-rose-200/80">字段缺失</p>
            </div>
          </div>
          <div className="max-h-60 overflow-auto rounded-xl border border-[var(--border)]">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-[var(--bg-elevated)] text-[var(--text-muted)]">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold">名称</th>
                  <th className="px-3 py-2 text-left font-semibold">负责人</th>
                  <th className="px-3 py-2 text-left font-semibold">状态</th>
                </tr>
              </thead>
              <tbody>
                {preview.map((row, idx) => (
                  <tr key={idx} className="border-t border-[var(--border)]">
                    <td className="px-3 py-2 font-medium">{row.source.name || '—'}</td>
                    <td className="px-3 py-2 text-[var(--text-muted)]">{row.source.owner || '未指定'}</td>
                    <td className="px-3 py-2">
                      {row.status === 'ok' && <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-300"><CheckCircle2 className="h-3 w-3" />通过</span>}
                      {row.status === 'duplicate' && <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-300"><AlertTriangle className="h-3 w-3" />{row.message}</span>}
                      {row.status === 'missing' && <span className="inline-flex items-center gap-1 text-rose-600 dark:text-rose-300"><Info className="h-3 w-3" />{row.message}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </CenterModal>
  );
}

function ExportDialog({
  open, onClose, scope, setScope, format, setFormat, fields, setFields, counts, onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  scope: ExportScope;
  setScope: (s: ExportScope) => void;
  format: ExportFormat;
  setFormat: (f: ExportFormat) => void;
  fields: Record<ExportField, boolean>;
  setFields: React.Dispatch<React.SetStateAction<Record<ExportField, boolean>>>;
  counts: { all: number; tab: number; selected: number };
  onConfirm: () => void;
}) {
  const targetCount = scope === 'all' ? counts.all : scope === 'tab' ? counts.tab : counts.selected;
  const enabledFieldCount = EXPORT_FIELDS.filter((f) => fields[f.id]).length;

  const title = <span className="flex items-center gap-2"><Download className="h-5 w-5 text-[var(--brand)]" />导出智能体</span>;
  const description = `选择导出范围、格式与字段 · 预计 ${targetCount} 个智能体 · 约 ${Math.max(targetCount * 4, 4)} KB`;

  const footer = (
    <>
      <button type="button" onClick={onClose} className="rounded-xl border border-[var(--border)] px-4 py-2 text-xs font-semibold text-[var(--text-secondary)] hover:border-[var(--brand)]">取消</button>
      <button type="button" onClick={onConfirm} disabled={targetCount === 0 || enabledFieldCount === 0} className="inline-flex items-center gap-2 rounded-xl bg-[var(--brand)] px-4 py-2 text-xs font-semibold text-white hover:bg-[var(--brand-hover)] disabled:opacity-50">
        <Download className="h-3.5 w-3.5" />确认导出 ({format.toUpperCase()})
      </button>
    </>
  );

  return (
    <CenterModal
      open={open}
      onClose={onClose}
      ariaLabel="导出智能体"
      title={title}
      description={description}
      panelClassName="max-w-xl"
      footer={footer}
    >
      <div className="mt-5 space-y-5">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">范围</p>
          <div className="mt-2 space-y-2">
            {([
              { id: 'all' as const, label: '全部智能体', count: counts.all },
              { id: 'tab' as const, label: '当前 Tab / 视图', count: counts.tab },
              { id: 'selected' as const, label: '已选中', count: counts.selected },
            ]).map((opt) => {
              const active = scope === opt.id;
              const disabled = opt.count === 0;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => !disabled && setScope(opt.id)}
                  disabled={disabled}
                  className={`flex w-full items-center justify-between rounded-xl border px-4 py-2.5 text-left text-xs transition ${active ? 'border-[var(--brand)] bg-[var(--brand-light)]' : 'border-[var(--border)] hover:border-[var(--brand)]'} ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
                >
                  <span className="inline-flex items-center gap-2 font-medium">
                    <span className={`grid h-4 w-4 place-items-center rounded-full border ${active ? 'border-[var(--brand)] bg-[var(--brand)]' : 'border-[var(--border)]'}`}>
                      {active && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
                    </span>
                    {opt.label}
                  </span>
                  <span className="text-[var(--text-muted)]">{opt.count} 个</span>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">格式</p>
          <div className="mt-2 flex gap-2">
            {(['json', 'csv', 'yaml'] as const).map((f) => {
              const active = format === f;
              return (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFormat(f)}
                  aria-pressed={active}
                  className={`flex-1 rounded-xl border px-4 py-2 text-xs font-semibold transition ${active ? 'border-[var(--brand)] bg-[var(--brand-light)] text-[var(--brand)]' : 'border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--brand)] hover:text-[var(--brand)]'}`}
                >
                  {f.toUpperCase()}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">字段</p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {EXPORT_FIELDS.map((f) => {
              const active = fields[f.id];
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFields((prev) => ({ ...prev, [f.id]: !prev[f.id] }))}
                  aria-pressed={active}
                  className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs transition ${active ? 'border-[var(--brand)] bg-[var(--brand-light)] text-[var(--brand)]' : 'border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--brand)] hover:text-[var(--brand)]'}`}
                >
                  {active ? <CheckSquare className="h-3.5 w-3.5" /> : <Square className="h-3.5 w-3.5" />}
                  {f.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] px-4 py-3 text-[11px] text-[var(--text-muted)]">
          预览:<span className="font-semibold text-[var(--text)]">{targetCount}</span> 个 · {enabledFieldCount} 个字段 · 约 {Math.max(targetCount * 4, 4)} KB
        </div>
      </div>
    </CenterModal>
  );
}

function DeleteConfirmDialog({
  payload, names, input, setInput, expectedName, disabled, onCancel, onConfirm,
}: {
  payload: DeletePayload | null;
  names: string[];
  input: string;
  setInput: (v: string) => void;
  expectedName: string;
  disabled: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const open = payload != null;
  const title = <span className="flex items-center gap-2"><Trash2 className="h-5 w-5 text-rose-600 dark:text-rose-300" />删除智能体</span>;
  const description = `此操作不可撤销 · 将从企业库中移除${payload?.kind === 'bulk' ? ` ${names.length} 个` : ''}智能体。`;
  const footer = (
    <>
      <button type="button" onClick={onCancel} className="rounded-xl border border-[var(--border)] px-4 py-2 text-xs font-semibold text-[var(--text-secondary)] hover:border-[var(--brand)]">取消</button>
      <button type="button" onClick={onConfirm} disabled={disabled} className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-rose-500 dark:hover:bg-rose-400">
        <Trash2 className="h-3.5 w-3.5" />
        {payload?.kind === 'bulk' ? `删除 ${names.length} 个智能体` : '删除该智能体'}
      </button>
    </>
  );
  return (
    <CenterModal
      open={open}
      onClose={onCancel}
      ariaLabel="删除智能体"
      title={title}
      description={description}
      panelClassName="max-w-lg"
      footer={footer}
    >
      <div className="mt-5 space-y-4">
        <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50/50 p-3 text-[11px] text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5" />
          <span>删除后所有关联的版本、技能绑定、评测历史与权限配置将一并清除,请提前与团队确认。</span>
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">即将删除</p>
          <ul className="mt-2 max-h-40 overflow-auto rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] px-3 py-2 text-xs">
            {names.map((n) => <li key={n} className="py-1">{n}</li>)}
          </ul>
        </div>
        <div>
          <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">
            请输入「{expectedName || '—'}」以确认
          </label>
          <input
            type="text"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            disabled={!expectedName}
            placeholder={expectedName || '—'}
            className="mt-1.5 h-10 w-full rounded-xl border border-[var(--border-strong)] bg-[var(--bg-elevated)] px-3 text-sm outline-none focus:border-[var(--brand)] disabled:opacity-50"
          />
        </div>
      </div>
    </CenterModal>
  );
}