/**
 * 管理侧「知识管理」fixtures — 与原 AdminKnowledge.tsx 内联 INITIAL_* 对应。
 * dev:demo 通过 admin-knowledge-mock-handler.ts 返回;测试通过 seedPageQueryData 注入。
 */
import type { Kb, Doc, Source, Task, EvalCase } from '@/api/admin/knowledge/schema';

export const mockKbs: Kb[] = [
  { id: 'kb-prod', name: '产品手册 v3', description: '对外产品说明、功能边界与 FAQ 统一参考。', owner: '产品团队', scope: '公开', status: 'indexed', docCount: 286, vectorCount: 18420, updatedAt: '今天 14:32', tags: ['产品', '客户'], tone: 'brand', evalHitRate: 0.94 },
  { id: 'kb-hr', name: '员工手册', description: '入职、假期、培训、绩效等人事制度。', owner: '人力资源', scope: '部门', status: 'indexed', docCount: 124, vectorCount: 8120, updatedAt: '昨天 18:10', tags: ['人事', '制度'], tone: 'success', evalHitRate: 0.91 },
  { id: 'kb-sec', name: '信息安全规范', description: '数据分级、访问边界、日常安全操作。', owner: '安全团队', scope: '部门', status: 'indexing', docCount: 24, vectorCount: 1480, updatedAt: '2 小时前', tags: ['安全', '合规'], tone: 'warn', evalHitRate: 0.88 },
  { id: 'kb-faq', name: '客服 FAQ', description: '常见客户问题与标准答复。', owner: '客服一组', scope: '部门', status: 'indexed', docCount: 412, vectorCount: 26120, updatedAt: '今天 09:18', tags: ['客服', 'FAQ'], tone: 'info', evalHitRate: 0.93 },
  { id: 'kb-legal', name: '合同模板库', description: '销售合同、保密协议等模板与条款库。', owner: '法务团队', scope: '部门', status: 'paused', docCount: 38, vectorCount: 2120, updatedAt: '上周', tags: ['法务', '合同'], tone: 'danger', evalHitRate: 0.86 },
  { id: 'kb-finance', name: '财务报销指南', description: '差旅、采购、报销流程与表单。', owner: '财务团队', scope: '部门', status: 'indexed', docCount: 56, vectorCount: 3280, updatedAt: '本周', tags: ['财务', '流程'], tone: 'purple', evalHitRate: 0.90 },
  { id: 'kb-meet', name: '会议纪要库', description: '部门周会、复盘与决策记录。', owner: '运营团队', scope: '部门', status: 'indexed', docCount: 184, vectorCount: 11400, updatedAt: '今天 16:45', tags: ['协作', '纪要'], tone: 'info', evalHitRate: 0.85 },
  { id: 'kb-launch', name: '发布协作清单', description: '产品发布、灰度、上线协同步骤。', owner: '产品团队', scope: '部门', status: 'failed', docCount: 12, vectorCount: 740, updatedAt: '昨天', tags: ['发布', '协作'], tone: 'danger', evalHitRate: 0.72 },
  { id: 'kb-research', name: '行业研究报告', description: '季度行业趋势与竞品分析。', owner: '战略团队', scope: '部门', status: 'indexed', docCount: 32, vectorCount: 1860, updatedAt: '本周', tags: ['研究', '市场'], tone: 'purple', evalHitRate: 0.89 },
  { id: 'kb-ops', name: '运维手册', description: '服务部署、监控告警、应急响应。', owner: '运维团队', scope: '部门', status: 'indexing', docCount: 64, vectorCount: 3940, updatedAt: '今天', tags: ['运维', '应急'], tone: 'warn', evalHitRate: 0.87 },
  { id: 'kb-tpl', name: '回复话术模板', description: '客服与销售高频回复模板。', owner: '客服一组', scope: '个人', status: 'indexed', docCount: 28, vectorCount: 1640, updatedAt: '本周', tags: ['话术'], tone: 'info', evalHitRate: 0.92 },
  { id: 'kb-glossary', name: '业务术语表', description: '业务名词、产品代号与缩写。', owner: '产品团队', scope: '公开', status: 'indexed', docCount: 24, vectorCount: 1480, updatedAt: '上周', tags: ['术语'], tone: 'brand', evalHitRate: 0.95 },
];

