import { Bot, Star, CheckCircle2 } from 'lucide-react';
import type { Model } from '@/api/admin/models/schema';
import { STATUS_BADGE, TIER_LABEL, TASK_LABEL, formatPrice } from './constants';
import { Sparkline } from './Primitives';

interface ModelCardProps {
  model: Model;
  selected: boolean;
  onToggleSelect: (id: string) => void;
  onSelect: (m: Model) => void;
  onToggleStar: (id: string) => void;
}

export function ModelCard({ model, selected, onToggleSelect, onSelect, onToggleStar }: ModelCardProps) {
  const badge = STATUS_BADGE[model.status];
  return (
    <article className={`relative rounded-2xl border bg-[var(--surface-1)] p-4 transition ${selected ? 'border-[var(--brand)] shadow-[0_0_0_2px_var(--brand-light)]' : 'border-[var(--border)] hover:border-[var(--brand)]'}`}>
      <header className="flex items-start gap-2">
        <button
          type="button"
          aria-label={selected ? '取消选择' : '选择模型'}
          aria-pressed={selected}
          onClick={() => onToggleSelect(model.id)}
          className={`grid h-5 w-5 place-items-center rounded-md border ${selected ? 'border-[var(--brand)] bg-[var(--brand)] text-white' : 'border-[var(--border-strong)] bg-[var(--surface-1)] text-transparent hover:border-[var(--brand)]'}`}
        >
          {selected && <CheckCircle2 className="h-3 w-3" />}
        </button>
        <button type="button" onClick={() => onSelect(model)} className="flex-1 text-left">
          <div className="flex items-center gap-1.5">
            <Bot className="h-4 w-4 text-[var(--brand)]" />
            <h4 className="text-sm font-semibold">{model.name}</h4>
          </div>
          <p className="mt-0.5 text-[11px] text-[var(--text-muted)]">{model.providerName}</p>
        </button>
        <button
          type="button"
          aria-label={model.starred ? '取消收藏' : '收藏模型'}
          onClick={() => onToggleStar(model.id)}
          className={`grid h-7 w-7 place-items-center rounded-lg ${model.starred ? 'text-amber-500' : 'text-[var(--text-muted)] hover:text-amber-500'}`}
        >
          <Star className={`h-4 w-4 ${model.starred ? 'fill-current' : ''}`} />
        </button>
      </header>

      <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[10px]">
        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-semibold ${badge.className}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${badge.dot}`} aria-hidden="true" />{badge.label}
        </span>
        <span className="rounded-full bg-[var(--bg-elevated)] px-2 py-0.5 font-medium">{TIER_LABEL[model.tier]}</span>
        {model.task.map((t) => (
          <span key={t} className="rounded-full bg-[var(--bg-elevated)] px-2 py-0.5 font-medium">{TASK_LABEL[t]}</span>
        ))}
      </div>

      <p className="mt-3 line-clamp-2 text-[11px] leading-5 text-[var(--text-muted)]">{model.description}</p>

      <div className="mt-3">
        <Sparkline values={model.trend} tone={model.status === 'retired' ? 'rose' : 'emerald'} />
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 text-[10px]">
        <div>
          <p className="text-[var(--text-muted)]">本月调用</p>
          <p className="font-semibold tabular-nums">{model.calls.toLocaleString('zh-CN')}</p>
        </div>
        <div>
          <p className="text-[var(--text-muted)]">输入价</p>
          <p className="font-semibold tabular-nums">{formatPrice(model.priceIn, 'in')}/k</p>
        </div>
        <div>
          <p className="text-[var(--text-muted)]">延迟</p>
          <p className="font-semibold tabular-nums">{model.latencyMs ? `${model.latencyMs}ms` : '—'}</p>
        </div>
      </div>
    </article>
  );
}
