/**
 * ModelCard — 列表行：勾选、摘要指标、底栏操作。
 */
import {
  Bot, Star, CheckCircle2, Download, Trash2, Power,
} from 'lucide-react';
import {
  AdminListActions, AdminListIdentity, AdminListMetric, AdminListMetrics, AdminListRow,
  adminListActionBtn, adminListDangerBtn,
} from '@/components/feedback/AdminListRow';
import type { Model } from '../schema';
import { STATUS_BADGE, TIER_LABEL, TASK_LABEL, formatPrice } from './constants';

interface ModelCardProps {
  model: Model;
  selected: boolean;
  onToggleSelect: (id: string) => void;
  onSelect: (m: Model) => void;
  onToggleStar: (id: string) => void;
  onEnable: (m: Model) => void;
  onExportOne: (m: Model) => void;
  onRequestDelete: (m: Model) => void;
}

export function ModelCard({
  model, selected, onToggleSelect, onSelect, onToggleStar,
  onEnable, onExportOne, onRequestDelete,
}: ModelCardProps) {
  const badge = STATUS_BADGE[model.status];
  const isActive = model.status === 'active';

  return (
    <AdminListRow selected={selected}>
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
        className="absolute inset-0 z-0 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--brand)]"
      />

      <button
        type="button"
        aria-label={selected ? '取消选择' : '选择模型'}
        aria-pressed={selected}
        onClick={(event) => { event.stopPropagation(); onToggleSelect(model.id); }}
        className={`relative z-10 grid h-7 w-7 place-items-center rounded-md border ${selected ? 'border-[var(--brand)] bg-[var(--brand)] text-white' : 'border-[var(--border-strong)] bg-[var(--surface-1)] text-transparent hover:border-[var(--brand)]'}`}
      >
        {selected && <CheckCircle2 className="h-3 w-3" />}
      </button>

      <AdminListIdentity>
        <div className="flex min-w-0 items-center gap-1.5">
          <Bot className="h-3.5 w-3.5 shrink-0 text-[var(--brand)]" />
          <h4 className="truncate text-sm font-semibold group-hover:text-[var(--brand)]">{model.name}</h4>
          <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${badge.className}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${badge.dot}`} aria-hidden="true" />{badge.label}
          </span>
          <span className="hidden shrink-0 rounded-full bg-[var(--bg-elevated)] px-2 py-0.5 text-[10px] font-medium sm:inline">{TIER_LABEL[model.tier]}</span>
        </div>
        <p className="mt-0.5 truncate text-[11px] text-[var(--text-muted)]">{model.providerName} · {model.description}</p>
      </AdminListIdentity>

      <button
        type="button"
        aria-label={model.starred ? '取消收藏' : '收藏模型'}
        onClick={(event) => { event.stopPropagation(); onToggleStar(model.id); }}
        className={`relative z-10 grid h-7 w-7 place-items-center rounded-lg ${model.starred ? 'text-amber-500' : 'text-[var(--text-muted)] hover:text-amber-500'}`}
      >
        <Star className={`h-4 w-4 ${model.starred ? 'fill-current' : ''}`} />
      </button>

      <AdminListMetrics cols={4}>
        <AdminListMetric>{model.calls.toLocaleString('zh-CN')} 次</AdminListMetric>
        <AdminListMetric>{formatPrice(model.priceIn, 'in')}/k</AdminListMetric>
        <AdminListMetric>{model.latencyMs ? `${model.latencyMs}ms` : '—'}</AdminListMetric>
        <AdminListMetric>{TASK_LABEL[model.task[0]] ?? '—'}</AdminListMetric>
      </AdminListMetrics>

      <AdminListActions>
        <button type="button" disabled={isActive} onClick={(event) => { event.stopPropagation(); onEnable(model); }} className={adminListActionBtn}>
          {isActive ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Power className="h-3.5 w-3.5" />}
          {isActive ? '已启用' : '启用'}
        </button>
        <button type="button" onClick={(event) => { event.stopPropagation(); onExportOne(model); }} className={adminListActionBtn}>
          <Download className="h-3.5 w-3.5" />导出
        </button>
        <button type="button" onClick={(event) => { event.stopPropagation(); onRequestDelete(model); }} className={adminListDangerBtn}>
          <Trash2 className="h-3.5 w-3.5" />删除
        </button>
      </AdminListActions>
    </AdminListRow>
  );
}
