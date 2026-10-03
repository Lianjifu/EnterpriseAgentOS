/**
 * 用户侧「智能体库」fixtures — 与原 Agents.tsx 内联数据对应。
 * dev:demo 走 mock.ts 通用 ladder 时若字段不匹配,fallback 到这里。
 */
import type { Agent } from './schema';

export const mockAgents: Agent[] = [
  { id: 'customer-followup', name: '客户沟通助手', description: '把零散的客户信息整理成清晰的沟通重点和下一步建议。', category: '销售支持', owner: '销售支持团队', useCase: '准备客户回访、梳理商机进展', input: '客户问题或沟通记录', output: '沟通摘要与跟进建议', example: '根据这段客户沟通记录,帮我整理下次回访的重点。', tone: 'bg-sky-50 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300' },
  { id: 'policy-answers', name: '企业制度问答', description: '依据企业制度资料回答常见问题,并提示你核对原始依据。', category: '企业通用', owner: '人事团队', useCase: '查询入职、请假及报销规则', input: '关于企业制度的问题', output: '制度说明与参考方向', example: '入职第一周需要完成哪些手续？', tone: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300' },
  { id: 'service-replies', name: '客服回复助手', description: '参考服务规范,将客户问题转成准确、友好的回复草稿。', category: '客服应答', owner: '客户成功团队', useCase: '处理常见咨询、准备服务回复', input: '客户提问和必要的背景', output: '可检查的回复草稿', example: '请帮我给这位客户写一份简洁、礼貌的回复。', tone: 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300' },
  { id: 'data-summary', name: '数据摘要助手', description: '提炼表格中的关键变化,将数字转成可读的业务结论。', category: '数据分析', owner: '数据团队', useCase: '阅读报表、提取业务变化', input: '数据或表格内容', output: '重点变化与摘要', example: '分析这份数据,找出最值得关注的三个变化。', tone: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300' },
  { id: 'marketing-copy', name: '营销文案助手', description: '根据产品信息和目标受众,准备不同渠道的文案初稿。', category: '文案创作', owner: '市场团队', useCase: '活动预热、产品介绍与内容改写', input: '产品信息和传播目标', output: '可编辑的多渠道文案', example: '为这款产品写三版面向新客户的介绍文案。', tone: 'bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300' },
];

export const mockAgentFavorites: string[] = ['customer-followup'];