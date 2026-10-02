/**
 * AdminFeedback — fixture 数据。
 * 与 AdminFeedback.tsx 顶部 INITIAL_FEEDBACK / INITIAL_TICKETS / INITIAL_TOPICS / INITIAL_RULES 等价;
 * 12 反馈 + 6 工单 + 7 主题 + 6 规则。
 */
import type { Feedback, RoutingRule, Ticket, TopicCluster } from './schema';

export const mockFeedbackList: Feedback[] = [
  { id: 'fb-001', agent: '客户沟通助手', user: '王芳', session: '会话 #1024', type: 'thumbs', rating: 5, sentiment: 'positive', status: 'new', priority: 'low', topic: '日程安排', comment: '帮我预约下周三的客户拜访,很快搞定。', submittedAt: '5 分钟前', tags: ['客户'] },
  { id: 'fb-002', agent: '客户沟通助手', user: '李雷', session: '会话 #1025', type: 'rating', rating: 2, sentiment: 'negative', status: 'triaged', priority: 'high', topic: '退款政策', comment: '回复绕了三个圈,最后才说不能退,体验差。', submittedAt: '1 小时前', tags: ['退款', '政策'] },
  { id: 'fb-003', agent: '资料摘要助手', user: '周敏', session: '会话 #1026', type: 'comment', rating: 4, sentiment: 'positive', status: 'in-progress', priority: 'medium', topic: '摘要准确度', comment: '会议纪要摘要很好,但待办列表漏了一项「评审方案」。', submittedAt: '今天 09:14', tags: ['摘要', '待办'] },
  { id: 'fb-004', agent: '资料摘要助手', user: '张伟', session: '会话 #1027', type: 'correction', rating: 3, sentiment: 'neutral', status: 'in-progress', priority: 'medium', topic: '摘要长度', comment: '期望 200 字,实际 380 字,建议默认更严格。', submittedAt: '昨天 17:22', tags: ['摘要', '长度'] },
  { id: 'fb-005', agent: '知识库助理', user: '李婷', session: '会话 #1028', type: 'thumbs', rating: 5, sentiment: 'positive', status: 'resolved', priority: 'low', topic: '引用准确度', comment: '引用了《员工手册 v3》第二章,内容完整。', submittedAt: '昨天 14:00', tags: ['RAG'] },
  { id: 'fb-006', agent: '知识库助理', user: '赵峰', session: '会话 #1029', type: 'comment', rating: 2, sentiment: 'negative', status: 'in-progress', priority: 'high', topic: '回答完整性', comment: '询问年假政策,只回答了一半。', submittedAt: '昨天 11:30', tags: ['年假', '政策'] },
  { id: 'fb-007', agent: '全部智能体', user: '安全测试', session: '会话 #1030', type: 'comment', rating: 1, sentiment: 'negative', status: 'new', priority: 'urgent', topic: 'PII 越权', comment: '越权查询他人订单时未拦截,需要紧急修复。', submittedAt: '今天 10:32', tags: ['PII', '安全'] },
  { id: 'fb-008', agent: '资料摘要助手', user: '陈静', session: '会话 #1031', type: 'rating', rating: 4, sentiment: 'positive', status: 'resolved', priority: 'low', topic: '格式美观', comment: '分段清晰,标题层级明显。', submittedAt: '昨天 09:14', tags: ['摘要'] },
  { id: 'fb-009', agent: '客户沟通助手', user: '王磊', session: '会话 #1032', type: 'correction', rating: 3, sentiment: 'neutral', status: 'triaged', priority: 'medium', topic: '回复语气', comment: '希望语气更亲切,现在太正式。', submittedAt: '2026-09-25', tags: ['语气', '文案'] },
  { id: 'fb-010', agent: '知识库助理', user: '孙琪', session: '会话 #1033', type: 'thumbs', rating: 1, sentiment: 'negative', status: 'wontfix', priority: 'low', topic: '其他', comment: '希望支持更多语种,但目前不在路线图中。', submittedAt: '2026-09-22', tags: ['路线图'] },
  { id: 'fb-011', agent: '客户沟通助手', user: '李娜', session: '会话 #1034', type: 'comment', rating: 5, sentiment: 'positive', status: 'new', priority: 'low', topic: '工具调用', comment: '日程安排非常准确,工具调用清晰。', submittedAt: '今天 11:05', tags: ['工具'] },
  { id: 'fb-012', agent: '全部智能体', user: '匿名', session: '会话 #1035', type: 'comment', rating: 2, sentiment: 'negative', status: 'new', priority: 'urgent', topic: '越权', comment: '在无人授权时尝试查询他人手机号,应该拒绝。', submittedAt: '今天 10:45', tags: ['越权', 'PII'] },
];

