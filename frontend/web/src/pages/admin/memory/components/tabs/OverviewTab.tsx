/**
 * OverviewTab — 三层职责 + 编排规则 + PromotionFeed。
 */
import { AlertCircle, ChevronRight } from 'lucide-react';
import type {
  L2Fact, MemoryLayer, PromotionEvent, RetentionPolicy,
} from '@/api/admin/memory/schema';
import { LAYER_META, toneClass, ttlLabel } from '../constants';
import { PromotionFeed } from './PromotionFeed';

export function OverviewTab({ promotions, policies, counts, pendingCount, onJump, l2Facts, l3Entries }: {
  promotions: PromotionEvent[];
  policies: RetentionPolicy[];
  counts: { l1: number; l2: number; l3: number; events: number };
  pendingCount: number;
  onJump: (layer: MemoryLayer) => void;
  l2Facts: L2Fact[];
  l3Entries: any;
}) {
  return (
    <section className="grid gap-4 lg:grid-cols-[1fr_360px]">
      <div className="space-y-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 sm:p-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold">三层职责</h3>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">每层独立存储,独立淘汰规则;跨层之间由管理员编排晋升</p>
            </div>
            {pendingCount > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-semibold text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
                <AlertCircle className="h-3 w-3" />{pendingCount} 条待确认
              </span>
            )}
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            {(['l1', 'l2', 'l3'] as MemoryLayer[]).map((layer) => {
              const meta = LAYER_META[layer];
              const policy = policies.find((p) => p.layer === layer);
              const Icon = meta.icon;
              return (
                <button key={layer} type="button" onClick={() => onJump(layer)} className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left transition hover:-translate-y-0.5 hover:border-blue-400 hover:shadow-md dark:border-slate-800 dark:bg-slate-900/40">
                  <div className="flex items-start justify-between">
                    <span className={`grid h-10 w-10 place-items-center rounded-lg ${toneClass[meta.tone]}`}><Icon className="h-5 w-5" /></span>
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">{layer.toUpperCase()}</span>
                  </div>
                  <div>
                    <h4 className="text-base font-semibold">{meta.label}</h4>
                    <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">{meta.tagline}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 border-t border-slate-200 pt-3 text-[11px] dark:border-slate-800">
                    <div><p className="text-slate-500 dark:text-slate-400">条目数</p><p className="mt-0.5 text-sm font-semibold tabular-nums">{layer === 'l1' ? counts.l1 : layer === 'l2' ? counts.l2 : counts.l3}</p></div>
                    <div><p className="text-slate-500 dark:text-slate-400">命中率</p><p className="mt-0.5 text-sm font-semibold tabular-nums">{policy ? `${(policy.hitRate * 100).toFixed(1)}%` : '—'}</p></div>
                    <div className="col-span-2"><p className="text-slate-500 dark:text-slate-400">保留策略</p><p className="mt-0.5 font-semibold">{policy ? `TTL ${ttlLabel(policy.ttlMinutes)} · 上限 ${policy.maxItems} · ${policy.eviction.toUpperCase()}` : '—'}</p></div>
                  </div>
                  <span className="mt-auto inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700">查看 → <ChevronRight className="h-3 w-3" /></span>
                </button>
              );
            })}
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 sm:p-5">
          <h3 className="text-base font-semibold">晋升编排规则</h3>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">系统自动提炼候选,管理员在中间做编排与发布决策;不自动跨层。</p>
          <ul className="mt-3 grid gap-2 text-[11px] text-slate-700 dark:text-slate-200 sm:grid-cols-2">
            <li className="flex gap-2 rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-900/40"><span className="font-semibold text-blue-700">L2</span><span className="text-slate-500">|</span><span>3+ 会话复用 · 置信度 ≥ 0.7 · 用户标记"以后都这样"</span></li>
            <li className="flex gap-2 rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-900/40"><span className="font-semibold text-blue-700">L3</span><span className="text-slate-500">|</span><span>2+ 用户共识 · 管理员选团队填摘要 · 法务自动草稿</span></li>
          </ul>
        </div>
      </div>
      <PromotionFeed events={promotions} />
    </section>
  );
}