/**
 * 用户侧 fixtures — 与原 MySkills.tsx 内联数据一一对应,
 * dev:demo 模式下由 mock handler 直接返回。
 */
import type { Capability } from '@/api/user/skills/schema';

export const mockCapabilities: Capability[] = [
  { id: 'skill-summary', name: '资料摘要助手', type: 'Skill', description: '把长文档提炼成结构清晰的重点、结论和行动项。', owner: '知识工作台', useCase: '阅读资料、准备会议、整理研究结论', input: '一份文档或一段文字', output: '摘要、重点、行动项', risk: 'low', status: 'available', tags: ['整理', '写作'], lastUsed: '今天使用' },
  { id: 'skill-followup', name: '客户跟进建议', type: 'Skill', description: '根据客户沟通记录，生成下一步跟进建议和回复要点。', owner: '销售支持团队', useCase: '客户沟通、商机跟进、服务响应', input: '沟通记录或客户问题', output: '跟进建议和回复草稿', risk: 'needsConfirm', status: 'available', tags: ['客户', '销售'], lastUsed: '昨天使用' },
  { id: 'skill-meeting', name: '会议纪要整理', type: 'Skill', description: '提取会议中的决定、负责人和待办时间，生成可追踪纪要。', owner: '运营支持团队', useCase: '会议复盘、项目协作、任务分派', input: '会议记录或转写文本', output: '会议纪要和待办列表', risk: 'low', status: 'available', tags: ['会议', '协作'], lastUsed: '上周使用' },
  { id: 'tool-calendar', name: '日历安排工具', type: 'Tool', description: '在确认后帮助查找空闲时间并创建日程安排。', owner: '平台工具', useCase: '约会、排期、提醒设置', input: '参与人、时间范围和主题', output: '候选时段或日程草稿', risk: 'needsConfirm', status: 'available', tags: ['日历', '排期'], lastUsed: '从未使用' },
  { id: 'tool-spreadsheet', name: '表格分析工具', type: 'Tool', description: '读取授权的表格内容，帮助完成统计、筛选和摘要。', owner: '平台工具', useCase: '数据分析、报表整理、趋势查看', input: '已授权的表格文件', output: '分析结果和可读摘要', risk: 'needsConfirm', status: 'available', tags: ['表格', '分析'], lastUsed: '本周使用' },
  { id: 'mcp-crm', name: '客户系统连接', type: 'MCP', description: '通过受控连接查询客户资料和服务记录，不直接修改数据。', owner: '客户成功团队', useCase: '查询客户背景、服务历史和跟进状态', input: '客户名称或客户编号', output: '授权范围内的客户信息', risk: 'needsConfirm', status: 'available', tags: ['MCP', '客户'], lastUsed: '昨天使用' },
  { id: 'mcp-drive', name: '团队云盘连接', type: 'MCP', description: '在授权范围内查找团队共享资料和最近更新内容。', owner: '平台连接', useCase: '查找共享文件、定位项目资料', input: '关键词或文件名', output: '匹配的文件与来源信息', risk: 'low', status: 'unavailable', tags: ['MCP', '文件'], lastUsed: '维护中' },
];

export const mockFavorites: string[] = ['skill-summary', 'mcp-crm'];

export const mockRecentUse = [
  { id: 'r1', name: '资料摘要助手', type: 'Skill' as const, time: '今天 · 10:20' },
  { id: 'r2', name: '客户系统连接', type: 'MCP' as const, time: '昨天 · 16:40' },
];