/**
 * 模板卡片 + 三类模板数据 — 从原 AdminSkills.tsx 抽出。
 * SchemaField 类型保持与 schema.ts 完全一致。
 */
import { Clock, Database, FileCode, FileSpreadsheet, FileText, Globe, MessageSquare, Webhook, Plus, type LucideIcon } from 'lucide-react';
import type { TemplateSeed } from '../schema';
import { RISK_BADGE } from './constants';

const ICON_MAP: Record<TemplateSeed['iconKey'], LucideIcon> = {
  FileText, MessageSquare, FileSpreadsheet, Clock, Database, Webhook, Globe,
};

// 原 AdminSkills.tsx 用 icon: typeof Sparkles;这里 schema 改成 iconKey 序列化以便跨包传递。
// 模板数据来自 mockSkillTemplates (src/mock/admin/skills.fixtures.ts),仅在此重新声明 iconKey 引用。

export const SKILL_TEMPLATES: TemplateSeed[] = [
  { id: 'tpl-doc-summary', name: '文档摘要', description: '提炼长文档重点、结论与行动项', type: 'Skill', owner: '知识工作台', iconKey: 'FileText', risk: 'low', needConfirm: false, tags: ['整理', '写作'], inputExample: [{ name: 'document', type: 'string', required: true, description: '文档全文' }], outputExample: [{ name: 'summary', type: 'string', required: true, description: '摘要' }, { name: 'actions', type: 'array', required: false, description: '行动项' }] },
  { id: 'tpl-meeting-note', name: '会议纪要', description: '提取决定、负责人与待办时间', type: 'Skill', owner: '运营支持团队', iconKey: 'MessageSquare', risk: 'low', needConfirm: false, tags: ['会议'], inputExample: [{ name: 'transcript', type: 'string', required: true, description: '会议转写' }], outputExample: [{ name: 'todos', type: 'array', required: true, description: '待办列表' }] },
  { id: 'tpl-report-write', name: '报告撰写', description: '根据数据点生成结构化报告', type: 'Skill', owner: '运营支持团队', iconKey: 'FileSpreadsheet', risk: 'low', needConfirm: false, tags: ['报告'], inputExample: [{ name: 'data', type: 'object', required: true, description: '数据点' }], outputExample: [{ name: 'report', type: 'string', required: true, description: '报告' }] },
  { id: 'tpl-followup', name: '跟进建议', description: '基于沟通记录生成下一步建议', type: 'Skill', owner: '销售支持团队', iconKey: 'MessageSquare', risk: 'medium', needConfirm: true, tags: ['客户'], inputExample: [{ name: 'context', type: 'string', required: true, description: '沟通记录' }], outputExample: [{ name: 'reply', type: 'string', required: true, description: '回复草稿' }] },
];

export const TOOL_TEMPLATES: TemplateSeed[] = [
  { id: 'tpl-tool-calendar', name: '日历操作', description: '查找空闲时间,创建日程安排', type: 'Tool', owner: '平台工具', iconKey: 'Clock', risk: 'medium', needConfirm: true, tags: ['日历'], inputExample: [{ name: 'attendees', type: 'array', required: true, description: '参与人' }, { name: 'duration', type: 'number', required: true, description: '时长(分钟)' }], outputExample: [{ name: 'slot', type: 'object', required: true, description: '候选时段' }] },
  { id: 'tpl-tool-spreadsheet', name: '表格分析', description: '读取授权表格,生成统计与摘要', type: 'Tool', owner: '平台工具', iconKey: 'FileSpreadsheet', risk: 'medium', needConfirm: true, tags: ['表格'], inputExample: [{ name: 'fileId', type: 'string', required: true, description: '文件 ID' }], outputExample: [{ name: 'summary', type: 'string', required: true, description: '摘要' }] },
  { id: 'tpl-tool-mailer', name: '邮件发送', description: '在授权邮箱内发送邮件', type: 'Tool', owner: '平台工具', iconKey: 'MessageSquare', risk: 'high', needConfirm: true, tags: ['邮件'], inputExample: [{ name: 'to', type: 'array', required: true, description: '收件人' }, { name: 'subject', type: 'string', required: true, description: '主题' }], outputExample: [{ name: 'messageId', type: 'string', required: true, description: '消息 ID' }] },
  { id: 'tpl-tool-database', name: '数据库查询', description: '对授权数据源执行只读 SQL', type: 'Tool', owner: '平台工具', iconKey: 'Database', risk: 'high', needConfirm: true, tags: ['数据'], inputExample: [{ name: 'sql', type: 'string', required: true, description: 'SQL 语句' }], outputExample: [{ name: 'rows', type: 'array', required: true, description: '查询结果' }] },
  { id: 'tpl-tool-webhook', name: 'Webhook 触发', description: '调用外部 HTTP 接口', type: 'Tool', owner: '平台工具', iconKey: 'Webhook', risk: 'high', needConfirm: true, tags: ['集成'], inputExample: [{ name: 'url', type: 'string', required: true, description: '回调地址' }, { name: 'payload', type: 'object', required: true, description: '请求体' }], outputExample: [{ name: 'status', type: 'number', required: true, description: 'HTTP 状态码' }] },
];

