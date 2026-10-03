/**
 * 用户侧「我的知识」fixtures — 与原 MyKnowledge.tsx 内联数据一一对应。
 * dev:demo 通过本地 mock wrap 返回;测试通过 seedPageQueryData 注入。
 */
import type { KnowledgeResource } from './schema';

export const mockKnowledgeResources: KnowledgeResource[] = [
  { id: 'handbook', title: '员工入职与成长手册', kind: '制度', description: '从入职准备到试用期反馈,把常用规则放在一起。', owner: '人力资源团队', updated: '今天更新', tags: ['入职', '人事'], excerpt: '入职前完成账号开通与资料确认。第一周熟悉团队协作方式,并与直属负责人约定试用期目标。' },
  { id: 'product', title: '产品资料与常见问题', kind: '项目', description: '对外介绍、功能边界和客户常问问题的统一参考。', owner: '产品团队', updated: '昨天更新', tags: ['产品', '客户'], excerpt: '对外沟通时优先使用已发布的产品说明。涉及未发布能力,请先与产品负责人确认。' },
  { id: 'expense', title: '差旅与报销指南', kind: '指南', description: '出行申请、费用标准和提交凭证的完整步骤。', owner: '财务团队', updated: '本周更新', tags: ['财务', '行政'], excerpt: '出行前提交申请,完成行程后按费用类型上传凭证。特殊费用需在备注中说明原因。' },
  { id: 'security', title: '信息安全行为规范', kind: '制度', description: '数据分级、访问边界和日常安全操作建议。', owner: '安全团队', updated: '本周更新', tags: ['安全', '合规'], excerpt: '仅在工作需要范围内访问资料。分享含敏感信息的内容前,确认接收对象及授权范围。' },
  { id: 'launch', title: '新功能发布协作清单', kind: '项目', description: '产品、市场和客户团队的发布协同步骤。', owner: '产品团队', updated: '上周更新', tags: ['发布', '协作'], excerpt: '发布前完成体验走查、对外素材确认和支持团队培训。发布后记录问题及用户反馈。' },
  { id: 'meeting', title: '高效会议与纪要模板', kind: '指南', description: '会前准备、议题记录及会后行动项的模板。', owner: '运营团队', updated: '上周更新', tags: ['协作', '模板'], excerpt: '每次会议明确目标、负责人和预期结论;会后将行动项写入共享记录并标注完成时间。' },
];

export const mockKnowledgeFavorites: string[] = ['handbook', 'product'];