/**
 * TokenTab — Token & 成本:模型明细 + 占比图。
 */
import { Hash } from 'lucide-react';
import type { CostBreakdown, ModelMetric } from '../../schema';

export function TokenTab({ models, breakdown }: { models: ModelMetric[]; breakdown: CostBreakdown[] }) {
  return (
    <div className="space-y-6">
      <section>
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
          <Hash className="h-5 w-5 text-[var(--brand)]" />
          模型 Token & 成本
        </div>
        <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface-1)]">
          <table className="w-full text-sm">
            <thead className="bg-[var(--bg-elevated)] text-[10px] uppercase tracking-wide text-[var(--text-muted)]">
              <tr className="text-left">
                <th className="px-4 py-2.5">模型</th>
                <th className="px-4 py-2.5 text-right">输入 Token</th>
                <th className="px-4 py-2.5 text-right">输出 Token</th>
                <th className="px-4 py-2.5 text-right">成本</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {models.map((m) => (
                <tr key={m.id} className="transition hover:bg-[var(--bg-hover)]">
                  <td className="px-4 py-3 font-medium">{m.model}</td>
                  <td className="px-4 py-3 text-right font-mono tabular-nums">{(m.tokensIn / 1_000_000).toFixed(2)}M</td>
                  <td className="px-4 py-3 text-right font-mono tabular-nums">{(m.tokensOut / 1_000_000).toFixed(2)}M</td>
                  <td className="px-4 py-3 text-right font-mono tabular-nums">¥ {m.cost.toLocaleString('zh-CN')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <section>
        <div className="mb-3 text-sm font-semibold">成本占比</div>
        <div className="space-y-1.5 rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-5">
          {breakdown.map((b) => (
            <div key={b.id} className="flex items-center gap-2 text-xs">
              <div className="w-32 truncate text-[var(--text-secondary)]">{b.bucket}</div>
              <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-[var(--bg-elevated)]">
                <div className="h-full bg-[var(--brand)]" style={{ width: `${b.pct}%` }} />
              </div>
              <div className="w-16 text-right font-medium tabular-nums text-[var(--text-secondary)]">¥ {b.amount.toLocaleString('zh-CN')}</div>
              <div className="w-10 text-right text-[var(--text-muted)]">{b.pct}%</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}