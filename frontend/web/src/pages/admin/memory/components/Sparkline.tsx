/**
 * Sparkline — 8 期条形图,h-20 容器,末期高亮品牌色。
 * 用 `Math.max(1, ...values)` 归一化,避免全 0 时除零 / 数据缺失 fallback。
 * 末期 delta 徽章在最右侧;最新数值由 caller 大字号展示,不在柱顶重复。
 */
import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';

export function Sparkline({ values, tone = 'brand' }: { values: number[]; tone?: 'brand' | 'purple' | 'info' }) {
  const list = values.length > 0 ? values : [0, 0, 0, 0, 0, 0, 0, 0];
  const max = Math.max(1, ...list);
  const latest = list[list.length - 1] ?? 0;
  const prev = list.length >= 2 ? list[list.length - 2] : latest;
  const delta = latest - prev;
  const trendDir = delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat';
  const trendColor = tone === 'purple' ? 'var(--purple, #8b5cf6)' : tone === 'info' ? 'var(--info, #0ea5e9)' : 'var(--brand)';

  return (
    <div className="flex h-20 items-end gap-1" role="img" aria-label={`近 ${list.length} 期趋势`}>
      {list.map((v, idx) => {
        const heightPct = Math.max(6, Math.round((v / max) * 100));
        const isLatest = idx === list.length - 1;
        return (
          <div key={idx} className="group relative flex h-full flex-1 flex-col items-center justify-end">
            <div
              className="w-full rounded-t transition-colors"
              style={{
                height: `${heightPct}%`,
                minHeight: '4px',
                backgroundColor: trendColor,
                opacity: isLatest ? 1 : 0.28,
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