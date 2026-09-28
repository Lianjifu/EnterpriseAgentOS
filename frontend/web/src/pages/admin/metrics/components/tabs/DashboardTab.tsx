/**
 * DashboardTab — 看板清单 + 阈值规则管理。
 */
import { Plus, Star } from 'lucide-react';
import type { MetricsDashboard, MetricsTimeRange, ThresholdRule } from '@/api/admin/metrics/schema';
import { SEVERITY_META, TIME_RANGES } from '../constants';

const RANGE_LABEL = Object.fromEntries(TIME_RANGES.map((r) => [r.id, r.label])) as Record<MetricsTimeRange, string>;

export function DashboardTab({ dashboards, rules, pickedIds, onTogglePick, onToggleStar, onCreate, onToggleRule }: {
  dashboards: MetricsDashboard[];
  rules: ThresholdRule[];
  pickedIds: Set<string>;
  onTogglePick: (id: string) => void;
  onToggleStar: (id: string) => void;
  onCreate: () => void;
  onToggleRule: (id: string) => void;
}) {
  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface-1)]">
        <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4">
          <h3 className="text-base font-semibold">指标看板</h3>
          <button
            type="button"
            onClick={onCreate}
            className="inline-flex items-center gap-2 rounded-xl bg-[var(--brand)] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[var(--brand-hover)]"
          >
            <Plus className="h-4 w-4" />
            新建看板
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[var(--bg-elevated)] text-[10px] uppercase tracking-wide text-[var(--text-muted)]">
              <tr className="text-left">
                <th className="w-8 px-3 py-2.5"></th>
                <th className="px-3 py-2.5">看板</th>
                <th className="px-3 py-2.5">范围</th>
                <th className="px-3 py-2.5">面板数</th>
                <th className="px-3 py-2.5">负责人</th>
                <th className="w-10 px-3 py-2.5"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {dashboards.map((d) => (
                <tr key={d.id} className="transition hover:bg-[var(--bg-hover)]">
                  <td className="px-3 py-2.5 text-center">
                    <input
                      type="checkbox"
                      checked={pickedIds.has(d.id)}
                      onChange={() => onTogglePick(d.id)}
                      className="h-4 w-4 rounded border-[var(--border-strong)] text-[var(--brand)] focus:ring-[var(--brand)]"
                      aria-label={`选择 ${d.name}`}
                    />
                  </td>
                  <td className="px-3 py-2.5 font-medium">{d.name}</td>
                  <td className="px-3 py-2.5 text-[var(--text-secondary)]">{RANGE_LABEL[d.range]}</td>
                  <td className="px-3 py-2.5 font-mono tabular-nums">{d.panels}</td>
                  <td className="px-3 py-2.5 text-[var(--text-secondary)]">{d.owner}</td>
                  <td className="px-3 py-2.5 text-center">
                    <button
                      type="button"
                      onClick={() => onToggleStar(d.id)}
                      className="rounded-md p-1 hover:bg-[var(--bg-hover)]"
                      aria-label={d.starred ? '取消收藏' : '收藏'}
                    >
                      <Star className={`h-4 w-4 ${d.starred ? 'fill-amber-400 text-amber-500' : 'text-[var(--text-muted)]'}`} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <section className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface-1)]">
        <div className="border-b border-[var(--border)] px-5 py-4">
          <h3 className="text-base font-semibold">告警阈值规则</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[var(--bg-elevated)] text-[10px] uppercase tracking-wide text-[var(--text-muted)]">
              <tr className="text-left">
                <th className="px-3 py-2.5">指标</th>
                <th className="px-3 py-2.5">条件</th>
                <th className="px-3 py-2.5">阈值</th>
                <th className="px-3 py-2.5">严重度</th>
                <th className="px-3 py-2.5 text-right">命中</th>
                <th className="px-3 py-2.5 text-right">窗口</th>
                <th className="px-3 py-2.5 text-center">启用</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {rules.map((r) => {
                const meta = SEVERITY_META[r.severity];
                return (
                  <tr key={r.id} className="transition hover:bg-[var(--bg-hover)]">
                    <td className="px-3 py-2.5 font-medium">{r.metric}</td>
                    <td className="px-3 py-2.5 font-mono">{r.comparator}</td>
                    <td className="px-3 py-2.5 font-mono tabular-nums">{r.value}</td>
                    <td className="px-3 py-2.5">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium ${meta.className}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
                        {meta.label}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono tabular-nums">{r.hitCount}</td>
                    <td className="px-3 py-2.5 text-right text-[var(--text-muted)]">{r.window}</td>
                    <td className="px-3 py-2.5 text-center">
                      <button
                        type="button"
                        onClick={() => onToggleRule(r.id)}
                        aria-pressed={r.enabled}
                        aria-label={r.enabled ? '停用' : '启用'}
                        className={`relative h-5 w-9 rounded-full transition ${r.enabled ? 'bg-[var(--brand)]' : 'bg-[var(--bg-elevated)]'}`}
                      >
                        <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition ${r.enabled ? 'left-4' : 'left-0.5'}`} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}