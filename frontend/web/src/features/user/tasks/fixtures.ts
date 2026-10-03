/**
 * 用户侧「我的任务」fixtures — 与原 MyTasks.tsx 内联数据对应。
 */
import type { Task } from './schema';

export const mockTasks: Task[] = [
  { id: 't1', title: '确认销售报价单', source: '销售支持助手', owner: '我', status: '待处理', due: '今天 15:00', time: '约 5 分钟', description: '请确认报价范围和折扣说明,确认后将进入客户沟通环节。', priority: '高' },
  { id: 't2', title: '整理本周客户反馈', source: '客户沟通助手', owner: '我', status: '执行中', due: '今天 17:00', time: '已运行 12 分钟', description: '正在整理最近 12 条客户反馈,并按主题生成摘要。', priority: '中' },
  { id: 't3', title: '查看入职资料清单', source: '新成员入职准备', owner: '人力资源团队', status: '已完成', due: '昨天 18:00', time: '完成于昨天', description: '入职资料已准备完成,可从团队空间查看共享结果。', priority: '低' },
  { id: 't4', title: '重新生成服务问题摘要', source: '客户反馈分类', owner: '客户成功团队', status: '异常', due: '周一 11:30', time: '需要重试', description: '部分输入资料暂时不可用,修复后可以重新运行。', priority: '高' },
  { id: 't5', title: '审核产品发布问答', source: '产品资料与常见问题', owner: '产品协作组', status: '待处理', due: '明天 10:00', time: '约 10 分钟', description: '请审核对外问答中的新功能描述和支持口径。', priority: '中' },
  { id: 't6', title: '归档九月用户反馈纪要', source: '我的协作', owner: '我', status: '已完成', due: '上周五', time: '完成于上周', description: '纪要已归档至产品协作组,保留引用和行动项。', priority: '低' },
];