/**
 * LatencyTab — 三分位曲线 + 模型 P95 排行。
 */
import { useState } from 'react';
import { LineChart } from 'lucide-react';
import type { LatencyPoint, ModelMetric } from '../../schema';
import { LatencyChart } from '../Primitives';
import { PERCENTILES } from '../constants';

export function LatencyTab({ latency, models, onSelect }: {
  latency: LatencyPoint[]; models: ModelMetric[]; onSelect: (id: string) => void;
}) {
  const [metric, setMetric] = useState<'p50' | 'p95' | 'p99'>('p95');
  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-5 sm:p-7">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <LineChart className="h-5 w-5 text-[var(--brand)]" />
            延迟曲线
          </div>
          <div className="flex gap-1 rounded-xl border border-[var(--border)] p-0.5">
            {PERCENTILES.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setMetric(p.id)}
                aria-pressed={metric === p.id}
                className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${metric === p.id ? 'bg-[var(--brand-light)] text-[var(--brand)]' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'}`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
        <LatencyChart data={latency} metric={metric} />
      </section>
      <section>
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold">模型 P95 排行</div>
        <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface-1)]">
          <table className="w-full text-sm">
            <thead className="bg-[var(--bg-elevated)] text-[10px] uppercase tracking-wide text-[var(--text-muted)]">
              <tr className="text-left">
                <th className="px-4 py-2.5">模型</th>
                <th className="px-4 py-2.5 text-right">P50</th>
                <th className="px-4 py-2.5 text-right">P95</th>
                <th className="px-4 py-2.5 text-right">P99</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {[...models].sort((a, b) => a.p95 - b.p95).map((m) => (
                <tr
                  key={m.id}
                  onClick={() => onSelect(m.id)}
                  className="cursor-pointer transition hover:bg-[var(--bg-hover)]"
                >
                  <td className="px-4 py-3 font-medium">{m.model}</td>
                  <td className="px-4 py-3 text-right font-mono tabular-nums">{m.p50}ms</td>
                  <td className="px-4 py-3 text-right font-mono tabular-nums">{m.p95}ms</td>
                  <td className="px-4 py-3 text-right font-mono tabular-nums">{m.p99}ms</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}