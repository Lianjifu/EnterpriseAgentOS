/**
 * 管理侧「智能体工作台」常量 — Tab/状态徽章/排序/导出字段/向导/导入格式/drawer nav/Prompt 文档/记忆/流程触发器。
 */
import {
  Activity, AlertTriangle, Beaker, BookOpen, Bot, Brain, ChevronDown, ChevronLeft, ChevronRight, CheckCircle2, CheckSquare, Clock, Copy, Download, Edit3, FileJson, FileSpreadsheet, FileText, FolderTree, GitBranch, History, Info, Layers, Maximize2, MessageSquareText, MoreVertical, Play, Plus, RotateCcw, Save, Search, ShieldCheck, Sparkles, Square, Star, Timer, Trash2, TrendingUp, Upload, Workflow, X,
} from 'lucide-react';
import type { Tone, Status, TabId, SortKey, DrawerPanel, PromptKey, ExportField, ExportFormat, ExportScope, MemoryRetention, MemoryScope, FlowTrigger, ImportExtension, VisibleScope, WizardDraft, DeletePayload } from '@/api/admin/agents/schema';

export {
  Activity, AlertTriangle, Beaker, BookOpen, Bot, Brain, ChevronDown, ChevronLeft, ChevronRight, CheckCircle2, CheckSquare, Clock, Copy, Download, Edit3, FileJson, FileSpreadsheet, FileText, FolderTree, GitBranch, History, Info, Layers, Maximize2, MessageSquareText, MoreVertical, Play, Plus, RotateCcw, Save, Search, ShieldCheck, Sparkles, Square, Star, Timer, Trash2, TrendingUp, Upload, Workflow, X,
};

export const TABS: Array<{ id: TabId; label: string }> = [
  { id: 'all', label: '全部' },
  { id: 'draft', label: '草稿' },
  { id: 'pending', label: '待审核' },
  { id: 'graying', label: '灰度中' },
  { id: 'published', label: '已发布' },
  { id: 'retired', label: '已下线' },
];

export const SCENES = ['全部场景', '客服', '销售', '数据', '财务', '流程', 'HR', 'IT'];

export const toneClass: Record<Tone, string> = {
  brand: 'bg-[var(--brand-light)] text-[var(--brand)]',
  info: 'bg-[var(--info-bg)] text-[var(--info)]',
  success: 'bg-[var(--success-bg)] text-[var(--success)]',
  warn: 'bg-[var(--warning-bg)] text-[var(--warning)]',
  danger: 'bg-[var(--danger-bg)] text-[var(--danger)]',
  purple: 'bg-[var(--purple-bg)] text-[var(--purple)]',
};

export const statusBadge: Record<Status, { label: string; className: string; dot: string }> = {
  draft: { label: '草稿', className: 'bg-[var(--bg-elevated)] text-[var(--text-secondary)]', dot: 'bg-[var(--text-muted)]' },
  pending: { label: '待审核', className: 'bg-[var(--warning-bg)] text-[var(--warning)]', dot: 'bg-[var(--warning)]' },
  graying: { label: '灰度中', className: 'bg-[var(--info-bg)] text-[var(--info)]', dot: 'bg-[var(--info)]' },
  published: { label: '已发布', className: 'bg-[var(--success-bg)] text-[var(--success)]', dot: 'bg-[var(--success)]' },
  retired: { label: '已下线', className: 'bg-[var(--danger-bg)] text-[var(--danger)]', dot: 'bg-[var(--danger)]' },
};

export const SORT_OPTIONS: Array<{ id: SortKey; label: string }> = [
  { id: 'calls', label: '调用量' },
  { id: 'updated', label: '最近更新' },
  { id: 'rating', label: '评分' },
  { id: 'name', label: '名称' },
];

export const EXPORT_FIELDS: Array<{ id: ExportField; label: string }> = [
  { id: 'meta', label: '元信息' },
  { id: 'prompt', label: 'Prompt' },
  { id: 'skills', label: '技能' },
  { id: 'knowledge', label: '知识' },
  { id: 'memory', label: '记忆' },
  { id: 'flow', label: '流程' },
];

