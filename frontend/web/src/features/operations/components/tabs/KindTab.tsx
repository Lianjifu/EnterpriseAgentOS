/**
 * KindTab — 6 类 span 调用占比 + 计数。
 */
import type { KindStat, SpanKind } from '../../schema';
import { SPAN_KIND_META } from '../constants';

export function KindTab({ kindStats, total }: { kindStats: KindStat[]; total: number }) {
  const totalSafe = Math.max(total, 1);
  const counts = Object.fromEntries(kindStats.map((k) => [k.kind, k.count])) as Record<SpanKind, number>;
  return (
    <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-5">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-700 dark:text-sky-300">类型分布</p>
      <h3 className="mt-2 text-lg font-semibold">调用类型分布</h3>
      <p className="mt-1 text-xs text-[var(--text-muted)]">统计当前链路中各类调用的占比与耗时。</p>
      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {(Object.keys(SPAN_KIND_META) as SpanKind[]).map((k) => {
          const meta = SPAN_KIND_META[k];
          const Icon = meta.icon;
          const count = counts[k] ?? 0;
          const pct = Math.round((count / totalSafe) * 100);
          return (
            <article key={k} className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-4">
              <header className="flex items-center gap-2">
                <span className={`inline-flex h-8 w-8 items-center justify-center rounded-lg ${meta.tone}`}>
                  <Icon className="h-4 w-4" />
                </span>
                <h4 className="text-sm font-semibold">{meta.label}</h4>
                <span className="ml-auto text-[10px] text-[var(--text-muted)]">{count} 次</span>
              </header>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-[var(--bg-elevated)]">
                <div className="h-full bg-[var(--brand)]" style={{ width: `${pct}%` }} />
              </div>
              <p className="mt-2 text-[10px] text-[var(--text-muted)]">占比 {pct}%</p>
            </article>
          );
        })}
      </div>
    </section>
  );
}