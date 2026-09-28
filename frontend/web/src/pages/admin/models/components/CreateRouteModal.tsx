import { useEffect, useState } from 'react';
import { Filter } from 'lucide-react';
import { CenterModal } from '@/components/feedback/CenterModal';
import type { RouteRule, TaskType, RouteStrategy, Model } from '@/api/admin/models/schema';
import { TASK_LABEL, STRATEGY_LABEL } from './constants';

interface CreateRouteModalProps {
  open: boolean;
  onClose: () => void;
  onCreate: (r: RouteRule) => void;
  models: Model[];
}

const TASK_OPTIONS: TaskType[] = ['reasoning', 'generation', 'classification', 'embedding', 'summarization'];
const STRATEGY_OPTIONS: RouteStrategy[] = ['quality-first', 'cost-first', 'latency-first', 'fallback'];

export function CreateRouteModal({ open, onClose, onCreate, models }: CreateRouteModalProps) {
  const [name, setName] = useState('');
  const [task, setTask] = useState<TaskType>('reasoning');
  const [strategy, setStrategy] = useState<RouteStrategy>('quality-first');
  const [priority, setPriority] = useState(50);
  const [primaryModelId, setPrimaryModelId] = useState(models[0]?.id ?? '');
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (open) {
      setName(''); setTask('reasoning'); setStrategy('quality-first'); setPriority(50);
      setPrimaryModelId(models[0]?.id ?? ''); setDescription('');
    }
  }, [open, models]);

  const canSubmit = name.trim().length > 0 && primaryModelId.length > 0;

  const handleSubmit = () => {
    const created: RouteRule = {
      id: `rt-${Date.now().toString(36)}`,
      name,
      task,
      strategy,
      priority,
      primaryModelId,
      fallbackModelIds: [],
      enabled: true,
      description: description || '由管理员手动创建',
    };
    onCreate(created);
  };

  return (
    <CenterModal
      open={open}
      onClose={onClose}
      ariaLabel="新建路由规则"
      panelClassName="max-w-2xl"
      title={<span className="flex items-center gap-2"><Filter className="h-5 w-5 text-[var(--brand)]" />新建路由规则</span>}
      description="为指定任务配置主模型与降级链"
      footer={
        <>
          <button type="button" onClick={onClose} className="rounded-xl border border-[var(--border)] px-4 py-2 text-xs font-semibold">取消</button>
          <button type="button" onClick={handleSubmit} disabled={!canSubmit} className="rounded-xl bg-[var(--brand)] px-4 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40">创建规则</button>
        </>
      }
    >
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">规则名称</label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="例如:推理任务 · 质量优先" className="mt-1.5 h-10 w-full rounded-xl border border-[var(--border-strong)] bg-[var(--bg-elevated)] px-3 text-sm outline-none focus:border-[var(--brand)]" />
        </div>
        <div>
          <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">任务类型</label>
          <select value={task} onChange={(e) => setTask(e.target.value as TaskType)} className="mt-1.5 h-10 w-full rounded-xl border border-[var(--border-strong)] bg-[var(--bg-elevated)] px-3 text-sm outline-none focus:border-[var(--brand)]">
            {TASK_OPTIONS.map((t) => <option key={t} value={t}>{TASK_LABEL[t]}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">策略</label>
          <select value={strategy} onChange={(e) => setStrategy(e.target.value as RouteStrategy)} className="mt-1.5 h-10 w-full rounded-xl border border-[var(--border-strong)] bg-[var(--bg-elevated)] px-3 text-sm outline-none focus:border-[var(--brand)]">
            {STRATEGY_OPTIONS.map((s) => <option key={s} value={s}>{STRATEGY_LABEL[s]}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">优先级</label>
          <input type="number" value={priority} onChange={(e) => setPriority(Number(e.target.value))} className="mt-1.5 h-10 w-full rounded-xl border border-[var(--border-strong)] bg-[var(--bg-elevated)] px-3 text-sm outline-none focus:border-[var(--brand)]" />
        </div>
        <div className="sm:col-span-2">
          <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">主模型</label>
          <select value={primaryModelId} onChange={(e) => setPrimaryModelId(e.target.value)} className="mt-1.5 h-10 w-full rounded-xl border border-[var(--border-strong)] bg-[var(--bg-elevated)] px-3 text-sm outline-none focus:border-[var(--brand)]">
            {models.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">说明</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="mt-1.5 w-full rounded-xl border border-[var(--border-strong)] bg-[var(--bg-elevated)] px-3 py-2 text-sm outline-none focus:border-[var(--brand)]" />
        </div>
      </div>
    </CenterModal>
  );
}
