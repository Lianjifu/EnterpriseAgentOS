/**
 * ModelCard — 对齐 SkillCard：整卡进详情，底栏等权操作。
 */
import {
  Bot, Star, CheckCircle2, Edit3, Download, Trash2, Power,
} from 'lucide-react';
import type { Model } from '../schema';
import { STATUS_BADGE, TIER_LABEL, TASK_LABEL, formatPrice } from './constants';
import { Sparkline } from './Primitives';

interface ModelCardProps {
  model: Model;
  selected: boolean;
  onToggleSelect: (id: string) => void;
  onSelect: (m: Model) => void;
  onToggleStar: (id: string) => void;
  onEdit: (m: Model) => void;
  onEnable: (m: Model) => void;
  onExportOne: (m: Model) => void;
  onRequestDelete: (m: Model) => void;
}

export function ModelCard({
  model, selected, onToggleSelect, onSelect, onToggleStar,
  onEdit, onEnable, onExportOne, onRequestDelete,
}: ModelCardProps) {
  const badge = STATUS_BADGE[model.status];
  const isActive = model.status === 'active';

  return (
    <article
      className={`group relative flex flex-col gap-4 rounded-2xl border bg-[var(--surface-1)] p-5 text-left transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-sm)] ${
        selected ? 'border-[var(--brand)] shadow-[var(--shadow-sm)]' : 'border-[var(--border)] hover:border-[var(--brand)]'
      }`}
    >
      <div
        role="button"
        tabIndex={0}
        onClick={() => onSelect(model)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onSelect(model);
          }
        }}
        aria-label={`查看 ${model.name} 详情`}
        className="absolute inset-0 z-0 cursor-pointer rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)]"
      />

      <header className="relative z-10 flex items-start gap-2">
        <button
          type="button"
          aria-label={selected ? '取消选择' : '选择模型'}
          aria-pressed={selected}
          onClick={(event) => { event.stopPropagation(); onToggleSelect(model.id); }}
          className={`grid h-5 w-5 place-items-center rounded-md border ${selected ? 'border-[var(--brand)] bg-[var(--brand)] text-white' : 'border-[var(--border-strong)] bg-[var(--surface-1)] text-transparent hover:border-[var(--brand)]'}`}
        >
          {selected && <CheckCircle2 className="h-3 w-3" />}
        </button>
        <div className="pointer-events-none min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <Bot className="h-4 w-4 text-[var(--brand)]" />
            <h4 className="text-sm font-semibold group-hover:text-[var(--brand)]">{model.name}</h4>
          </div>
          <p className="mt-0.5 text-[11px] text-[var(--text-muted)]">{model.providerName}</p>
        </div>
        <button
          type="button"
          aria-label={model.starred ? '取消收藏' : '收藏模型'}
          onClick={(event) => { event.stopPropagation(); onToggleStar(model.id); }}
          className={`grid h-7 w-7 place-items-center rounded-lg ${model.starred ? 'text-amber-500' : 'text-[var(--text-muted)] hover:text-amber-500'}`}
        >
          <Star className={`h-4 w-4 ${model.starred ? 'fill-current' : ''}`} />
        </button>
      </header>

      <div className="pointer-events-none relative z-10 flex flex-wrap items-center gap-1.5 text-[10px]">
        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-semibold ${badge.className}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${badge.dot}`} aria-hidden="true" />{badge.label}
        </span>
        <span className="rounded-full bg-[var(--bg-elevated)] px-2 py-0.5 font-medium">{TIER_LABEL[model.tier]}</span>
        {model.task.map((t) => (
          <span key={t} className="rounded-full bg-[var(--bg-elevated)] px-2 py-0.5 font-medium">{TASK_LABEL[t]}</span>
        ))}
      </div>

      <p className="pointer-events-none relative z-10 line-clamp-2 text-[11px] leading-5 text-[var(--text-muted)]">{model.description}</p>

      <div className="pointer-events-none relative z-10">
        <Sparkline values={model.trend} tone={model.status === 'retired' ? 'rose' : 'emerald'} />
      </div>

      <div className="pointer-events-none relative z-10 grid grid-cols-3 gap-2 text-[10px]">
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

      <div className="relative z-10 flex flex-wrap gap-1.5 border-t border-[var(--border)] pt-3">
        <button type="button" onClick={(event) => { event.stopPropagation(); onEdit(model); }} className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg border border-[var(--border)] px-1.5 py-1.5 text-[11px] font-semibold text-[var(--text-secondary)] hover:border-[var(--brand)] hover:text-[var(--brand)]">
          <Edit3 className="h-3.5 w-3.5" />编辑
        </button>
        <button
          type="button"
          disabled={isActive}
          onClick={(event) => { event.stopPropagation(); onEnable(model); }}
          className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg border border-[var(--border)] px-1.5 py-1.5 text-[11px] font-semibold text-[var(--text-secondary)] hover:border-[var(--brand)] hover:text-[var(--brand)] disabled:cursor-default disabled:opacity-40 disabled:hover:border-[var(--border)] disabled:hover:text-[var(--text-secondary)]"
        >
          {isActive ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Power className="h-3.5 w-3.5" />}
          {isActive ? '已启用' : '启用'}
        </button>
        <button type="button" onClick={(event) => { event.stopPropagation(); onExportOne(model); }} className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg border border-[var(--border)] px-1.5 py-1.5 text-[11px] font-semibold text-[var(--text-secondary)] hover:border-[var(--brand)] hover:text-[var(--brand)]">
          <Download className="h-3.5 w-3.5" />导出
        </button>
        <button type="button" onClick={(event) => { event.stopPropagation(); onRequestDelete(model); }} className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg border border-rose-200 px-1.5 py-1.5 text-[11px] font-semibold text-rose-600 hover:bg-rose-50 dark:border-rose-500/30 dark:text-rose-300 dark:hover:bg-rose-500/10">
          <Trash2 className="h-3.5 w-3.5" />删除
        </button>
      </div>
    </article>
  );
}
