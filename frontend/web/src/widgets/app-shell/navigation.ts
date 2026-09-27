import {
  Bot,
  CircleHelp,
  FileText,
  Gauge,
  BellRing,
  Boxes,
  CircleDollarSign,
  ClipboardCheck,
  CloudCog,
  FileKey2,
  ListTodo,
  MessagesSquare,
  Settings2,
  Sparkles,
  UsersRound,
  Workflow,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface NavigationItem {
  label: string;
  href: string;
  icon: LucideIcon;
  description: string;
}

export interface NavigationSection {
  title: string;
  items: NavigationItem[];
}

export const workspaceNavigation: NavigationItem[] = [
  { label: '首页', href: '/home', icon: Gauge, description: '查看今天需要处理的事项' },
  { label: '智能体广场', href: '/agents', icon: Bot, description: '发现和使用团队智能体' },
  { label: '我的对话', href: '/copilot', icon: MessagesSquare, description: '发起对话并跟进执行结果' },
  { label: '我的知识', href: '/knowledge', icon: FileText, description: '基于企业资料获取可信答案' },
  { label: '我的技能', href: '/skills', icon: Sparkles, description: '选择可用 Skill、Tool 和 MCP 能力' },
  { label: '我的流程', href: '/automations', icon: Workflow, description: '选择和使用团队准备好的流程' },
  { label: '我的协作', href: '/team', icon: UsersRound, description: '共享团队智能体与知识' },
];

export const utilityNavigation: NavigationItem[] = [
  { label: '帮助', href: '/help', icon: CircleHelp, description: '获取平台使用帮助' },
  { label: '设置', href: '/account', icon: Settings2, description: '管理用户信息、账号安全与偏好' },
];

export const taskNavigation: NavigationItem[] = [
  { label: '任务记录', href: '/tasks', icon: ListTodo, description: '查看执行记录和待办' },
];

export const adminNavigationSections: NavigationSection[] = [
  { title: '平台总览', items: [
    { label: '运营概览', href: '/admin/overview', icon: Sparkles, description: '查看平台健康、异常和建议动作' },
  ] },
  { title: '智能体建设', items: [
    { label: '智能体与应用', href: '/admin/agents', icon: Bot, description: '创建、评测和发布企业智能体' },
    { label: '知识库建设', href: '/admin/knowledge', icon: FileText, description: '管理知识库、资料来源和访问权限' },
    { label: '自动化流程', href: '/admin/workflows', icon: Workflow, description: '设计、发布和分析自动化流程' },
    { label: '插件与工具', href: '/admin/tools', icon: Boxes, description: '管理外部系统和执行工具接入' },
  ] },
  { title: '平台配置', items: [
    { label: '模型与算力', href: '/admin/models', icon: CloudCog, description: '配置模型服务和运行策略' },
    { label: '额度与成本', href: '/admin/quotas', icon: CircleDollarSign, description: '管理企业用量和成本策略' },
    { label: '角色与权限', href: '/admin/roles', icon: FileKey2, description: '配置角色、权限和访问范围' },
  ] },
  { title: '运行中心', items: [
    { label: '运行监控', href: '/admin/operations', icon: Gauge, description: '查看发布能力和运行状态' },
    { label: '告警配置', href: '/admin/alerts', icon: BellRing, description: '配置异常通知和告警策略' },
  ] },
  { title: '安全治理', items: [
    { label: '安全与合规', href: '/admin/security', icon: ClipboardCheck, description: '管理内容安全和数据合规' },
    { label: '审计日志', href: '/admin/audit', icon: ListTodo, description: '追踪成员和平台操作记录' },
  ] },
  { title: '组织管理', items: [
    { label: '成员与团队', href: '/admin/members', icon: UsersRound, description: '管理成员、团队和工作空间' },
  ] },
  { title: '系统设置', items: [
    { label: '系统设置', href: '/admin/settings', icon: Settings2, description: '配置品牌、通知和开放平台' },
  ] },
  { title: '运营支持', items: [
    { label: '公告与支持', href: '/admin/support', icon: CircleHelp, description: '发布公告并处理支持请求' },
  ] },
];
