/**
 * AvailabilityTab — 模型可用率明细(按可用率排序)。
 */
import { useMemo, useState } from 'react';
import type { ModelMetric } from '@/api/admin/metrics/schema';
import { SEVERITY_META } from '../constants';

export function AvailabilityTab({ models, onSelect }: { models: ModelMetric[]; onSelect: (id: string) => void }) {
  const [sort, setSort] = useState<'asc' | 'desc'>('asc');
  const sorted = useMemo(
    () => [...models].sort((a, b) => (sort === 'asc' ? a.availability - b.availability : b.availability - a.availability)),
    [models, sort],
  );
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm text-[var(--text-secondary)]">{models.length} 个模型</div>
        <button
          type="button"
          onClick={() => setSort((s) => (s === 'asc' ? 'desc' : 'asc'))}
          className="inline-flex items-center rounded-xl border border-[var(--border)] px-3 py-1 text-xs font-semibold text-[var(--text-secondary)] hover:border-[var(--brand)] hover:text-[var(--brand)]"
        >
          {sort === 'asc' ? '可用率 ↑' : '可用率 ↓'}
        </button>
      </div>
      <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface-1)]">
        <table className="w-full text-sm">
          <thead className="bg-[var(--bg-elevated)] text-[10px] uppercase tracking-wide text-[var(--text-muted)]">
            <tr className="text-left">
              <th className="px-4 py-2.5">模型</th>
              <th className="px-4 py-2.5">Provider</th>
              <th className="px-4 py-2.5">可用率</th>
              <th className="px-4 py-2.5">错误率</th>
              <th className="px-4 py-2.5">状态</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {sorted.map((m) => {
              const sev = m.availability < 99.5 ? 'bad' : m.availability < 99.8 ? 'warn' : 'good';
              const meta = SEVERITY_META[sev];
              return (
                <tr
                  key={m.id}
                  onClick={() => onSelect(m.id)}
                  className="cursor-pointer transition hover:bg-[var(--bg-hover)]"
                >
                  <td className="px-4 py-3 font-medium">{m.model}</td>
                  <td className="px-4 py-3 text-[var(--text-secondary)]">{m.provider}</td>
                  <td className="px-4 py-3 font-mono tabular-nums">{m.availability.toFixed(2)}%</td>
                  <td className="px-4 py-3 font-mono tabular-nums">{m.errorRate}%</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium ${meta.className}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
                      {meta.label}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}