export const mockDocs: Doc[] = [
  { id: 'doc-001', name: '产品手册 v3.pdf', type: 'manual', kbId: 'kb-prod', sourceId: 'src-1', status: 'parsed', sizeKb: 4820, chunks: 286, updatedAt: '今天 14:32', citations: 1240 },
  { id: 'doc-002', name: '员工手册 2026.docx', type: 'policy', kbId: 'kb-hr', sourceId: 'src-1', status: 'parsed', sizeKb: 1280, chunks: 124, updatedAt: '昨天 18:10', citations: 412 },
  { id: 'doc-003', name: '信息安全等级保护指南.pdf', type: 'policy', kbId: 'kb-sec', sourceId: 'src-8', status: 'parsing', sizeKb: 1840, chunks: 24, updatedAt: '2 小时前', citations: 86 },
  { id: 'doc-004', name: '客服 FAQ Top100.csv', type: 'faq', kbId: 'kb-faq', sourceId: 'src-3', status: 'parsed', sizeKb: 412, chunks: 412, updatedAt: '今天 09:18', citations: 2840 },
  { id: 'doc-005', name: '销售合同模板 v2.docx', type: 'contract', kbId: 'kb-legal', sourceId: 'src-5', status: 'parsed', sizeKb: 184, chunks: 38, updatedAt: '上周', citations: 142 },
  { id: 'doc-006', name: '差旅报销指南.md', type: 'policy', kbId: 'kb-finance', sourceId: 'src-6', status: 'parsed', sizeKb: 96, chunks: 56, updatedAt: '本周', citations: 318 },
  { id: 'doc-007', name: 'Q3 周会纪要.md', type: 'meeting', kbId: 'kb-meet', sourceId: 'src-2', status: 'parsed', sizeKb: 28, chunks: 18, updatedAt: '今天 16:45', citations: 24 },
  { id: 'doc-008', name: 'Q4 发布会清单.md', type: 'meeting', kbId: 'kb-launch', sourceId: 'src-2', status: 'failed', sizeKb: 12, chunks: 0, updatedAt: '昨天', citations: 0 },
  { id: 'doc-009', name: '行业研究 - SaaS.pdf', type: 'manual', kbId: 'kb-research', sourceId: 'src-3', status: 'parsed', sizeKb: 3120, chunks: 32, updatedAt: '本周', citations: 64 },
  { id: 'doc-010', name: '应急响应 runbook.md', type: 'policy', kbId: 'kb-ops', sourceId: 'src-8', status: 'parsing', sizeKb: 184, chunks: 28, updatedAt: '今天', citations: 48 },
  { id: 'doc-011', name: '常见拒绝话术.md', type: 'faq', kbId: 'kb-tpl', sourceId: 'src-7', status: 'parsed', sizeKb: 18, chunks: 28, updatedAt: '本周', citations: 96 },
  { id: 'doc-012', name: '业务术语表 v2.csv', type: 'faq', kbId: 'kb-glossary', sourceId: 'src-4', status: 'parsed', sizeKb: 24, chunks: 24, updatedAt: '上周', citations: 184 },
];

export const mockSources: Source[] = [
  { id: 'src-1', name: '产品 Wiki', type: 'notion', status: 'online', lastSync: '今天 14:00', schedule: '每 4 小时', itemCount: 286, lastError: undefined },
  { id: 'src-2', name: '客户成功频道', type: 'slack', status: 'online', lastSync: '今天 13:30', schedule: '每 1 小时', itemCount: 1840, lastError: undefined },
  { id: 'src-3', name: '官网帮助中心', type: 'web', status: 'syncing', lastSync: '正在同步', schedule: '每天 02:00', itemCount: 312, lastError: undefined },
  { id: 'src-4', name: '订单库 (prod)', type: 'postgres', status: 'online', lastSync: '今天 15:12', schedule: '实时', itemCount: 18420, lastError: undefined },
  { id: 'src-5', name: '历史合同扫描件', type: 's3', status: 'error', lastSync: '昨天', schedule: '手动', itemCount: 0, lastError: 'S3 凭据过期,请更新 IAM 角色。' },
  { id: 'src-6', name: '工单系统 API', type: 'api', status: 'online', lastSync: '今天 15:08', schedule: '每 30 分钟', itemCount: 8120, lastError: undefined },
  { id: 'src-7', name: '本地共享盘 · 法务', type: 'folder', status: 'paused', lastSync: '3 天前', schedule: '每天 18:00', itemCount: 124, lastError: undefined },
  { id: 'src-8', name: 'Confluence · 研发', type: 'confluence', status: 'online', lastSync: '今天 11:20', schedule: '每 6 小时', itemCount: 412, lastError: undefined },
];

