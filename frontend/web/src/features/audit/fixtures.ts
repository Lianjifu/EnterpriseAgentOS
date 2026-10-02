/**
 * AdminToolAudit fixtures — 8 audit entries / 4 risk events / 6 rules / 5 permission scopes.
 */
import type {
  AuditEntry, AuditRule, PermissionScope, RiskEvent,
} from './schema';

export const mockAuditEntries: AuditEntry[] = [
  { id: 'ae-001', category: 'tool', toolName: 'tool.send_email', actor: '客服助手', sessionId: 'ss-2025-09-28-001', severity: 'low', outcome: 'allowed', hasSensitive: false, riskScore: 18, args: '{"to":"user@example.com","subject":"订单进展"}', argsLabel: '邮件参数', scope: 'emails:send', occurredAt: '今天 11:42', retryCount: 0 },
  { id: 'ae-002', category: 'auth', toolName: 'tool.github_auth', actor: '研发助手', sessionId: 'ss-2025-09-28-002', severity: 'critical', outcome: 'denied', hasSensitive: true, riskScore: 92, args: '{"token":"ghp_***","scope":"repo"}', argsLabel: 'Token 校验', scope: 'auth:github', occurredAt: '今天 11:30', retryCount: 2, reason: 'access_token 已过期', starred: true },
  { id: 'ae-003', category: 'mcp', toolName: 'mcp.search_code', actor: '研发助手', sessionId: 'ss-2025-09-28-007', severity: 'high', outcome: 'timeout', hasSensitive: false, riskScore: 71, args: '{"repo":"acme/main","q":"timeout handler"}', argsLabel: '代码检索', scope: 'mcp:github:search', occurredAt: '今天 10:22', retryCount: 0, reason: 'MCP 通道响应超时' },
  { id: 'ae-004', category: 'data', toolName: 'tool.delete_record', actor: '运营分析', sessionId: 'ss-2025-09-28-008', severity: 'critical', outcome: 'pending', hasSensitive: true, riskScore: 88, args: '{"table":"orders","id":"A-2023-0192"}', argsLabel: '删除订单', scope: 'crm:db:delete', occurredAt: '今天 09:42', retryCount: 0, reason: '需人工审批' },
  { id: 'ae-005', category: 'tool', toolName: 'tool.export_pdf', actor: '营销助手', sessionId: 'ss-2025-09-28-005', severity: 'medium', outcome: 'allowed', hasSensitive: false, riskScore: 32, args: '{"template":"weekly","range":"week"}', argsLabel: '导出 PDF', scope: 'reports:export', occurredAt: '今天 10:58', retryCount: 0 },
  { id: 'ae-006', category: 'data', toolName: 'tool.update_user_role', actor: '管理员 张敏', sessionId: 'ss-2025-09-28-009', severity: 'high', outcome: 'allowed', hasSensitive: true, riskScore: 78, args: '{"user":"chenhao","role":"admin","tenant":"acme"}', argsLabel: '更新角色', scope: 'iam:role:write', occurredAt: '昨天 16:18', retryCount: 0 },
  { id: 'ae-007', category: 'mcp', toolName: 'mcp.fin_read', actor: '财务助手', sessionId: 'ss-2025-09-28-010', severity: 'medium', outcome: 'allowed', hasSensitive: true, riskScore: 42, args: '{"query":"yesterday expense > 10k"}', argsLabel: '财务读取', scope: 'fin:read', occurredAt: '昨天 14:52', retryCount: 0 },
  { id: 'ae-008', category: 'auth', toolName: 'tool.api_keys_list', actor: '研发助手', sessionId: 'ss-2025-09-28-011', severity: 'low', outcome: 'allowed', hasSensitive: false, riskScore: 12, args: '{"limit":50}', argsLabel: 'API Key 列表', scope: 'iam:keys:read', occurredAt: '昨天 11:24', retryCount: 0 },
];

