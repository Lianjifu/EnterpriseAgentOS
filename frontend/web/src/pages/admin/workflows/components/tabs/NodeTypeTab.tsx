/**
 * NodeTypeTab — 触发器 / 动作 / 条件 三类节点模板展示。
 */
import { Plus } from 'lucide-react';
import type { NodeKind, NodeTemplate, NodeTypeTabId } from '@/api/admin/workflows/schema';
import { NODE_TONE_CLASS, NODE_TYPE_TAB_META, nodeKindIcon } from '../constants';

interface NodeTypeTabProps {
  type: NodeTypeTabId;
  onAddTemplate: (t: NodeTemplate) => void;
}

const TAB_DATA: Record<NodeTypeTabId, Array<{ kind: NodeKind; label: string; subtitle: string; description: string; defaults: Record<string, string> }>> = {
  trigger: [
    { kind: 'trigger', label: '消息触发', subtitle: '用户输入关键字时启动', description: '当用户输入匹配关键字或正则表达式时启动流程。常用于客服 / 表单提交场景。', defaults: { trigger: '消息触发', keyword: '/complaint', mode: 'startsWith' } },
    { kind: 'trigger', label: '定时触发', subtitle: '按 cron 表达式启动', description: '按 cron 表达式或固定间隔启动。常用于日报 / 周报 / 巡检。', defaults: { trigger: '定时触发', cron: '0 9 * * 1-5', tz: 'Asia/Shanghai' } },
    { kind: 'trigger', label: '事件触发', subtitle: 'webhook / 业务事件', description: '由 webhook / 业务事件(订单提交 / 工单创建)启动。', defaults: { trigger: '事件触发', event: 'order.created', source: 'crm' } },
    { kind: 'trigger', label: '手动触发', subtitle: '管理员手动运行', description: '由管理员在工作流管理页手动运行。常用于一次性的数据修复。', defaults: { trigger: '手动触发', runBy: 'admin' } },
  ],
  action: [
    { kind: 'tool', label: '工具调用', subtitle: '调起已注册的工具', description: '调起一个已注册的工具,传入参数并等待结果。常用于查询 / 通知。', defaults: { tool: 'knowledge_search', input: '{query}' } },
    { kind: 'agent', label: '智能体调用', subtitle: '委托智能体执行', description: '把子任务委托给另一个智能体,可指定 model / system prompt。', defaults: { agent: 'sales-coach', prompt: '请基于 {topic} 给出建议' } },
    { kind: 'tool', label: 'HTTP 请求', subtitle: '调用外部 API', description: '直接调起一个 HTTP 接口,GET / POST / PUT / DELETE 都支持。', defaults: { method: 'POST', url: 'https://api.example.com/v1/...', auth: 'bearer' } },
    { kind: 'tool', label: '数据库查询', subtitle: '查 Postgres / MySQL', description: '对已注册的数据库执行 SQL,返回结构化结果。', defaults: { db: 'prod', sql: 'SELECT ... FROM ... LIMIT 100' } },
    { kind: 'tool', label: '通知发送', subtitle: '邮件 / IM / Webhook', description: '通过邮件 / 飞书 / Slack / Webhook 发送通知,可指定接收人。', defaults: { channel: 'email', target: 'team@x.com', template: 'weekly_report' } },
  ],
  condition: [
    { kind: 'condition', label: 'IF / ELSE', subtitle: '二元分支', description: '按表达式真假分流;真走 if 分支,假走 else 分支。', defaults: { mode: 'if', op: '==', left: '{level}', right: 'A' } },
    { kind: 'condition', label: 'Switch 多分支', subtitle: '按值路由', description: '按表达式的值路由到不同分支,支持任意多个分支。', defaults: { mode: 'switch', expr: '{severity}', cases: 'high,mid,low' } },
    { kind: 'condition', label: '循环', subtitle: '遍历子流程', description: '对集合中的每个元素执行一次子流程,结果聚合。', defaults: { mode: 'loop', over: '{items}' } },
    { kind: 'condition', label: '并行', subtitle: '并发执行', description: '并行执行多个子分支,等待全部完成后再继续。', defaults: { mode: 'parallel', branches: '2' } },
  ],
};

export function NodeTypeTab({ type, onAddTemplate }: NodeTypeTabProps) {
  const data = TAB_DATA[type];
  const meta = NODE_TYPE_TAB_META[type];
  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-base font-semibold">{meta.title}</h3>
            <p className="mt-1 text-xs text-[var(--text-muted)]">{meta.subtitle}</p>
          </div>
        </div>
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          {data.map((item) => {
            const Icon = nodeKindIcon(item.kind);
            return (
              <article key={item.label} className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-4">
                <div className="flex items-start gap-3">
                  <span className={`grid h-9 w-9 place-items-center rounded-lg ${NODE_TONE_CLASS[item.kind].wrap}`}>
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">{item.label}</p>
                    <p className="text-[11px] text-[var(--text-muted)]">{item.subtitle}</p>
                    <p className="mt-3 text-xs leading-6 text-[var(--text-muted)]">{item.description}</p>
                    <div className="mt-3 grid grid-cols-2 gap-2 rounded-lg bg-[var(--surface-1)] p-3 text-[11px]">
                      {Object.entries(item.defaults).map(([k, v]) => (
                        <div key={k} className="flex items-center gap-2">
                          <span className="text-[var(--text-muted)]">{k}</span>
                          <span className="font-mono text-[var(--text-secondary)] truncate">{v}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-end">
                  <button type="button" onClick={() => onAddTemplate({
                    kind: item.kind, label: item.label, subtitle: item.subtitle,
                    tone: 'brand', description: item.description, defaults: item.defaults,
                  })} className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--brand)] px-3 py-2 text-xs font-semibold text-white hover:bg-[var(--brand-hover)]">
                    <Plus className="h-3.5 w-3.5" />加入画布
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}