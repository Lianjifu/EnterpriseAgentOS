import { Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { CenterModal } from '@/components/feedback/CenterModal';
import type { EnterpriseBudget, BudgetPeriod } from '@/api/admin/quotas/schema';
import { PERIOD_LABEL } from './constants';
import { StepIndicator } from './Primitives';

export function CreateBudgetModal({ open, onClose, onCreate }: {
  open: boolean;
  onClose: () => void;
  onCreate: (b: EnterpriseBudget) => void;
}) {
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [period, setPeriod] = useState<BudgetPeriod>('monthly');
  const [totalCap, setTotalCap] = useState(100000);
  const [alertThreshold, setAlertThreshold] = useState(80);
  const [rollover, setRollover] = useState(false);
  const [owner, setOwner] = useState('');
  useEffect(() => {
    if (open) { setStep(1); setName(''); setPeriod('monthly'); setTotalCap(100000); setAlertThreshold(80); setRollover(false); setOwner(''); }
  }, [open]);
  const canNext = name.trim().length > 0;
  const handleSubmit = () => {
    onCreate({
      id: `bg-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      name: name.trim(),
      period,
      totalCap,
      used: 0,
      forecast: 0,
      rollover,
      alertThreshold,
      status: 'healthy',
      effectiveDate: new Date().toISOString().slice(0, 10),
      owner: owner.trim() || '未指定',
      description: '由管理员手动创建',
    });
  };
  return (
    <CenterModal
      open={open}
      onClose={onClose}
      ariaLabel="新建企业预算"
      panelClassName="max-w-2xl"
      title={<span className="flex items-center gap-2"><Plus className="h-5 w-5 text-[var(--brand)]" />新建企业预算</span>}
      description={step === 1 ? '基本信息' : step === 2 ? '规则设定' : '确认创建'}
      footer={
        <>
          {step > 1 && <button type="button" onClick={() => setStep((s) => Math.max(1, s - 1))} className="rounded-xl border border-[var(--border)] px-4 py-2 text-xs font-semibold">上一步</button>}
          {step < 3 && <button type="button" onClick={() => setStep((s) => s + 1)} disabled={step === 1 && !canNext} className="rounded-xl bg-[var(--brand)] px-4 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40">下一步</button>}
          {step === 3 && <button type="button" onClick={handleSubmit} className="rounded-xl bg-[var(--brand)] px-4 py-2 text-xs font-semibold text-white">创建预算</button>}
        </>
      }
    >
      <div className="mt-4 mb-5"><StepIndicator current={step} total={3} labels={['基本信息', '规则设定', '确认']} /></div>
      {step === 1 && (
        <div className="space-y-4">
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">预算名称</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="例如:2026 Q3 运营预算" className="mt-1.5 h-10 w-full rounded-xl border border-[var(--border-strong)] bg-[var(--bg-elevated)] px-3 text-sm outline-none focus:border-[var(--brand)]" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">周期</label>
              <select value={period} onChange={(e) => setPeriod(e.target.value as BudgetPeriod)} className="mt-1.5 h-10 w-full rounded-xl border border-[var(--border-strong)] bg-[var(--bg-elevated)] px-3 text-sm outline-none focus:border-[var(--brand)]">
                {(Object.keys(PERIOD_LABEL) as BudgetPeriod[]).map((p) => <option key={p} value={p}>{PERIOD_LABEL[p]}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">负责人</label>
              <input type="text" value={owner} onChange={(e) => setOwner(e.target.value)} placeholder="例如:张敏" className="mt-1.5 h-10 w-full rounded-xl border border-[var(--border-strong)] bg-[var(--bg-elevated)] px-3 text-sm outline-none focus:border-[var(--brand)]" />
            </div>
          </div>
        </div>
      )}
      {step === 2 && (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">总预算 (¥)</label>
              <input type="number" value={totalCap} onChange={(e) => setTotalCap(Number(e.target.value))} className="mt-1.5 h-10 w-full rounded-xl border border-[var(--border-strong)] bg-[var(--bg-elevated)] px-3 text-sm outline-none focus:border-[var(--brand)]" />
            </div>
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">预警阈值 (%)</label>
              <input type="number" min={0} max={100} value={alertThreshold} onChange={(e) => setAlertThreshold(Number(e.target.value))} className="mt-1.5 h-10 w-full rounded-xl border border-[var(--border-strong)] bg-[var(--bg-elevated)] px-3 text-sm outline-none focus:border-[var(--brand)]" />
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] p-3">
            <button type="button" onClick={() => setRollover(!rollover)} aria-pressed={rollover} className={`relative inline-flex h-5 w-9 items-center rounded-full transition ${rollover ? 'bg-[var(--brand)]' : 'bg-[var(--bg-elevated)]'}`}>
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition ${rollover ? 'translate-x-4' : 'translate-x-0.5'}`} />
            </button>
            <div>
              <p className="text-xs font-semibold">余额结转</p>
              <p className="text-[11px] text-[var(--text-muted)]">开启后,本周期未使用的预算将结转到下周期。</p>
            </div>
          </div>
        </div>
      )}
      {step === 3 && (
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-5 text-xs">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">确认信息</p>
          <ul className="mt-3 space-y-1">
            <li>· 名称:<span className="font-semibold">{name}</span></li>
            <li>· 周期:{PERIOD_LABEL[period]}</li>
            <li>· 总预算:¥ {totalCap.toLocaleString('zh-CN')}</li>
            <li>· 预警阈值:{alertThreshold}%</li>
            <li>· 余额结转:{rollover ? '开启' : '关闭'}</li>
            <li>· 负责人:{owner || '未指定'}</li>
          </ul>
        </div>
      )}
    </CenterModal>
  );
}