export const mockAuditRisks: RiskEvent[] = [
  { id: 'rk-001', title: 'MCP 鉴权失败', severity: 'critical', category: 'auth', sessionId: 'ss-2025-09-28-001', toolName: 'tool.github_auth', occurredAt: '今天 11:30', message: 'GitHub access_token 失效,工具调用被拒绝。', resolved: false, affectedUser: '李雷', ruleId: 'rl-auth-token-expired' },
  { id: 'rk-002', title: '敏感数据删除待审批', severity: 'critical', category: 'data', sessionId: 'ss-2025-09-28-008', toolName: 'tool.delete_record', occurredAt: '今天 09:42', message: '订单删除请求等待人工审批。', resolved: false, affectedUser: '王芳', ruleId: 'rl-delete-sensitive' },
  { id: 'rk-003', title: 'MCP 通道超时', severity: 'high', category: 'mcp', sessionId: 'ss-2025-09-28-007', toolName: 'mcp.search_code', occurredAt: '今天 10:22', message: 'GitHub MCP 通道响应超时,链路中断。', resolved: false, affectedUser: '陈昊', ruleId: 'rl-mcp-timeout' },
  { id: 'rk-004', title: '角色提升告警', severity: 'high', category: 'data', sessionId: 'ss-2025-09-28-009', toolName: 'tool.update_user_role', occurredAt: '昨天 16:18', message: '管理员将普通用户提升为 admin。', resolved: true, affectedUser: '张敏', ruleId: 'rl-privilege-escalation' },
];

export const mockAuditRules: AuditRule[] = [
  { id: 'rl-auth-token-expired', name: 'Token 过期阻断', category: 'auth', condition: 'auth.token.expires < now', action: 'block', severity: 'critical', enabled: true, hitCount: 14, description: '当鉴权 token 已过期时立即阻断并通知管理员。' },
  { id: 'rl-delete-sensitive', name: '敏感数据删除需审批', category: 'data', condition: 'tool.delete && table ∈ {orders,contracts}', action: 'confirm', severity: 'critical', enabled: true, hitCount: 6, description: '对核心业务表的删除必须经过二次确认。' },
  { id: 'rl-mcp-timeout', name: 'MCP 超时降级', category: 'mcp', condition: 'mcp.latency > 5000ms', action: 'alert', severity: 'high', enabled: true, hitCount: 28, description: '当 MCP 调用延迟超过 5 秒时触发告警。' },
  { id: 'rl-privilege-escalation', name: '提权即时告警', category: 'data', condition: 'role.change target=admin', action: 'alert', severity: 'high', enabled: true, hitCount: 3, description: '用户角色升级到 admin 时即时通知安全团队。' },
  { id: 'rl-tool-mass-iteration', name: '工具循环调用熔断', category: 'tool', condition: 'tool.repeat_count > 5 within 60s', action: 'block', severity: 'medium', enabled: true, hitCount: 9, description: '60s 内同一工具被调用超过 5 次自动熔断。' },
  { id: 'rl-key-read', name: 'API Key 读取审计', category: 'auth', condition: 'tool.api_keys.read', action: 'log', severity: 'low', enabled: true, hitCount: 81, description: '读取 API Key 时记录调用者与范围。' },
];

export const mockPermissionScopes: PermissionScope[] = [
  { id: 'ps-001', role: '客服助手', userCount: 24, scopes: ['emails:send', 'crm:read', 'kb:read'], lastReview: '2026-08-12', reviewer: '张敏' },
  { id: 'ps-002', role: '研发助手', userCount: 36, scopes: ['github:read', 'github:write', 'iam:keys:read'], lastReview: '2026-09-04', reviewer: '韩雪' },
  { id: 'ps-003', role: '运营分析', userCount: 12, scopes: ['crm:read', 'reports:export'], lastReview: '2026-07-28', reviewer: '李雷' },
  { id: 'ps-004', role: '财务助手', userCount: 6, scopes: ['fin:read', 'fin:export'], lastReview: '2026-09-10', reviewer: '王芳' },
  { id: 'ps-005', role: '营销助手', userCount: 9, scopes: ['emails:send', 'reports:export'], lastReview: '2026-08-30', reviewer: '陈昊' },
];