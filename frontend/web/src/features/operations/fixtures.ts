/**
 * AdminOperations fixtures — 8 会话 / 7 span / 4 异常 / 6 kindStats。
 */
import type { Incident, KindStat, Span, Session } from './schema';

export const mockSpans: Span[] = [
  { id: 'sp-001', parentId: null, kind: 'orchestration', name: 'agent.run', durationMs: 4200, startOffsetMs: 0, status: 'ok', detail: '客服助手会话编排' },
  { id: 'sp-002', parentId: 'sp-001', kind: 'retrieval', name: 'kb.search', durationMs: 180, startOffsetMs: 30, status: 'ok', detail: '检索企业知识库' },
  { id: 'sp-003', parentId: 'sp-001', kind: 'llm', name: 'llm.chat', durationMs: 1800, startOffsetMs: 240, status: 'ok', tokens: 1280, cost: 0.04, detail: '云知-旗舰 v3 · 中文回复生成' },
  { id: 'sp-004', parentId: 'sp-003', kind: 'memory', name: 'memory.read', durationMs: 60, startOffsetMs: 260, status: 'ok', detail: '读取用户偏好记忆' },
  { id: 'sp-005', parentId: 'sp-003', kind: 'tool', name: 'tool.search_crm', durationMs: 320, startOffsetMs: 720, status: 'ok', detail: '查询客户订单' },
  { id: 'sp-006', parentId: 'sp-001', kind: 'llm', name: 'llm.chat', durationMs: 1500, startOffsetMs: 2100, status: 'ok', tokens: 980, cost: 0.03, detail: '总结回复' },
  { id: 'sp-007', parentId: 'sp-001', kind: 'tool', name: 'tool.send_email', durationMs: 280, startOffsetMs: 3700, status: 'ok', detail: '发送邮件通知' },
];

export const mockSessions: Session[] = [
  { id: 'ss-2025-09-28-001', user: '张敏', agentName: '客服助手', channel: 'IM', status: 'success', totalDurationMs: 4200, startAt: '今天 11:42', spanCount: 7, totalTokens: 2260, totalCost: 0.07, hasError: false, summary: '用户咨询订单进度,助手检索知识库并查询 CRM 后回复用户。', starred: true },
  { id: 'ss-2025-09-28-002', user: '李雷', agentName: '研发助手', channel: 'IDE 插件', status: 'failed', totalDurationMs: 1200, startAt: '今天 11:30', spanCount: 5, totalTokens: 720, totalCost: 0.02, hasError: true, summary: '调用 GitHub MCP 时鉴权失败,助手中断。', starred: false },
  { id: 'ss-2025-09-28-003', user: '王芳', agentName: '运营分析', channel: 'Web', status: 'running', totalDurationMs: 820, startAt: '今天 11:24', spanCount: 4, totalTokens: 480, totalCost: 0.02, hasError: false, summary: '正在查询昨日运营数据并生成摘要。', starred: false },
  { id: 'ss-2025-09-28-004', user: '刘琪', agentName: '客服助手', channel: 'IM', status: 'partial', totalDurationMs: 3800, startAt: '今天 11:18', spanCount: 9, totalTokens: 3120, totalCost: 0.12, hasError: true, summary: '邮件发送失败,其他步骤成功完成。', starred: false },
  { id: 'ss-2025-09-28-005', user: '周宁', agentName: '营销助手', channel: 'Web', status: 'success', totalDurationMs: 2400, startAt: '今天 10:58', spanCount: 6, totalTokens: 1580, totalCost: 0.05, hasError: false, summary: '生成本周营销邮件草稿。', starred: true },
  { id: 'ss-2025-09-28-006', user: '韩雪', agentName: '合同审查', channel: 'Web', status: 'success', totalDurationMs: 3200, startAt: '今天 10:42', spanCount: 8, totalTokens: 2240, totalCost: 0.08, hasError: false, summary: '审查合同 12 条款,识别 2 处风险。', starred: false },
  { id: 'ss-2025-09-28-007', user: '陈昊', agentName: '研发助手', channel: 'IDE 插件', status: 'failed', totalDurationMs: 920, startAt: '今天 10:22', spanCount: 3, totalTokens: 320, totalCost: 0.01, hasError: true, summary: '工具调用超时,链路中断。', starred: false },
  { id: 'ss-2025-09-28-008', user: '张敏', agentName: '客户画像', channel: 'IM', status: 'success', totalDurationMs: 2100, startAt: '今天 09:58', spanCount: 5, totalTokens: 1380, totalCost: 0.04, hasError: false, summary: '生成客户画像摘要。', starred: false },
];

export const mockIncidents: Incident[] = [
  { id: 'in-001', title: 'GitHub MCP 鉴权失败', severity: 'critical', sessionId: 'ss-2025-09-28-002', spanId: 'tool.github', occurredAt: '今天 11:30', message: 'access_token 已过期,工具调用被拒绝。', resolved: false, affectedUser: '李雷', retryCount: 2 },
  { id: 'in-002', title: '邮件发送超时', severity: 'warning', sessionId: 'ss-2025-09-28-004', spanId: 'tool.send_email', occurredAt: '今天 11:18', message: '邮件通道响应超时 5 秒,自动重试 3 次后跳过。', resolved: false, affectedUser: '刘琪', retryCount: 3 },
  { id: 'in-003', title: '工具调用超时', severity: 'error', sessionId: 'ss-2025-09-28-007', spanId: 'tool.search_code', occurredAt: '今天 10:22', message: '工具响应超时,链路中断。', resolved: false, affectedUser: '陈昊', retryCount: 0 },
  { id: 'in-004', title: 'LLM 输出截断', severity: 'info', sessionId: 'ss-2025-09-28-006', spanId: 'llm.chat', occurredAt: '今天 10:42', message: '输出长度超过 4k,自动截断并追加提示。', resolved: true, affectedUser: '韩雪', retryCount: 0 },
];

export const mockKindStats: KindStat[] = [
  { kind: 'llm', count: 2 },
  { kind: 'tool', count: 2 },
  { kind: 'mcp', count: 0 },
  { kind: 'retrieval', count: 1 },
  { kind: 'memory', count: 1 },
  { kind: 'orchestration', count: 1 },
];