export const MCP_TEMPLATES: TemplateSeed[] = [
  { id: 'tpl-mcp-crm', name: '客户系统', description: '查询客户资料与服务记录,只读', type: 'MCP', owner: '客户成功团队', iconKey: 'Database', risk: 'medium', needConfirm: true, tags: ['客户'], inputExample: [{ name: 'query', type: 'string', required: true, description: '客户编号' }], outputExample: [{ name: 'records', type: 'array', required: true, description: '客户记录' }] },
  { id: 'tpl-mcp-drive', name: '团队云盘', description: '在授权范围内查找共享资料', type: 'MCP', owner: '平台连接', iconKey: 'Database', risk: 'low', needConfirm: false, tags: ['文件'], inputExample: [{ name: 'keyword', type: 'string', required: true, description: '关键词' }], outputExample: [{ name: 'files', type: 'array', required: true, description: '匹配文件' }] },
  { id: 'tpl-mcp-github', name: 'GitHub', description: '查询仓库、Issue 与 PR', type: 'MCP', owner: '平台连接', iconKey: 'Globe', risk: 'medium', needConfirm: true, tags: ['代码'], inputExample: [{ name: 'repo', type: 'string', required: true, description: '仓库名' }], outputExample: [{ name: 'issues', type: 'array', required: true, description: 'Issue 列表' }] },
  { id: 'tpl-mcp-finance', name: '财务系统', description: '查询预算与报销,只读', type: 'MCP', owner: '财务支持', iconKey: 'Database', risk: 'high', needConfirm: true, tags: ['财务'], inputExample: [{ name: 'period', type: 'string', required: true, description: '期间' }], outputExample: [{ name: 'budget', type: 'object', required: true, description: '预算数据' }] },
];

export function TemplateCard({
  template, onAdd,
}: {
  template: TemplateSeed;
  onAdd: (template: TemplateSeed) => void;
}) {
  const Icon = ICON_MAP[template.iconKey];
  const riskBadge = RISK_BADGE[template.risk];
  const RiskIcon = riskBadge.icon;
  return (
    <article className="flex flex-col rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-5 transition hover:border-[var(--brand)]">
      <header className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-violet-50 text-violet-600">
            <Icon className="h-5 w-5" />
          </span>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">技能 · {template.type}</p>
            <h4 className="text-sm font-semibold">{template.name}</h4>
          </div>
        </div>
        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${riskBadge.className}`}>
          <RiskIcon className="h-3 w-3" />{riskBadge.label}
        </span>
      </header>
      <p className="mt-4 text-xs leading-6 text-[var(--text-muted)]">{template.description}</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">输入</p>
          <ul className="mt-1.5 space-y-1 text-[11px]">
            {template.inputExample.slice(0, 2).map((f) => (
              <li key={f.name} className="flex items-center gap-1.5">
                <span className="font-mono text-[var(--brand)]">{f.name}</span>
                <span className="text-[var(--text-muted)]">:{f.type}</span>
                {f.required && <span className="text-rose-500">*</span>}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">输出</p>
          <ul className="mt-1.5 space-y-1 text-[11px]">
            {template.outputExample.slice(0, 2).map((f) => (
              <li key={f.name} className="flex items-center gap-1.5">
                <span className="font-mono text-[var(--brand)]">{f.name}</span>
                <span className="text-[var(--text-muted)]">:{f.type}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
      {template.tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {template.tags.map((t) => (
            <span key={t} className="rounded-full bg-[var(--bg-elevated)] px-2 py-0.5 text-[10px] text-[var(--text-secondary)]">{t}</span>
          ))}
        </div>
      )}
      <div className="mt-auto pt-4">
        <button type="button" onClick={() => onAdd(template)} className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-[var(--brand)] bg-[var(--brand-light)] px-3 py-2 text-xs font-semibold text-[var(--brand)] hover:bg-white">
          <Plus className="h-3.5 w-3.5" />加入草稿
        </button>
      </div>
    </article>
  );
}