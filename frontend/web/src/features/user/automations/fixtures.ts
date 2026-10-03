/**
 * 用户侧「我的工作流」fixtures — 与原 MyAutomations.tsx 内联数据对应。
 */
import type { Flow, FlowRun } from './schema';

export const mockFlows: Flow[] = [
  { id: 'weekly', name: '销售周报自动整理', scene: '销售支持', description: '汇总客户沟通与本周进展,生成可以直接审阅的周报初稿。', owner: '销售支持团队', cadence: '每周五 · 17:00', availability: 'available', steps: ['收集工作记录', '整理关键进展', '生成周报草稿'], lastRun: '昨天使用', usage: 28 },
  { id: 'onboarding', name: '新成员入职准备', scene: '团队协作', description: '把入职前后的准备事项串起来,让每位参与者清楚下一步。', owner: '人力资源团队', cadence: '手动使用', availability: 'available', steps: ['确认入职信息', '准备账号与资料', '发送欢迎清单'], lastRun: '3 天前使用', usage: 16 },
  { id: 'briefing', name: '晨间信息简报', scene: '行政办公', description: '从指定资料中提取重点,形成每天开工前的简短摘要。', owner: '运营支持团队', cadence: '工作日 · 09:00', availability: 'available', steps: ['读取资料', '提炼重点', '生成简报'], lastRun: '今天使用', usage: 34 },
  { id: 'feedback', name: '客户反馈分类', scene: '销售支持', description: '把零散反馈整理成主题,为产品团队提供清晰的跟进线索。', owner: '客户成功团队', cadence: '手动使用', availability: 'unavailable', steps: ['收集反馈', '归类主题', '生成跟进项'], lastRun: '上周使用', usage: 9 },
  { id: 'launch', name: '产品发布协同清单', scene: '团队协作', description: '按发布阶段提醒相关成员,集中查看准备进度和待确认事项。', owner: '产品协作组', cadence: '手动使用', availability: 'available', steps: ['确认发布范围', '检查协作事项', '生成发布清单'], lastRun: '本周使用', usage: 13 },
];

export const mockFlowRuns: FlowRun[] = [
  { id: 'r1', name: '晨间信息简报', time: '今天 · 09:00', result: '演示完成' },
  { id: 'r2', name: '销售周报自动整理', time: '昨天 · 17:00', result: '演示完成' },
  { id: 'r3', name: '新成员入职准备', time: '3 天前', result: '演示完成' },
];

export const mockFlowFavorites: string[] = ['weekly', 'briefing'];