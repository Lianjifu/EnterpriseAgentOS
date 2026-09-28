/**
 * ModelCard — 单模型指标卡,展示 provider/可用率/P95/error。
 */
import type { ModelMetric } from '@/api/admin/metrics/schema';
import { Sparkline } from './Primitives';
import { SEVERITY_META } from './constants';

function severity(availability: number, errorRate: number): 'good' | 'warn' | 'bad' {
  if (availability < 99.5 || errorRate >= 1) return 'bad';
  if (availability < 99.8 || errorRate >= 0.5) return 'warn';
  return 'good';
}

const SEVERITY_STROKE = {
  bad: 'var(--chart-warning)',
  warn: 'var(--chart-warning)',
  good: 'var(--chart-success)',
} as const;

export function ModelCard({ model, selected, onSelect }: {
  model: ModelMetric; selected: boolean; onSelect: () => void;
}) {
  const sev = severity(model.availability, model.errorRate);
  const meta = SEVERITY_META[sev];
  const sparklineData = Array.from(
    { length: 12 },
    (_, i) => model.p95 - 80 + Math.round(Math.cos(i + model.p95 / 100) * 50),
  );
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`group flex w-full flex-col gap-3 rounded-2xl border bg-[var(--surface-1)] p-5 text-left transition hover:-translate-y-0.5 hover:border-[var(--brand)] hover:shadow-[var(--shadow-sm)] ${
        selected ? 'border-[var(--brand)] shadow-[var(--shadow-sm)]' : 'border-[var(--border)]'
      }`}
    >
      <div className="flex items-start justify-between">
        <div>
          <div className="text-sm font-semibold">{model.model}</div>
          <div className="text-xs text-[var(--text-muted)]">{model.provider}</div>
        </div>
        <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium ${meta.className}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
          {meta.label}
        </span>
      </div>
      <div className="grid grid-cols-3 gap-2 text-xs">
        <div>
          <div className="text-[var(--text-muted)]">可用率</div>
          <div className="mt-0.5 font-semibold tabular-nums">{model.availability.toFixed(2)}%</div>
        </div>
        <div>
          <div className="text-[var(--text-muted)]">P95</div>
          <div className="mt-0.5 font-semibold tabular-nums">{model.p95}ms</div>
        </div>
        <div>
          <div className="text-[var(--text-muted)]">错误率</div>
          <div className="mt-0.5 font-semibold tabular-nums">{model.errorRate}%</div>
        </div>
      </div>
      <div className="flex items-center justify-between">
        <Sparkline data={sparklineData} stroke={SEVERITY_STROKE[sev]} />
        <div className="text-[11px] text-[var(--text-muted)]">{(model.calls / 1000).toFixed(1)}k 调用</div>
      </div>
    </button>
  );
}