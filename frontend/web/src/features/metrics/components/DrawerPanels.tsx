/**
 * DrawerPanels — 4 sub-panel:overview / breakdown / trend / alert。
 */
import type {
  CostBreakdown, LatencyPoint, ModelMetric, ThresholdRule,
} from '../schema';
import { LatencyChart } from './Primitives';
import { SEVERITY_META, PERCENTILES } from './constants';

export function OverviewPanel({ model }: { model: ModelMetric }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 text-sm">
        <Field label="可用率" value={`${model.availability.toFixed(2)}%`} />
        <Field label="错误率" value={`${model.errorRate}%`} />
        <Field label="P50" value={`${model.p50}ms`} />
        <Field label="P95" value={`${model.p95}ms`} />
        <Field label="P99" value={`${model.p99}ms`} />
        <Field label="调用次数" value={model.calls.toLocaleString('zh-CN')} />
      </div>
      <div className="grid grid-cols-2 gap-3 border-t border-[var(--border)] pt-4">
        <Field label="输入 Token" value={`${(model.tokensIn / 1_000_000).toFixed(2)}M`} />
        <Field label="输出 Token" value={`${(model.tokensOut / 1_000_000).toFixed(2)}M`} />
      </div>
    </div>
  );
}

export function BreakdownPanel({ model, breakdown }: { model: ModelMetric; breakdown: CostBreakdown[] }) {
  const total = breakdown.reduce((s, b) => s + b.amount, 0);
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-sm">
        <span className="text-[var(--text-muted)]">{model.model} 成本占比</span>
        <span className="font-semibold tabular-nums">¥ {total.toLocaleString('zh-CN')}</span>
      </div>
      <div className="space-y-2">
        {breakdown.map((b) => (
          <div key={b.id} className="flex items-center gap-2 text-xs">
            <div className="w-32 truncate text-[var(--text-secondary)]">{b.bucket}</div>
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-[var(--bg-elevated)]">
              <div className="h-full bg-[var(--brand)]" style={{ width: `${b.pct}%` }} />
            </div>
            <div className="w-12 text-right font-medium tabular-nums text-[var(--text-secondary)]">{b.pct}%</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function TrendPanel({ points }: { points: LatencyPoint[] }) {
  return (
    <div className="space-y-4">
      {PERCENTILES.map((p) => (
        <div key={p.id} className="rounded-2xl border border-[var(--border)] p-3">
          <div className="mb-2 flex items-center justify-between text-xs">
            <span className="font-semibold text-[var(--text-secondary)]">{p.label} 曲线</span>
            <span className="text-[var(--text-muted)]">{points.length} 个采样点</span>
          </div>
          <LatencyChart data={points} metric={p.id} />
        </div>
      ))}
    </div>
  );
}

export function AlertPanel({ model, rules }: { model: ModelMetric; rules: ThresholdRule[] }) {
  const matched = rules.filter((r) => {
    if (!r.enabled) return false;
    if (r.metric === 'availability') return r.comparator === '<' ? model.availability < r.value : model.availability > r.value;
    if (r.metric === 'error_rate') return r.comparator === '>' ? model.errorRate > r.value : model.errorRate < r.value;
    if (r.metric === 'p95_latency') return r.comparator === '>' ? model.p95 > r.value : model.p95 < r.value;
    return false;
  });
  if (matched.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-[var(--border-strong)] p-6 text-center text-sm text-[var(--text-muted)]">
        当前模型未触发任何告警阈值
      </div>
    );
  }
  return (
    <div className="space-y-2">
      {matched.map((r) => {
        const meta = SEVERITY_META[r.severity];
        return (
          <div key={r.id} className="flex items-center justify-between rounded-2xl border border-[var(--border)] px-4 py-2.5">
            <div className="flex items-center gap-2">
              <span className={`h-2 w-2 rounded-full ${meta.dot}`} />
              <span className="text-sm">
                {r.metric} {r.comparator} {r.value}
              </span>
            </div>
            <span className={`text-xs ${meta.className}`}>
              {meta.label} · {r.window}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-[var(--text-muted)]">{label}</div>
      <div className="mt-0.5 font-medium tabular-nums">{value}</div>
    </div>
  );
}