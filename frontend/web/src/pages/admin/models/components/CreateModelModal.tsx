import { useEffect, useState } from 'react';
import { Bot, Plus } from 'lucide-react';
import { CenterModal } from '@/components/feedback/CenterModal';
import type { Model, CreateModelVars, Provider, TaskType } from '@/api/admin/models/schema';
import { TASK_LABEL, TIER_LABEL } from './constants';
import { StepIndicator } from './Primitives';

interface CreateModelModalProps {
  open: boolean;
  onClose: () => void;
  onCreate: (m: Model) => void;
  providers: Provider[];
}

const TASK_OPTIONS: TaskType[] = ['reasoning', 'generation', 'classification', 'embedding', 'summarization'];

export function CreateModelModal({ open, onClose, onCreate, providers }: CreateModelModalProps) {
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [providerId, setProviderId] = useState(providers[0]?.id ?? '');
  const [task, setTask] = useState<TaskType[]>(['generation']);
  const [contextWindow, setContextWindow] = useState(16000);
  const [priceIn, setPriceIn] = useState(0.001);
  const [priceOut, setPriceOut] = useState(0.003);
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');

  useEffect(() => {
    if (open) {
      setStep(1); setName(''); setProviderId(providers[0]?.id ?? '');
      setTask(['generation']); setContextWindow(16000); setPriceIn(0.001); setPriceOut(0.003);
      setDescription(''); setTags('');
    }
  }, [open, providers]);

  const stepOneOk = name.trim().length > 0 && providerId.length > 0 && task.length > 0;
  const stepTwoOk = contextWindow > 0 && priceIn >= 0 && priceOut >= 0;

  const handleSubmit = () => {
    const provider = providers.find((p) => p.id === providerId);
    const created: Model = {
      id: `md-${Date.now().toString(36)}`,
      name,
      providerId,
      providerName: provider?.name ?? '未指定',
      task,
      contextWindow,
      priceIn,
      priceOut,
      latencyMs: 0,
      successRate: 0,
      status: 'draft',
      tier: 'balanced',
      starred: false,
      calls: 0,
      trend: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      description: description || '由管理员手动创建',
      tags: tags.split(',').map((s) => s.trim()).filter(Boolean),
    };
    onCreate(created);
    void ({} as CreateModelVars);
  };

  return (
    <CenterModal
      open={open}
      onClose={onClose}
      ariaLabel="新建模型"
      panelClassName="max-w-2xl"
      title={<span className="flex items-center gap-2"><Bot className="h-5 w-5 text-[var(--brand)]" />新建模型</span>}
      description="完成 3 步配置后即可接入模型"
      footer={
        <>
          <button type="button" onClick={onClose} className="rounded-xl border border-[var(--border)] px-4 py-2 text-xs font-semibold">取消</button>
          {step === 1 && <button type="button" onClick={() => setStep(2)} disabled={!stepOneOk} className="rounded-xl bg-[var(--brand)] px-4 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40">下一步</button>}
          {step === 2 && <button type="button" onClick={() => setStep(3)} disabled={!stepTwoOk} className="rounded-xl bg-[var(--brand)] px-4 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40">下一步</button>}
          {step === 3 && <button type="button" onClick={handleSubmit} className="rounded-xl bg-[var(--brand)] px-4 py-2 text-xs font-semibold text-white">创建模型</button>}
        </>
      }
    >
      <div className="mt-4 space-y-4">
        <StepIndicator current={step} total={3} labels={['基础信息', '参数定价', '补充说明']} />
        {step === 1 && (
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">模型名称</label>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="例如:GPT-4o 微调版" className="mt-1.5 h-10 w-full rounded-xl border border-[var(--border-strong)] bg-[var(--bg-elevated)] px-3 text-sm outline-none focus:border-[var(--brand)]" />
            </div>
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">提供商</label>
              <select value={providerId} onChange={(e) => setProviderId(e.target.value)} className="mt-1.5 h-10 w-full rounded-xl border border-[var(--border-strong)] bg-[var(--bg-elevated)] px-3 text-sm outline-none focus:border-[var(--brand)]">
                {providers.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">能力</label>
              <div className="mt-1.5 flex flex-wrap gap-2">
                {TASK_OPTIONS.map((t) => {
                  const on = task.includes(t);
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setTask((cur) => on ? cur.filter((x) => x !== t) : [...cur, t])}
                      aria-pressed={on}
                      className={`inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-[11px] font-semibold transition ${on ? 'border-[var(--brand)] bg-[var(--brand-light)] text-[var(--brand)]' : 'border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--brand)]'}`}
                    >
                      {TASK_LABEL[t]}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
        {step === 2 && (
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">上下文 (token)</label>
              <input type="number" value={contextWindow} onChange={(e) => setContextWindow(Number(e.target.value))} className="mt-1.5 h-10 w-full rounded-xl border border-[var(--border-strong)] bg-[var(--bg-elevated)] px-3 text-sm outline-none focus:border-[var(--brand)]" />
            </div>
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">输入价 ¥/k</label>
              <input type="number" step="0.0001" value={priceIn} onChange={(e) => setPriceIn(Number(e.target.value))} className="mt-1.5 h-10 w-full rounded-xl border border-[var(--border-strong)] bg-[var(--bg-elevated)] px-3 text-sm outline-none focus:border-[var(--brand)]" />
            </div>
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">输出价 ¥/k</label>
              <input type="number" step="0.0001" value={priceOut} onChange={(e) => setPriceOut(Number(e.target.value))} className="mt-1.5 h-10 w-full rounded-xl border border-[var(--border-strong)] bg-[var(--bg-elevated)] px-3 text-sm outline-none focus:border-[var(--brand)]" />
            </div>
            <div className="sm:col-span-3">
              <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">默认层级</label>
              <p className="mt-1.5 text-xs text-[var(--text-muted)]">新模型默认为「{TIER_LABEL.balanced}」,上线后可在详情抽屉修改。</p>
            </div>
          </div>
        )}
        {step === 3 && (
          <div className="space-y-4">
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">描述</label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="mt-1.5 w-full rounded-xl border border-[var(--border-strong)] bg-[var(--bg-elevated)] px-3 py-2 text-sm outline-none focus:border-[var(--brand)]" />
            </div>
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">标签(逗号分隔)</label>
              <input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="例如:推理,长上下文" className="mt-1.5 h-10 w-full rounded-xl border border-[var(--border-strong)] bg-[var(--bg-elevated)] px-3 text-sm outline-none focus:border-[var(--brand)]" />
            </div>
            <div className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--bg-elevated)] p-4 text-[11px]">
              <p className="font-semibold text-[var(--brand)] flex items-center gap-1"><Plus className="h-3 w-3" />创建后将进入「草稿」状态</p>
              <p className="mt-1 text-[var(--text-muted)]">需要完成健康检查后才能启用。</p>
            </div>
          </div>
        )}
      </div>
    </CenterModal>
  );
}
