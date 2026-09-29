import {
  Activity,
  Bot,
  Brain,
  Boxes,
  Beaker,
  CircleDollarSign,
  CircleHelp,
  CloudCog,
  FileText,
  Gauge,
  History,
  LineChart,
  ListTodo,
  Megaphone,
  MessagesSquare,
  ScrollText,
  Settings2,
  ShieldAlert,
  Sparkles,
  ThumbsUp,
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
  { label: '我的对话', href: '/copilot', icon: MessagesSquare, description: '发起对话并跟进执行结果' },
  { label: '我的任务', href: '/tasks', icon: ListTodo, description: '查看待处理、执行中和已完成的工作' },
  { label: '智能体库', href: '/agents', icon: Bot, description: '查看管理员已开放的智能体并选用' },
  { label: '我的知识', href: '/knowledge', icon: FileText, description: '基于企业资料获取可信答案' },
  { label: '我的技能', href: '/skills', icon: Sparkles, description: '选择可用 Skill、Tool 和 MCP 能力' },
  { label: '我的流程', href: '/automations', icon: Workflow, description: '选择和使用团队准备好的流程' },
  { label: '我的协作', href: '/team', icon: UsersRound, description: '共享团队智能体与知识' },
];

export const utilityNavigation: NavigationItem[] = [
  { label: '帮助', href: '/help', icon: CircleHelp, description: '获取平台使用帮助' },
  { label: '设置', href: '/account', icon: Settings2, description: '管理用户信息、账号安全与偏好' },
];

export const adminUtilityNavigation: NavigationItem[] = [
  { label: '管理员帮助', href: '/admin/help', icon: CircleHelp, description: '查看管理员文档、常见操作与反馈入口' },
  { label: '平台设置', href: '/admin/settings', icon: Settings2, description: '配置品牌、合规、审计与成员管理' },
];

export const adminNavigationSections: NavigationSection[] = [
  { title: '运营总览', items: [
    { label: '运营概览', href: '/admin/overview', icon: Sparkles, description: '查看平台健康、异常和建议动作' },
  ] },
  { title: '能力建设', items: [
    { label: '智能体管理', href: '/admin/agents', icon: Bot, description: '创建、评测和发布企业智能体' },
    { label: '知识管理', href: '/admin/knowledge', icon: FileText, description: '管理知识库、资料来源和访问权限' },
    { label: '记忆管理', href: '/admin/memory', icon: Brain, description: '管理智能体记忆、用户偏好与跨会话上下文' },
    { label: '工作流管理', href: '/admin/workflows', icon: Workflow, description: '设计、发布和分析自动化流程' },
    { label: '技能管理', href: '/admin/tools', icon: Boxes, description: '管理 Skill / Tool / MCP 等技能能力' },
  ] },
  { title: '质量保障', items: [
    { label: '评测中心', href: '/admin/evaluations', icon: Beaker, description: '评测智能体、知识与流程的质量与对比' },
    { label: '回归追踪', href: '/admin/regressions', icon: History, description: '版本变更后自动跑回归用例，发现质量退化' },
    { label: '用户反馈', href: '/admin/feedback', icon: ThumbsUp, description: '收集用户对智能体回答的赞踩与修正建议' },
  ] },
  { title: '平台治理', items: [
    { label: '模型配置', href: '/admin/models', icon: CloudCog, description: '配置模型服务、路由策略与健康监控' },
    { label: '额度管理', href: '/admin/quotas', icon: CircleDollarSign, description: '管理企业用量、预算与成本执行' },
    { label: '渠道管理', href: '/admin/notifications', icon: Megaphone, description: '邮件、IM、Webhook 与告警接收人' },
  ] },
  { title: '可观测', items: [
    { label: '调用链路', href: '/admin/operations', icon: Activity, description: '会话追溯：还原智能体 / 工具 / MCP 的完整调用链与上下文' },
    { label: '工具审计', href: '/admin/tool-audit', icon: ShieldAlert, description: '工具风险：追踪工具调用、权限越界与异常敏感操作' },
    { label: '运行指标', href: '/admin/metrics', icon: LineChart, description: '成本效率：可用率、延迟、Token 与成本等关键指标' },
  ] },
];
