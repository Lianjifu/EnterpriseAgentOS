/**
 * OverviewTab — 4 KPI + 模型分布 + 成本 Top。
 */
import type {
  CostBreakdown, ModelMetric,
} from '../../schema';
import { ModelCard } from '../ModelCard';
import { useMetricsStats } from '../../useMetrics';

export function OverviewTab({ models, breakdown, onSelect }: {
  models: ModelMetric[]; breakdown: CostBreakdown[]; onSelect: (id: string) => void;
}) {
  const stats = useMetricsStats(models);
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Kpi label="平均可用率" value={`${stats.avgAvail.toFixed(2)}%`} hint={`共 ${models.length} 个模型`} />
        <Kpi label="平均 P95" value={`${stats.avgP95}ms`} hint="近 24 小时" />
        <Kpi label="Token 总量" value={`${(stats.totalTokens / 1_000_000).toFixed(2)}M`} hint={`进 ${(stats.totalInputTokens / 1_000_000).toFixed(2)}M · 出 ${(stats.totalOutputTokens / 1_000_000).toFixed(2)}M`} />
        <Kpi label="成本合计" value={`¥ ${stats.totalCost.toLocaleString('zh-CN')}`} hint="近 24 小时" />
      </div>
      <section>
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold">模型健康度</div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {models.map((m) => (
            <ModelCard key={m.id} model={m} onSelect={(item) => onSelect(item.id)} onExportOne={() => {}} />
          ))}
        </div>
      </section>
      <section>
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold">成本 Top</div>
        <div className="space-y-2 rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-5">
          {breakdown.map((b) => (
            <div key={b.id} className="flex items-center gap-2 text-xs">
              <div className="w-32 truncate text-[var(--text-secondary)]">{b.bucket}</div>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-[var(--bg-elevated)]">
                <div className="h-full bg-[var(--brand)]" style={{ width: `${b.pct}%` }} />
              </div>
              <div className="w-16 text-right font-medium tabular-nums text-[var(--text-secondary)]">¥ {b.amount.toLocaleString('zh-CN')}</div>
              <div className="w-12 text-right text-[var(--text-muted)]">{b.pct}%</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function Kpi({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-4">
      <div className="text-xs text-[var(--text-muted)]">{label}</div>
      <div className="mt-1 text-2xl font-semibold tabular-nums">{value}</div>
      <div className="mt-1 text-[11px] text-[var(--text-muted)]">{hint}</div>
    </div>
  );
}