export const WIZARD_TEMPLATES: Array<{ id: WizardDraft['template']; title: string; description: string; icon: typeof Bot; tone: Tone }> = [
  { id: 'blank', title: '空白智能体', description: '从零开始,自行配置 Prompt、技能与权限。', icon: Bot, tone: 'info' },
  { id: 'customer-service', title: '客服场景模板', description: '内置订单查询、退换货、情绪识别等客服常用技能。', icon: MessageSquareText, tone: 'brand' },
  { id: 'sales-support', title: '销售支持模板', description: '内置 CRM 查询、报价引擎、合同条款检索。', icon: TrendingUp, tone: 'success' },
];

export const WIZARD_ICONS: Array<{ name: string; Icon: typeof Bot }> = [
  { name: 'Bot', Icon: Bot },
  { name: 'Sparkles', Icon: Sparkles },
  { name: 'MessageSquareText', Icon: MessageSquareText },
  { name: 'TrendingUp', Icon: TrendingUp },
  { name: 'Beaker', Icon: Beaker },
  { name: 'ShieldCheck', Icon: ShieldCheck },
];

export const WIZARD_MODELS = ['GPT-4o (默认)', 'Claude Sonnet 4.5', 'Qwen 2.5 72B', 'DeepSeek V3', '混元 Pro'];
export const WIZARD_SKILLS = ['订单查询', '客户画像', 'CRM 查询', '知识检索', '邮件发送', '审批中心', '日程预约', '敏感词检测'];

export const IMPORT_FORMATS: Array<{ ext: ImportExtension; label: string; description: string }> = [
  { ext: 'json', label: 'JSON', description: '结构化数组,字段一一映射' },
  { ext: 'csv', label: 'CSV', description: '表格导入,首行为表头' },
  { ext: 'yaml', label: 'YAML', description: 'YAML 列表,支持注释' },
  { ext: 'zip', label: 'ZIP', description: '压缩包,可包含多个文件' },
];

export const INITIAL_WIZARD_DRAFT: WizardDraft = {
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

export const DEFAULT_EXPORT_FIELDS: Record<ExportField, boolean> = {
  meta: true,
  prompt: true,
  skills: true,
  knowledge: true,
  memory: true,
  flow: false,
};

export const PROMPT_DOCS: Array<{ key: PromptKey; file: string; label: string; description: string }> = [
  { key: 'prompt', file: 'PROMPT.md', label: 'PROMPT', description: '主提示词 · 决定智能体的任务目标与输出格式' },
  { key: 'soul', file: 'SOUL.md', label: 'SOUL', description: '人格与价值观 · 语气、立场、行为边界' },
  { key: 'agents', file: 'AGENTS.md', label: 'AGENTS', description: '子智能体协作 · 拆分任务、转发与回传结果' },
  { key: 'user', file: 'USER.md', label: 'USER', description: '用户画像 · 行业、角色、偏好与上下文' },
  { key: 'tools', file: 'TOOLS.md', label: 'TOOLS', description: '工具说明 · Skill / Tool / MCP 调用意图' },
];

export const MEMORY_RETENTION_OPTIONS: MemoryRetention[] = [7, 30, 90, 365];

export const MEMORY_SCOPE_OPTIONS: Array<{ value: MemoryScope; label: string; description: string }> = [
  { value: 'session', label: '单次会话', description: '随对话结束自动清除' },
  { value: 'user', label: '用户级', description: '同一用户跨会话保留' },
  { value: 'tenant', label: '租户级', description: '团队内共享上下文' },
];

export const FLOW_TRIGGERS: FlowTrigger[] = ['消息触发', '定时触发', '事件触发', '手动触发'];

export const DRAWER_NAV_ITEMS: Array<{ id: DrawerPanel; label: string; icon: typeof Activity }> = [
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

export type { Tone, Status, TabId, SortKey, DrawerPanel, PromptKey, ExportField, ExportFormat, ExportScope, VisibleScope, WizardDraft, DeletePayload };
