import { Bell } from 'lucide-react';
import { useEffect, useState } from 'react';
import { CenterModal } from '@/components/feedback/CenterModal';
import type { AlertRule, AlertSeverity } from '../schema';
import { SEVERITY_BADGE } from './constants';

export function CreateAlertModal({ open, onClose, onCreate }: {
  open: boolean;
  onClose: () => void;
  onCreate: (a: AlertRule) => void;
}) {
  const [name, setName] = useState('');
  const [scope, setScope] = useState<AlertRule['scope']>('enterprise');
  const [severity, setSeverity] = useState<AlertSeverity>('warning');
  const [metric, setMetric] = useState('月度 Token');
  const [threshold, setThreshold] = useState(80);
  const [cooldown, setCooldown] = useState('12h');
  const [notify, setNotify] = useState('admin@');
  useEffect(() => {
    if (open) { setName(''); setScope('enterprise'); setSeverity('warning'); setMetric('月度 Token'); setThreshold(80); setCooldown('12h'); setNotify('admin@'); }
  }, [open]);
  const canSubmit = name.trim().length > 0;
  const handleSubmit = () => {
    onCreate({
      id: `al-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      name: name.trim(),
      scope,
      severity,
      metric,
      threshold,
      enabled: true,
      cooldown,
      notify: notify.split(',').map((s) => s.trim()).filter(Boolean),
      lastTriggered: '—',
      description: '由管理员手动创建',
    });
  };
  return (
    <CenterModal
      open={open}
      onClose={onClose}
      ariaLabel="新建告警规则"
      panelClassName="max-w-2xl"
      title={<span className="flex items-center gap-2"><Bell className="h-5 w-5 text-[var(--brand)]" />新建告警规则</span>}
      description="为额度使用配置告警阈值与通知渠道"
      footer={
        <>
          <button type="button" onClick={onClose} className="rounded-xl border border-[var(--border)] px-4 py-2 text-xs font-semibold">取消</button>
          <button type="button" onClick={handleSubmit} disabled={!canSubmit} className="rounded-xl bg-[var(--brand)] px-4 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40">创建规则</button>
        </>
      }
    >
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">规则名称</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="例如:部门使用率告警" className="mt-1.5 h-10 w-full rounded-xl border border-[var(--border-strong)] bg-[var(--bg-elevated)] px-3 text-sm outline-none focus:border-[var(--brand)]" />
        </div>
        <div>
          <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">范围</label>
          <select value={scope} onChange={(e) => setScope(e.target.value as AlertRule['scope'])} className="mt-1.5 h-10 w-full rounded-xl border border-[var(--border-strong)] bg-[var(--bg-elevated)] px-3 text-sm outline-none focus:border-[var(--brand)]">
            <option value="enterprise">企业</option>
            <option value="department">部门</option>
            <option value="channel">渠道</option>
          </select>
        </div>
        <div>
          <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">严重度</label>
          <select value={severity} onChange={(e) => setSeverity(e.target.value as AlertSeverity)} className="mt-1.5 h-10 w-full rounded-xl border border-[var(--border-strong)] bg-[var(--bg-elevated)] px-3 text-sm outline-none focus:border-[var(--brand)]">
            {(Object.keys(SEVERITY_BADGE) as AlertSeverity[]).map((s) => <option key={s} value={s}>{SEVERITY_BADGE[s].label}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">指标</label>
          <input type="text" value={metric} onChange={(e) => setMetric(e.target.value)} className="mt-1.5 h-10 w-full rounded-xl border border-[var(--border-strong)] bg-[var(--bg-elevated)] px-3 text-sm outline-none focus:border-[var(--brand)]" />
        </div>
        <div>
          <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">阈值</label>
          <input type="number" value={threshold} onChange={(e) => setThreshold(Number(e.target.value))} className="mt-1.5 h-10 w-full rounded-xl border border-[var(--border-strong)] bg-[var(--bg-elevated)] px-3 text-sm outline-none focus:border-[var(--brand)]" />
        </div>
        <div>
          <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">静默时长</label>
          <input type="text" value={cooldown} onChange={(e) => setCooldown(e.target.value)} placeholder="例如:12h" className="mt-1.5 h-10 w-full rounded-xl border border-[var(--border-strong)] bg-[var(--bg-elevated)] px-3 text-sm outline-none focus:border-[var(--brand)]" />
        </div>
        <div>
          <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">通知人</label>
          <input type="text" value={notify} onChange={(e) => setNotify(e.target.value)} placeholder="邮箱,逗号分隔" className="mt-1.5 h-10 w-full rounded-xl border border-[var(--border-strong)] bg-[var(--bg-elevated)] px-3 text-sm outline-none focus:border-[var(--brand)]" />
        </div>
      </div>
    </CenterModal>
  );
}