export const mockTasks: Task[] = [
  { id: 'task-1', name: '产品手册 v3 全文索引', kind: 'index', kbId: 'kb-prod', status: 'success', progress: 100, items: 286, startedAt: '今天 14:00', duration: '32 分钟' },
  { id: 'task-2', name: 'FAQ Top100 增量索引', kind: 'reindex', kbId: 'kb-faq', status: 'running', progress: 68, items: 412, startedAt: '今天 15:20', duration: '进行中' },
  { id: 'task-3', name: '员工手册 2026 重建', kind: 'rebuild', kbId: 'kb-hr', status: 'failed', progress: 42, items: 124, startedAt: '昨天', duration: '失败 @ 第 52 项' },
  { id: 'task-4', name: '会议纪要导入', kind: 'index', kbId: 'kb-meet', status: 'success', progress: 100, items: 18, startedAt: '今天 16:00', duration: '4 分钟' },
  { id: 'task-5', name: '应急 runbook 索引', kind: 'index', kbId: 'kb-ops', status: 'running', progress: 28, items: 28, startedAt: '今天 15:48', duration: '进行中' },
  { id: 'task-6', name: '合同模板全量重建', kind: 'rebuild', kbId: 'kb-legal', status: 'paused', progress: 56, items: 38, startedAt: '上周', duration: '已暂停' },
  { id: 'task-7', name: '行业研究同步', kind: 'reindex', kbId: 'kb-research', status: 'success', progress: 100, items: 32, startedAt: '本周', duration: '18 分钟' },
  { id: 'task-8', name: '话术模板清洗', kind: 'reindex', kbId: 'kb-tpl', status: 'success', progress: 100, items: 28, startedAt: '本周', duration: '6 分钟' },
  { id: 'task-9', name: '安全规范 v3 重建', kind: 'rebuild', kbId: 'kb-sec', status: 'running', progress: 84, items: 24, startedAt: '今天 13:10', duration: '进行中' },
  { id: 'task-10', name: '历史合同 OCR', kind: 'index', kbId: 'kb-legal', status: 'failed', progress: 12, items: 184, startedAt: '昨天', duration: '失败 · 凭据过期' },
  { id: 'task-11', name: '回复话术增量', kind: 'reindex', kbId: 'kb-tpl', status: 'pending', progress: 0, items: 28, startedAt: '排队', duration: '—' },
  { id: 'task-12', name: '术语表同步', kind: 'reindex', kbId: 'kb-glossary', status: 'success', progress: 100, items: 24, startedAt: '上周', duration: '2 分钟' },
  { id: 'task-13', name: '应急响应案例', kind: 'index', kbId: 'kb-ops', status: 'pending', progress: 0, items: 36, startedAt: '排队', duration: '—' },
  { id: 'task-14', name: '客服录音转写', kind: 'index', kbId: 'kb-faq', status: 'failed', progress: 23, items: 312, startedAt: '昨天', duration: '失败 · 队列满' },
];

export const mockEvalCases: EvalCase[] = [
  { id: 'e1', name: '退款政策查询', query: '客户申请退款,7 天内的订单怎么办?', expectedKb: 'kb-faq', actualKb: 'kb-faq', status: 'pass', latency: 0.84, mrr: 0.92 },
  { id: 'e2', name: '差旅报销', query: '出差 5 天的住宿费上限是多少?', expectedKb: 'kb-finance', actualKb: 'kb-finance', status: 'pass', latency: 0.72, mrr: 0.88 },
  { id: 'e3', name: '产品功能 FAQ', query: '智能体支持自定义知识库吗?', expectedKb: 'kb-prod', actualKb: 'kb-prod', status: 'pass', latency: 0.96, mrr: 0.94 },
  { id: 'e4', name: '入职流程', query: '新员工第一天要做什么?', expectedKb: 'kb-hr', actualKb: 'kb-hr', status: 'pass', latency: 0.68, mrr: 0.86 },
  { id: 'e5', name: '安全合规', query: '出差可以携带敏感数据吗?', expectedKb: 'kb-sec', actualKb: 'kb-sec', status: 'pass', latency: 0.92, mrr: 0.90 },
  { id: 'e6', name: '合同模板', query: 'NDA 模板在哪里?', expectedKb: 'kb-legal', actualKb: 'kb-legal', status: 'pass', latency: 0.81, mrr: 0.88 },
  { id: 'e7', name: '行业研究', query: 'SaaS 市场规模数据?', expectedKb: 'kb-research', actualKb: 'kb-prod', status: 'fail', latency: 1.12, mrr: 0.62 },
  { id: 'e8', name: '应急响应', query: '服务宕机怎么上报?', expectedKb: 'kb-ops', actualKb: 'kb-ops', status: 'pass', latency: 0.74, mrr: 0.84 },
  { id: 'e9', name: '话术引用', query: '客户抱怨价格怎么回复?', expectedKb: 'kb-tpl', actualKb: 'kb-tpl', status: 'pass', latency: 0.66, mrr: 0.90 },
  { id: 'e10', name: '术语解释', query: 'EOS 是什么的缩写?', expectedKb: 'kb-glossary', actualKb: 'kb-glossary', status: 'pass', latency: 0.54, mrr: 0.96 },
  { id: 'e11', name: '会议纪要查询', query: '上次发布复盘的结论是什么?', expectedKb: 'kb-meet', actualKb: 'kb-meet', status: 'pass', latency: 0.88, mrr: 0.86 },
  { id: 'e12', name: '灰度规则', query: '新智能体灰度规则怎么配置?', expectedKb: 'kb-launch', actualKb: 'kb-meet', status: 'fail', latency: 1.04, mrr: 0.58 },
  { id: 'e13', name: '废弃案例', query: 'Q&A 已取消', expectedKb: 'kb-faq', actualKb: 'kb-faq', status: 'skipped', latency: 0, mrr: 0 },
  { id: 'e14', name: '性能瓶颈', query: '检索延迟高的常见原因?', expectedKb: 'kb-ops', actualKb: 'kb-ops', status: 'pass', latency: 0.82, mrr: 0.88 },
];