import { CheckCircle2, CircleDot } from 'lucide-react';
import type { EnterpriseBudget } from '@/api/admin/quotas/schema';
import { BUDGET_BADGE, PERIOD_LABEL } from './constants';
import { ProgressBar } from './Primitives';

export function BudgetCard({ budget, selected, onToggleSelect, onSelect }: {
  budget: EnterpriseBudget;
  selected: boolean;
  onToggleSelect: (id: string) => void;
  onSelect: (b: EnterpriseBudget) => void;
}) {
  const badge = BUDGET_BADGE[budget.status];
  const pct = Math.round((budget.used / budget.totalCap) * 100);
  const tone = budget.status === 'exceeded' ? 'rose' : budget.status === 'warning' ? 'amber' : budget.status === 'frozen' ? 'emerald' : 'violet';
  return (
    <article className={`group relative rounded-2xl border bg-[var(--surface-1)] p-5 transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-sm)] ${selected ? 'border-[var(--brand)] shadow-[var(--shadow-sm)]' : 'border-[var(--border)] hover:border-[var(--brand)]'}`}>
      <div role="button" tabIndex={0} onClick={() => onSelect(budget)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(budget); } }} aria-label={`查看预算 ${budget.name}`} className="absolute inset-0 z-0 cursor-pointer rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)]" />
      <div className="relative z-10 flex items-start gap-2">
        <button type="button" onClick={(e) => { e.stopPropagation(); onToggleSelect(budget.id); }} aria-label={selected ? `取消选择预算 ${budget.id}` : `选择预算 ${budget.id}`} aria-pressed={selected} className={`grid h-9 w-9 place-items-center rounded-lg transition ${selected ? 'bg-[var(--brand-light)] text-[var(--brand)]' : 'text-[var(--text-muted)] hover:bg-[var(--bg-hover)]'}`}>
          {selected ? <CheckCircle2 className="h-4 w-4" /> : <CircleDot className="h-4 w-4" />}
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold">{budget.name}</h3>
            <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold ${badge.className}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${badge.dot}`} aria-hidden="true" />{badge.label}
            </span>
            <span className="rounded-full bg-[var(--bg-elevated)] px-2 py-0.5 text-[10px] font-medium">{PERIOD_LABEL[budget.period]}</span>
          </div>
          <p className="mt-1.5 line-clamp-2 text-[11px] leading-5 text-[var(--text-muted)]">{budget.description}</p>
          <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] sm:grid-cols-3">
            <div><span className="text-[var(--text-muted)]">总预算</span><br /><span className="font-semibold tabular-nums">¥ {budget.totalCap.toLocaleString('zh-CN')}</span></div>
            <div><span className="text-[var(--text-muted)]">已用</span><br /><span className="font-semibold tabular-nums">¥ {budget.used.toLocaleString('zh-CN')}</span></div>
            <div><span className="text-[var(--text-muted)]">预测</span><br /><span className="font-semibold tabular-nums">¥ {budget.forecast.toLocaleString('zh-CN')}</span></div>
          </div>
          <div className="mt-3">
            <ProgressBar used={budget.used} total={budget.totalCap} tone={tone} />
            <div className="mt-1 flex items-center justify-between text-[10px] text-[var(--text-muted)]">
              <span>使用率</span>
              <span className="font-semibold tabular-nums">{pct}%</span>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}