/**
 * OverviewTab — 待确认 strip + 最近晋升 feed + 策略快访。
 *
 * 3 layer 入口卡已挪进 MemoryPage Hero,本 tab 只负责「今日快讯」。
 */
import { Link } from 'react-router-dom';
import { AlertCircle, ChevronRight } from 'lucide-react';
import type {
  L2Category, L2Fact, L3Entry, MemoryLayer, PromotionEvent, RetentionPolicy,
} from '@/api/admin/memory/schema';
import { L2_CATEGORY_LABEL, L2_STATUS_BADGE, LAYER_META, toneClass, ttlLabel } from '../constants';
import { PromotionFeed } from '../PromotionFeed';

export function OverviewTab({ promotions, policies, pendingFacts, onConfirm }: {
  promotions: PromotionEvent[];
  policies: RetentionPolicy[];
  pendingFacts: L2Fact[];
  onConfirm: (id: string) => void;
}) {
  return (
    <section className="space-y-4">
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-4 sm:p-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold">待确认事实</h3>
            <p className="mt-1 text-xs text-[var(--text-muted)]">从 L2 候选中快速放行或丢弃,影响后续晋升与命中率</p>
          </div>
          {pendingFacts.length > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-[var(--warning-bg)] px-2.5 py-1 text-[10px] font-semibold text-[var(--warning)]">
              <AlertCircle className="h-3 w-3" />{pendingFacts.length} 条待确认
            </span>
          )}
        </div>
        {pendingFacts.length === 0 ? (
          <p className="mt-4 rounded-xl border border-dashed border-[var(--border)] p-6 text-center text-xs text-[var(--text-muted)]">无待确认项</p>
        ) : (
          <ul className="mt-4 grid gap-2">
            {pendingFacts.map((f) => {
              const cat = L2_CATEGORY_LABEL[f.category as L2Category];
              const status = L2_STATUS_BADGE[f.status];
              return (
                <li key={f.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--bg-app)] p-3">
                  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${status.className}`}>{status.label}</span>
                  <span className="inline-flex items-center rounded-full bg-[var(--bg-elevated)] px-2 py-0.5 text-[10px] font-semibold text-[var(--text-secondary)]">{cat}</span>
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">{f.key}</span>
                  <span className="text-[10px] text-[var(--text-muted)]">{f.userName} · 置信度 {(f.confidence * 100).toFixed(0)}%</span>
                  <button type="button" onClick={() => onConfirm(f.id)} className="inline-flex items-center gap-1 rounded-xl border border-[var(--brand)] bg-[var(--brand)] px-3 py-1.5 text-[11px] font-semibold text-white hover:opacity-90">确认入库</button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-4 sm:p-5">
            <h3 className="text-base font-semibold">晋升编排规则</h3>
            <p className="mt-1 text-xs text-[var(--text-muted)]">系统自动提炼候选,管理员在中间做编排与发布决策;不自动跨层。</p>
            <ul className="mt-3 grid gap-2 text-[11px] text-[var(--text-secondary)] sm:grid-cols-2">
              <li className="flex gap-2 rounded-lg bg-[var(--bg-app)] px-3 py-2"><span className="font-semibold text-[var(--brand)]">L2</span><span className="text-[var(--text-muted)]">|</span><span>3+ 会话复用 · 置信度 ≥ 0.7 · 用户标记"以后都这样"</span></li>
              <li className="flex gap-2 rounded-lg bg-[var(--bg-app)] px-3 py-2"><span className="font-semibold text-[var(--brand)]">L3</span><span className="text-[var(--text-muted)]">|</span><span>2+ 用户共识 · 管理员选团队填摘要 · 法务自动草稿</span></li>
            </ul>
          </div>
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-4 sm:p-5">
            <h3 className="text-base font-semibold">策略快访</h3>
            <p className="mt-1 text-xs text-[var(--text-muted)]">点击查看每层保留策略详情</p>
            <ul className="mt-3 grid gap-2 sm:grid-cols-3">
              {policies.map((p) => {
                const layerMeta = LAYER_META[p.layer as MemoryLayer];
                const Icon = layerMeta.icon;
                return (
                  <li key={p.layer}>
                    <Link to={`/admin/memory/policies/${encodeURIComponent(p.label)}`} className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--bg-app)] p-3 transition hover:border-[var(--brand)]">
                      <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${toneClass[layerMeta.tone]}`}><Icon className="h-4 w-4" /></span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">{p.label}</p>
                        <p className="text-[10px] text-[var(--text-muted)]">TTL {ttlLabel(p.ttlMinutes)} · 命中率 {(p.hitRate * 100).toFixed(0)}%</p>
                      </div>
                      <ChevronRight className="h-3.5 w-3.5 shrink-0 text-[var(--text-muted)]" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
        <PromotionFeed events={promotions} />
      </div>
    </section>
  );
}