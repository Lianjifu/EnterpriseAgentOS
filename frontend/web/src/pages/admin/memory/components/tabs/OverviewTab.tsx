/**
 * OverviewTab — 「记忆总览」数据驱动总览:左 3 趋势卡 + 中待办工作流 + 右晋升 feed + 策略快访。
 *
 * 顶部趋势区携带 TimeRangeDropdown,控制 3 个 TrendCard 的数据范围;
 * 卡片右侧展示「最后刷新 · {lastRefresh}」。
 */
import { Link } from 'react-router-dom';
import { BookOpen, Brain, ChevronRight, Clock, Zap } from 'lucide-react';
import type {
  L2Fact, L3Entry, MemoryRange, MemoryTrend, PromotionEvent, RetentionPolicy,
} from '@/api/admin/memory/schema';
import {
  L2_CATEGORY_LABEL, L2_STATUS_BADGE, L3_STATUS_BADGE, LAYER_META, ttlLabel, toneClass,
} from '../constants';
import { PromotionFeed } from '../PromotionFeed';
import { TimeRangeDropdown } from '../TimeRangeDropdown';
import { TrendCard } from '../Sparkline';

export function OverviewTab({
  promotions, policies, pendingFacts, pendingL3Drafts, trend,
  pendingTotal,
  range, onRangeChange, onRefresh, refreshing, lastRefresh,
  onConfirm, onOpenL2, onOpenL3, onJumpToPolicies,
}: {
  promotions: PromotionEvent[];
  policies: RetentionPolicy[];
  pendingFacts: L2Fact[];
  pendingL3Drafts: L3Entry[];
  trend: MemoryTrend;
  pendingTotal: number;
  range: MemoryRange;
  onRangeChange: (next: MemoryRange) => void;
  onRefresh?: () => void;
  refreshing?: boolean;
  lastRefresh?: string;
  onConfirm: (id: string) => void;
  onOpenL2: (f: L2Fact) => void;
  onOpenL3: (e: L3Entry) => void;
  onJumpToPolicies: () => void;
}) {
  const l1Latest = trend.l1Active.length > 0 ? trend.l1Active[trend.l1Active.length - 1] : 0;
  const l2Latest = trend.l2Hits.length > 0 ? trend.l2Hits[trend.l2Hits.length - 1] : 0;
  const l3Latest = trend.l3Hits.length > 0 ? trend.l3Hits[trend.l3Hits.length - 1] : 0;
  const l1Meta = LAYER_META.l1;
  const l2Meta = LAYER_META.l2;
  const l3Meta = LAYER_META.l3;

  return (
    <section className="space-y-4">
      <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="space-y-4">
          <div>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-base font-semibold">趋势</h3>
              <div className="flex items-center gap-3">
                {lastRefresh && <p className="text-[10px] text-[var(--text-muted)]">最后刷新 · {lastRefresh}</p>}
                {onRangeChange && (
                  <TimeRangeDropdown value={range} onChange={onRangeChange} onRefresh={onRefresh} refreshing={refreshing} />
                )}
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <TrendCard
                icon={l1Meta.icon}
                title={`${l1Meta.label} · 活跃`}
                current={l1Latest}
                unit="活跃会话"
                tone="info"
                values={trend.l1Active}
                hint="8 期会话数"
              />
              <TrendCard
                icon={l2Meta.icon}
                title={`${l2Meta.label} · 命中`}
                current={l2Latest}
                unit="本周命中"
                tone="purple"
                values={trend.l2Hits}
                hint="8 期长期记忆命中次数"
              />
              <TrendCard
                icon={l3Meta.icon}
                title={`${l3Meta.label} · 命中`}
                current={l3Latest}
                unit="本周命中"
                tone="brand"
                values={trend.l3Hits}
                hint="8 期知识记忆命中次数"
              />
            </div>
          </div>

          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold">待办工作流</h3>
                <p className="mt-1 text-xs text-[var(--text-muted)]">从长期候选中快速放行,或将知识草稿发布上线</p>
              </div>
              <span className="text-[10px] text-[var(--text-muted)]">{pendingTotal} 项待处理</span>
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <div>
                <div className="flex items-center justify-between">
                  <p className="inline-flex items-center gap-1.5 text-xs font-semibold">
                    <span className={`grid h-5 w-5 place-items-center rounded ${toneClass.purple}`}>
                      <Brain className="h-3 w-3" />
                    </span>
                    待确认长期事实
                  </p>
                  <span className="text-[10px] text-[var(--text-muted)]">{pendingFacts.length} 条</span>
                </div>
                {pendingFacts.length === 0 ? (
                  <p className="mt-2 rounded-xl border border-dashed border-[var(--border)] p-4 text-center text-[11px] text-[var(--text-muted)]">无待确认项</p>
                ) : (
                  <ul className="mt-2 space-y-1.5">
                    {pendingFacts.map((f) => {
                      const cat = L2_CATEGORY_LABEL[f.category];
                      const status = L2_STATUS_BADGE[f.status];
                      return (
                        <li
                          key={f.id}
                          className="flex items-start gap-2 rounded-xl border border-[var(--border)] bg-[var(--bg-app)] p-2.5"
                        >
                          <span className={`mt-0.5 inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[9px] font-semibold ${status.className}`}>{status.label}</span>
                          <div className="min-w-0 flex-1">
                            <button
                              type="button"
                              onClick={() => onOpenL2(f)}
                              className="block w-full truncate text-left text-xs font-medium hover:text-[var(--brand)] hover:underline"
                            >
                              {f.key}
                            </button>
                            <p className="mt-0.5 text-[10px] text-[var(--text-muted)]">
                              {f.userName} · {cat} · 置信度 {(f.confidence * 100).toFixed(0)}%
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => onConfirm(f.id)}
                            className="shrink-0 rounded-md border border-[var(--brand)] bg-[var(--brand)] px-2 py-1 text-[10px] font-semibold text-white hover:opacity-90"
                          >
                            确认
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <p className="inline-flex items-center gap-1.5 text-xs font-semibold">
                    <span className={`grid h-5 w-5 place-items-center rounded ${toneClass.brand}`}>
                      <BookOpen className="h-3 w-3" />
                    </span>
                    待发布知识草稿
                  </p>
                  <span className="text-[10px] text-[var(--text-muted)]">{pendingL3Drafts.length} 条</span>
                </div>
                {pendingL3Drafts.length === 0 ? (
                  <p className="mt-2 rounded-xl border border-dashed border-[var(--border)] p-4 text-center text-[11px] text-[var(--text-muted)]">无待发布草稿</p>
                ) : (
                  <ul className="mt-2 space-y-1.5">
                    {pendingL3Drafts.map((k) => {
                      const status = L3_STATUS_BADGE[k.status];
                      return (
                        <li
                          key={k.id}
                          className="flex items-start gap-2 rounded-xl border border-[var(--border)] bg-[var(--bg-app)] p-2.5"
                        >
                          <span className={`mt-0.5 inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[9px] font-semibold ${status.className}`}>{status.label}</span>
                          <div className="min-w-0 flex-1">
                            <button
                              type="button"
                              onClick={() => onOpenL3(k)}
                              className="block w-full truncate text-left text-xs font-medium hover:text-[var(--brand)] hover:underline"
                            >
                              {k.title}
                            </button>
                            <p className="mt-0.5 text-[10px] text-[var(--text-muted)]">
                              {k.team} · {k.contributor} · {k.updatedAt}
                            </p>
                          </div>
                          <Link
                            to={`/admin/memory/l3/${encodeURIComponent(k.id)}`}
                            className="shrink-0 text-[10px] font-semibold text-[var(--brand)] hover:underline"
                          >
                            审阅 →
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold">策略快访</h3>
                <p className="mt-1 text-xs text-[var(--text-muted)]">查看每层保留策略详情或跳到策略 tab</p>
              </div>
              <button
                type="button"
                onClick={onJumpToPolicies}
                className="inline-flex items-center gap-1 rounded-xl border border-[var(--border)] bg-[var(--bg-app)] px-2.5 py-1.5 text-[11px] font-semibold text-[var(--text-secondary)] hover:border-[var(--brand)] hover:text-[var(--brand)]"
              >
                <Clock className="h-3.5 w-3.5" />查看全部
              </button>
            </div>
            <ul className="mt-3 grid gap-2 sm:grid-cols-3">
              {policies.map((p) => {
                const layerMeta = LAYER_META[p.layer];
                const Icon = layerMeta.icon;
                return (
                  <li key={p.layer}>
                    <Link
                      to={`/admin/memory/policies/${encodeURIComponent(p.label)}`}
                      className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--bg-app)] p-3 transition hover:border-[var(--brand)]"
                    >
                      <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${toneClass[layerMeta.tone]}`}>
                        <Icon className="h-4 w-4" />
                      </span>
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

        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-2">
            <KpiMini icon={Zap} label="短期 · 活跃" value={(trend.l1Active[trend.l1Active.length - 1] ?? 0).toLocaleString()} tone="info" />
            <KpiMini icon={Brain} label="长期 · 命中" value={(trend.l2Hits[trend.l2Hits.length - 1] ?? 0).toLocaleString()} tone="purple" />
            <KpiMini icon={BookOpen} label="知识 · 命中" value={(trend.l3Hits[trend.l3Hits.length - 1] ?? 0).toLocaleString()} tone="brand" />
          </div>
          <PromotionFeed events={promotions} />
        </div>
      </div>
    </section>
  );
}

function KpiMini({ icon: Icon, label, value, tone }: { icon: typeof Zap; label: string; value: string; tone: 'info' | 'purple' | 'brand' }) {
  const cls =
    tone === 'info'
      ? 'bg-sky-50 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300'
      : tone === 'purple'
      ? 'bg-violet-50 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300'
      : 'bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300';
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-3">
      <span className={`inline-flex h-6 w-6 items-center justify-center rounded-md ${cls}`}>
        <Icon className="h-3 w-3" />
      </span>
      <p className="mt-2 text-base font-semibold tabular-nums">{value}</p>
      <p className="text-[10px] text-[var(--text-muted)]">{label} · 当前</p>
    </div>
  );
}