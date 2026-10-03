/**
 * BudgetCard — 列表行。
 */
import { CheckCircle2, CircleDot, Download, Snowflake } from 'lucide-react';
import {
  AdminListActions, AdminListIdentity, AdminListRow, ADMIN_LIST_METRICS_W,
  adminListActionBtn,
} from '@/components/feedback/AdminListRow';
import type { EnterpriseBudget } from '../schema';
import { BUDGET_BADGE, PERIOD_LABEL } from './constants';
import { ProgressBar } from './Primitives';

interface BudgetCardProps {
  budget: EnterpriseBudget;
  selected: boolean;
  onToggleSelect: (id: string) => void;
  onSelect: (b: EnterpriseBudget) => void;
  onFreeze: (b: EnterpriseBudget) => void;
  onExportOne: (b: EnterpriseBudget) => void;
}

export function BudgetCard({
  budget, selected, onToggleSelect, onSelect, onFreeze, onExportOne,
}: BudgetCardProps) {
  const badge = BUDGET_BADGE[budget.status];
  const pct = Math.round((budget.used / budget.totalCap) * 100);
  const tone = budget.status === 'exceeded' ? 'rose' : budget.status === 'warning' ? 'amber' : budget.status === 'frozen' ? 'emerald' : 'violet';
  const isFrozen = budget.status === 'frozen';

  return (
    <AdminListRow selected={selected} hasStar={false}>
      <div
        role="button"
        tabIndex={0}
        onClick={() => onSelect(budget)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onSelect(budget);
          }
        }}
        aria-label={`查看预算 ${budget.name}`}
        className="absolute inset-0 z-0 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--brand)]"
      />

      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onToggleSelect(budget.id); }}
        aria-label={selected ? `取消选择预算 ${budget.id}` : `选择预算 ${budget.id}`}
        aria-pressed={selected}
        className={`relative z-10 grid h-7 w-7 place-items-center rounded-lg ${selected ? 'bg-[var(--brand-light)] text-[var(--brand)]' : 'text-[var(--text-muted)] hover:bg-[var(--bg-hover)]'}`}
      >
        {selected ? <CheckCircle2 className="h-4 w-4" /> : <CircleDot className="h-4 w-4" />}
      </button>

      <AdminListIdentity>
        <div className="flex min-w-0 items-center gap-1.5">
          <h3 className="truncate text-sm font-semibold group-hover:text-[var(--brand)]">{budget.name}</h3>
          <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold ${badge.className}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${badge.dot}`} aria-hidden="true" />{badge.label}
          </span>
          <span className="hidden shrink-0 rounded-full bg-[var(--bg-elevated)] px-2 py-0.5 text-[10px] font-medium sm:inline">{PERIOD_LABEL[budget.period]}</span>
        </div>
        <p className="mt-0.5 truncate text-[11px] text-[var(--text-muted)]">{budget.description}</p>
      </AdminListIdentity>

      <div className={`pointer-events-none relative z-10 hidden ${ADMIN_LIST_METRICS_W} xl:block`}>
        <ProgressBar used={budget.used} total={budget.totalCap} tone={tone} />
        <p className="mt-1 text-right text-[10px] tabular-nums text-[var(--text-muted)]">
          ¥ {budget.used.toLocaleString('zh-CN')} / {budget.totalCap.toLocaleString('zh-CN')} · {pct}%
        </p>
      </div>

      <AdminListActions>
        <button type="button" disabled={isFrozen} onClick={(e) => { e.stopPropagation(); onFreeze(budget); }} className={adminListActionBtn}>
          <Snowflake className="h-3.5 w-3.5" />{isFrozen ? '已冻结' : '冻结'}
        </button>
        <button type="button" onClick={(e) => { e.stopPropagation(); onExportOne(budget); }} className={adminListActionBtn}>
          <Download className="h-3.5 w-3.5" />导出
        </button>
      </AdminListActions>
    </AdminListRow>
  );
}