export const mockFeedbackTickets: Ticket[] = [
  { id: 'tk-001', title: 'PII 越权反馈', feedbackIds: ['fb-007', 'fb-012'], owner: '安全团队', priority: 'urgent', status: 'in-progress', topic: 'PII 越权', description: '两条越权未拦截反馈,需要紧急修复并补充拦截规则。', createdAt: '今天 10:48', dueAt: '今天 18:00' },
  { id: 'tk-002', title: '退款政策话术优化', feedbackIds: ['fb-002'], owner: '内容团队', priority: 'high', status: 'triaged', topic: '退款政策', description: '客户对回复路径不清晰产生不满,优化首次回复话术与结构。', createdAt: '今天 11:00', dueAt: '2026-09-30' },
  { id: 'tk-003', title: '摘要长度超限', feedbackIds: ['fb-004'], owner: '内容评测', priority: 'medium', status: 'in-progress', topic: '摘要长度', description: '摘要默认长度偏长,需要调整默认截断阈值。', createdAt: '昨天 17:30', dueAt: '本周内' },
  { id: 'tk-004', title: '知识库回答完整性', feedbackIds: ['fb-006'], owner: '知识团队', priority: 'high', status: 'in-progress', topic: '回答完整性', description: '年假政策回答不完整,需要补充最新《员工手册 v3》章节。', createdAt: '昨天 12:00', dueAt: '本周内' },
  { id: 'tk-005', title: '回复语气调整', feedbackIds: ['fb-009'], owner: '内容团队', priority: 'medium', status: 'triaged', topic: '回复语气', description: '调整客户沟通助手的人设语气,更亲切。', createdAt: '2026-09-26', dueAt: '本月内' },
  { id: 'tk-006', title: '待办漏项(已修复)', feedbackIds: ['fb-003'], owner: '内容评测', priority: 'medium', status: 'resolved', topic: '摘要准确度', description: '已更新摘要提示词,补充「待办项」提取。', createdAt: '2026-09-24', dueAt: '已完成' },
];

export const mockFeedbackTopics: TopicCluster[] = [
  { id: 'tp-001', name: 'PII 越权', count: 12, trend: [1, 2, 2, 3, 4, 5, 7, 8, 10, 10, 11, 12], description: '用户反馈智能体在越权场景下未拦截或暴露敏感信息。', sentiment: 'negative', recentComments: ['越权查询他人订单时未拦截', '询问他人手机号未拒绝', '需要补充拦截规则'] },
  { id: 'tp-002', name: '退款政策', count: 7, trend: [0, 0, 1, 1, 2, 2, 3, 4, 5, 6, 6, 7], description: '围绕退款规则、流程与时效的客户反馈。', sentiment: 'negative', recentComments: ['回复绕了三个圈', '体验差'] },
  { id: 'tp-003', name: '摘要准确度', count: 9, trend: [2, 3, 3, 4, 5, 6, 6, 7, 8, 8, 9, 9], description: '摘要遗漏关键信息或提取偏差的反馈。', sentiment: 'neutral', recentComments: ['漏了一项待办', '摘要缺结论'] },
  { id: 'tp-004', name: '日程安排', count: 14, trend: [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14], description: '对日历 / 日程类工具调用的好评与建议。', sentiment: 'positive', recentComments: ['预约很快搞定', '时间识别准确'] },
  { id: 'tp-005', name: '引用准确度', count: 5, trend: [1, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 5], description: '对 RAG 引用准确度与标注位置的反馈。', sentiment: 'positive', recentComments: ['引用完整'] },
  { id: 'tp-006', name: '回复语气', count: 4, trend: [0, 0, 1, 1, 1, 2, 2, 3, 3, 4, 4, 4], description: '对智能体语气 / 人设的反馈。', sentiment: 'neutral', recentComments: ['希望语气更亲切'] },
  { id: 'tp-007', name: '其他', count: 6, trend: [1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6], description: '暂未聚类或不在路线图的反馈。', sentiment: 'neutral', recentComments: ['希望支持更多语种'] },
];

export const mockFeedbackRules: RoutingRule[] = [
  { id: 'rl-001', name: 'PII 越权自动派单', matchTopic: 'PII 越权', matchSentiment: 'all', action: 'create-ticket', target: '安全团队', enabled: true, description: '所有 PII 越权主题反馈自动创建工单并指派给安全团队。' },
  { id: 'rl-002', name: '退款政策高优处理', matchTopic: '退款政策', matchSentiment: 'negative', action: 'create-ticket', target: '内容团队', enabled: true, description: '负面退款政策反馈自动创建高优工单。' },
  { id: 'rl-003', name: '摘要准确度通知', matchTopic: '摘要准确度', matchSentiment: 'all', action: 'notify', target: '内容评测', enabled: true, description: '摘要相关反馈即时通知内容评测负责人。' },
  { id: 'rl-004', name: '正面反馈自动回复', matchTopic: '日程安排', matchSentiment: 'positive', action: 'auto-reply', target: '客户沟通助手', enabled: true, description: '针对日程类正面反馈自动发送感谢回复。' },
  { id: 'rl-005', name: '越权紧急通知', matchTopic: '越权', matchSentiment: 'negative', action: 'notify', target: '安全团队 + 平台值班', enabled: true, description: '越权负面反馈同时通知安全团队和值班。' },
  { id: 'rl-006', name: '其他主题汇总', matchTopic: '其他', matchSentiment: 'all', action: 'notify', target: '产品组', enabled: false, description: '汇总到产品组周报。' },
];