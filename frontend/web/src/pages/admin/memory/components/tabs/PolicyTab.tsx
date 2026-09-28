/**
 * PolicyTab — 保留策略卡 + 评测指标汇总。
 */
import { ArrowDownToLine, FileDown, Settings } from 'lucide-react';
import type { MemoryLayer, MemoryRange, RetentionPolicy } from '@/api/admin/memory/schema';
import { LAYER_META, RANGE_LABEL, toneClass, ttlLabel } from '../constants';

export function PolicyTab({ policies, range, onExport }: {
  policies: RetentionPolicy[];
  range: MemoryRange;
  onExport: (layer: MemoryLayer) => void;
}) {
  return (
    <section className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        {policies.map((p) => {
          const meta = LAYER_META[p.layer];
          const Icon = meta.icon;
          return (
            <div key={p.layer} className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-start justify-between">
                <span className={`grid h-10 w-10 place-items-center rounded-lg ${toneClass[meta.tone]}`}><Icon className="h-5 w-5" /></span>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">{p.layer.toUpperCase()}</span>
              </div>
              <div>
                <h4 className="text-base font-semibold">{p.label}</h4>
                <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">{p.description}</p>
              </div>
              <div className="grid grid-cols-2 gap-2 border-t border-slate-200 pt-3 text-[11px] dark:border-slate-800">
                <div><p className="text-slate-500 dark:text-slate-400">TTL</p><p className="mt-0.5 font-semibold">{ttlLabel(p.ttlMinutes)}</p></div>
                <div><p className="text-slate-500 dark:text-slate-400">最大条目</p><p className="mt-0.5 font-semibold tabular-nums">{p.maxItems}</p></div>
                <div><p className="text-slate-500 dark:text-slate-400">存储上限</p><p className="mt-0.5 font-semibold tabular-nums">{p.storageMb} MB</p></div>
                <div><p className="text-slate-500 dark:text-slate-400">淘汰策略</p><p className="mt-0.5 font-semibold">{p.eviction.toUpperCase()}</p></div>
              </div>
              <div className="mt-1">
                <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400"><span>命中率</span><span className="tabular-nums">{(p.hitRate * 100).toFixed(1)}%</span></div>
                <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                  <div className={`h-full rounded-full ${p.hitRate > 0.9 ? 'bg-emerald-500' : 'bg-blue-500'}`} style={{ width: `${p.hitRate * 100}%` }} />
                </div>
              </div>
              <div className="mt-auto flex gap-2">
                <button type="button" className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold hover:border-blue-400 dark:border-slate-700">
                  <Settings className="h-3.5 w-3.5" />调整策略
                </button>
                <button type="button" onClick={() => onExport(p.layer)} className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700">
                  <ArrowDownToLine className="h-3.5 w-3.5" />导出
                </button>
              </div>
            </div>
          );
        })}
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold">评测指标 · 三层汇总</h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{RANGE_LABEL[range]} · 命中率 / MRR / 召回率 / 平均晋升耗时</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {(['l1', 'l2', 'l3'] as MemoryLayer[]).map((layer) => (
              <button key={layer} type="button" onClick={() => onExport(layer)} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold hover:border-blue-400 dark:border-slate-700">
                <FileDown className="h-4 w-4" />导出 {layer.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-4">
          <Kpi label="命中率" value="91.3%" trend="+1.2%" />
          <Kpi label="MRR" value="0.82" trend="+0.02" />
          <Kpi label="召回率" value="0.78" trend="+0.01" />
          <Kpi label="平均晋升耗时" value="3.4 h" trend="-0.6 h" />
        </div>
      </div>
    </section>
  );
}

function Kpi({ label, value, trend }: { label: string; value: string; trend: string }) {
  return (
    <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
      <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
      <p className="mt-1 text-[10px] text-emerald-600 dark:text-emerald-300">较上周 {trend}</p>
    </div>
  );
}