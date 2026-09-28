/**
 * CreateRuleModal — 新建审计规则。
 */
import { useEffect, useState } from 'react';
import { Shield } from 'lucide-react';
import { CenterModal } from '@/components/feedback/CenterModal';
import type {
  AuditCategory, AuditRule, AuditRuleAction, AuditSeverity,
} from '@/api/admin/audit/schema';

interface CreateRuleModalProps {
  open: boolean;
  onClose: () => void;
  onCreate: (r: AuditRule) => void;
}

function uid(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}`;
}

export function CreateRuleModal({ open, onClose, onCreate }: CreateRuleModalProps) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState<AuditCategory>('tool');
  const [condition, setCondition] = useState('');
  const [action, setAction] = useState<AuditRuleAction>('log');
  const [severity, setSeverity] = useState<AuditSeverity>('medium');
  useEffect(() => {
    if (open) {
      setName('');
      setCondition('');
      setAction('log');
      setSeverity('medium');
      setCategory('tool');
    }
  }, [open]);
  return (
    <CenterModal
      open={open}
      onClose={onClose}
      ariaLabel="新建审计规则"
      panelClassName="max-w-lg"
      title={
        <span className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-[var(--brand)]" />
          新建审计规则
        </span>
      }
      description="为工具调用、数据访问或 MCP 通道设置命中条件与处置动作。"
      footer={
        <>
          <button type="button" onClick={onClose} className="rounded-xl border border-[var(--border)] px-4 py-2 text-xs font-semibold">
            取消
          </button>
          <button
            type="button"
            disabled={name.trim().length === 0 || condition.trim().length === 0}
            onClick={() => {
              onCreate({
                id: uid('rl'),
                name: name.trim(),
                category,
                condition,
                severity,
                action,
                enabled: true,
                hitCount: 0,
                description: '由前端交互创建',
              });
              onClose();
            }}
            className="rounded-xl bg-[var(--brand)] px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"
          >
            创建规则
          </button>
        </>
      }
    >
      <div className="mt-4 grid gap-3">
        <div>
          <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">规则名称</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1.5 h-10 w-full rounded-xl border border-[var(--border-strong)] bg-[var(--bg-elevated)] px-3 text-sm outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--brand)]"
            placeholder="例如:工具循环调用熔断"
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">类型</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as AuditCategory)}
              className="mt-1.5 h-10 w-full rounded-xl border border-[var(--border-strong)] bg-[var(--bg-elevated)] px-3 text-sm outline-none focus:border-[var(--brand)]"
            >
              <option value="tool">工具</option>
              <option value="data">数据</option>
              <option value="auth">鉴权</option>
              <option value="mcp">MCP</option>
            </select>
          </div>
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">动作</label>
            <select
              value={action}
              onChange={(e) => setAction(e.target.value as AuditRuleAction)}
              className="mt-1.5 h-10 w-full rounded-xl border border-[var(--border-strong)] bg-[var(--bg-elevated)] px-3 text-sm outline-none focus:border-[var(--brand)]"
            >
              <option value="log">记录</option>
              <option value="alert">告警</option>
              <option value="confirm">需审批</option>
              <option value="block">阻断</option>
            </select>
          </div>
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">级别</label>
            <select
              value={severity}
              onChange={(e) => setSeverity(e.target.value as AuditSeverity)}
              className="mt-1.5 h-10 w-full rounded-xl border border-[var(--border-strong)] bg-[var(--bg-elevated)] px-3 text-sm outline-none focus:border-[var(--brand)]"
            >
              <option value="low">低风险</option>
              <option value="medium">中风险</option>
              <option value="high">高风险</option>
              <option value="critical">严重</option>
            </select>
          </div>
        </div>
        <div>
          <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">命中条件</label>
          <input
            value={condition}
            onChange={(e) => setCondition(e.target.value)}
            className="mt-1.5 h-10 w-full rounded-xl border border-[var(--border-strong)] bg-[var(--bg-elevated)] px-3 font-mono text-sm outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--brand)]"
            placeholder="例如:tool.repeat_count > 5 within 60s"
          />
        </div>
      </div>
    </CenterModal>
  );
}