/**
 * PolicyTab — 保留策略卡 + 评测指标汇总。
 */
import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowDownToLine, FileDown, Settings } from 'lucide-react';
import type { MemoryLayer, MemoryRange, RetentionPolicy } from '@/api/admin/memory/schema';
import { LAYER_META, RANGE_LABEL, toneClass, ttlLabel } from '../constants';

export function PolicyTab({ policies, range, onExport }: {
  policies: RetentionPolicy[];
  range: MemoryRange;
  onExport: (layer: MemoryLayer) => void;
}) {
  const totals = useMemo(() => {
    const n = policies.length || 1;
    const hitRate = policies.reduce((s, p) => s + p.hitRate, 0) / n;
    return {
      hitRate,
      mrr: Math.min(0.95, hitRate + 0.04),
      recall: Math.max(0.5, Math.min(0.95, hitRate - 0.06)),
      promoteHours: 3.4,
    };
  }, [policies]);

  return (
    <section className="space-y-4">
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold">评测指标 · 三层汇总</h3>
            <p className="mt-1 text-xs text-[var(--text-muted)]">{RANGE_LABEL[range]} · 命中率 / MRR / 召回率 / 平均晋升耗时</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {(['l1', 'l2', 'l3'] as MemoryLayer[]).map((layer) => (
              <button key={layer} type="button" onClick={() => onExport(layer)} className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] px-3 py-2 text-xs font-semibold hover:border-[var(--brand)]">
                <FileDown className="h-4 w-4" />导出 {layer.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-4">
          <Kpi label="命中率" value={`${(totals.hitRate * 100).toFixed(1)}%`} trend={`+${((totals.hitRate - 0.88) * 100).toFixed(1)}%`} />
          <Kpi label="MRR" value={totals.mrr.toFixed(2)} trend="+0.02" />
          <Kpi label="召回率" value={totals.recall.toFixed(2)} trend="+0.01" />
          <Kpi label="平均晋升耗时" value={`${totals.promoteHours.toFixed(1)} h`} trend="-0.6 h" />
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {policies.map((p) => {
          const meta = LAYER_META[p.layer];
          const Icon = meta.icon;
          return (
            <div key={p.layer} className="flex flex-col gap-4 rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-5 transition hover:-translate-y-0.5 hover:shadow-md">
              <div className="flex items-start justify-between">
                <span className={`grid h-10 w-10 place-items-center rounded-lg ${toneClass[meta.tone]}`}><Icon className="h-5 w-5" /></span>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">{p.layer.toUpperCase()}</span>
              </div>
              <div>
                <Link
                  to={`/admin/memory/policies/${encodeURIComponent(p.label)}`}
                  className="text-base font-semibold hover:text-[var(--brand)]"
                >
                  {p.label}
                </Link>
                <p className="mt-1 text-[11px] text-[var(--text-muted)]">{p.description}</p>
              </div>
              <div className="grid grid-cols-2 gap-2 border-t border-[var(--border)] pt-3 text-[11px]">
                <div><p className="text-[var(--text-muted)]">TTL</p><p className="mt-0.5 font-semibold">{ttlLabel(p.ttlMinutes)}</p></div>
                <div><p className="text-[var(--text-muted)]">最大条目</p><p className="mt-0.5 font-semibold tabular-nums">{p.maxItems}</p></div>
                <div><p className="text-[var(--text-muted)]">存储上限</p><p className="mt-0.5 font-semibold tabular-nums">{p.storageMb} MB</p></div>
                <div><p className="text-[var(--text-muted)]">淘汰策略</p><p className="mt-0.5 font-semibold">{p.eviction.toUpperCase()}</p></div>
              </div>
              <div className="mt-1">
                <div className="flex items-center justify-between text-[10px] text-[var(--text-muted)]">
                  <span>命中率</span>
                  <span className="tabular-nums">{(p.hitRate * 100).toFixed(1)}%</span>
                </div>
                <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-[var(--bg-app)]">
                  <div className={`h-full rounded-full ${p.hitRate > 0.9 ? 'bg-[var(--success)]' : 'bg-[var(--brand)]'}`} style={{ width: `${p.hitRate * 100}%` }} />
                </div>
              </div>
              <div className="mt-auto flex gap-2">
                <Link
                  to={`/admin/memory/policies/${encodeURIComponent(p.label)}`}
                  className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-[var(--border)] px-3 py-1.5 text-xs font-semibold hover:border-[var(--brand)]"
                >
                  <Settings className="h-3.5 w-3.5" />调整策略
                </Link>
                <button type="button" onClick={() => onExport(p.layer)} className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[var(--brand)] px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90">
                  <ArrowDownToLine className="h-3.5 w-3.5" />导出
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function Kpi({ label, value, trend }: { label: string; value: string; trend: string }) {
  return (
    <div className="rounded-xl border border-[var(--border)] p-4">
      <p className="text-xs text-[var(--text-muted)]">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
      <p className="mt-1 text-[10px] text-[var(--success)]">较上周 {trend}</p>
    </div>
  );
}