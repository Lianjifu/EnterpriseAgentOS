/**
 * ModelCard — 对齐 SkillCard：article + 覆盖层进详情，底栏等权操作。
 */
import { Download, LineChart } from 'lucide-react';
import type { ModelMetric } from '../schema';
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

interface ModelCardProps {
  model: ModelMetric;
  onSelect: (model: ModelMetric) => void;
  onExportOne: (model: ModelMetric) => void;
}

export function ModelCard({ model, onSelect, onExportOne }: ModelCardProps) {
  const sev = severity(model.availability, model.errorRate);
  const meta = SEVERITY_META[sev];
  const sparklineData = Array.from(
    { length: 12 },
    (_, i) => model.p95 - 80 + Math.round(Math.cos(i + model.p95 / 100) * 50),
  );
  return (
    <article
      className="group relative flex flex-col gap-4 rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-5 text-left transition hover:-translate-y-0.5 hover:border-[var(--brand)] hover:shadow-[var(--shadow-sm)]"
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
        aria-label={`查看 ${model.model} 详情`}
        className="absolute inset-0 z-0 cursor-pointer rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)]"
      />
      <div className="pointer-events-none relative z-10 flex items-start justify-between">
        <div>
          <div className="text-sm font-semibold group-hover:text-[var(--brand)]">{model.model}</div>
          <div className="text-xs text-[var(--text-muted)]">{model.provider}</div>
        </div>
        <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium ${meta.className}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
          {meta.label}
        </span>
      </div>
      <div className="pointer-events-none relative z-10 grid grid-cols-3 gap-2 text-xs">
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
      <div className="pointer-events-none relative z-10 flex items-center justify-between">
        <Sparkline data={sparklineData} stroke={SEVERITY_STROKE[sev]} />
        <div className="text-[11px] text-[var(--text-muted)]">{(model.calls / 1000).toFixed(1)}k 调用</div>
      </div>
      <div className="relative z-10 flex gap-1.5 border-t border-[var(--border)] pt-3">
        <button
          type="button"
          onClick={(event) => { event.stopPropagation(); onSelect(model); }}
          className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg border border-[var(--border)] px-1.5 py-1.5 text-[11px] font-semibold text-[var(--text-secondary)] hover:border-[var(--brand)] hover:text-[var(--brand)]"
        >
          <LineChart className="h-3.5 w-3.5" />详情
        </button>
        <button
          type="button"
          onClick={(event) => { event.stopPropagation(); onExportOne(model); }}
          className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg border border-[var(--border)] px-1.5 py-1.5 text-[11px] font-semibold text-[var(--text-secondary)] hover:border-[var(--brand)] hover:text-[var(--brand)]"
        >
          <Download className="h-3.5 w-3.5" />导出
        </button>
      </div>
    </article>
  );
}
