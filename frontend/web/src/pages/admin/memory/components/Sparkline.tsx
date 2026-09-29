/**
 * Sparkline — 8 期条形图,h-20 容器,末期高亮品牌色。
 * 用 `Math.max(1, ...values)` 归一化,避免全 0 时除零 / 数据缺失 fallback。
 * 末期 delta 徽章在最右侧;最新数值由 TrendCard header 大字号展示,不在柱顶重复。
 */
import type { LucideIcon } from 'lucide-react';
import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';

export function Sparkline({ values, tone = 'brand' }: { values: number[]; tone?: 'brand' | 'purple' | 'info' }) {
  const list = values.length > 0 ? values : [0, 0, 0, 0, 0, 0, 0, 0];
  const max = Math.max(1, ...list);
  const latest = list[list.length - 1] ?? 0;
  const prev = list.length >= 2 ? list[list.length - 2] : latest;
  const delta = latest - prev;
  const trendDir = delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat';
  const trendColor = tone === 'purple' ? 'var(--purple, #8b5cf6)' : tone === 'info' ? 'var(--info, #0ea5e9)' : 'var(--brand)';
  const trackColor = 'var(--bg-elevated)';

  return (
    <div className="flex h-20 items-end gap-1" role="img" aria-label={`近 ${list.length} 期趋势`}>
      {list.map((v, idx) => {
        const heightPct = Math.max(6, Math.round((v / max) * 100));
        const isLatest = idx === list.length - 1;
        return (
          <div key={idx} className="group relative flex flex-1 flex-col items-center justify-end">
            <div
              className="w-full rounded-t transition-colors"
              style={{
                height: `${heightPct}%`,
                minHeight: '4px',
                backgroundColor: isLatest ? trendColor : trackColor,
                opacity: isLatest ? 1 : 0.85,
              }}
              aria-label={`第 ${idx + 1} 期 ${v}`}
              title={`第 ${idx + 1} 期 ${v.toLocaleString()}`}
            />
          </div>
        );
      })}
      <div
        className={`ml-2 inline-flex shrink-0 items-center gap-0.5 self-end rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${
          trendDir === 'up'
            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300'
            : trendDir === 'down'
            ? 'bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300'
            : 'bg-[var(--bg-elevated)] text-[var(--text-muted)]'
        }`}
        title={`较上期 ${delta > 0 ? '+' : ''}${delta.toLocaleString()}`}
      >
        {trendDir === 'up' ? <ArrowUpRight className="h-3 w-3" /> : trendDir === 'down' ? <ArrowDownRight className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
        {Math.abs(delta).toLocaleString()}
      </div>
    </div>
  );
}

export function TrendCard({
  icon: Icon, title, current, unit, tone, values, hint,
}: {
  icon: LucideIcon; title: string; current: number | string; unit: string;
  tone: 'brand' | 'purple' | 'info';
  values: number[]; hint: string;
}) {
  const toneClass =
    tone === 'purple'
      ? 'bg-violet-50 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300'
      : tone === 'info'
      ? 'bg-sky-50 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300'
      : 'bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300';
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${toneClass}`}>
            <Icon className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-[var(--text)]">{title}</p>
            <p className="mt-0.5 truncate text-[10px] text-[var(--text-muted)]">{hint}</p>
          </div>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-lg font-semibold tabular-nums">{current.toLocaleString()}</p>
          <p className="text-[10px] text-[var(--text-muted)]">{unit}</p>
        </div>
      </div>
      <div className="min-w-0">
        <Sparkline values={values} tone={tone} />
      </div>
    </div>
  );
}