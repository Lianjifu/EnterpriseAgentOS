/**
 * TraceTab — 展示样例完整调用链(只读,展开树形 span)。
 */
import type { Span } from '@/api/admin/operations/schema';
import { SpanRow, buildSpanTree } from '../SpanRow';

export function TraceTab({ spans }: { spans: Span[] }) {
  const tree = buildSpanTree(spans);
  const totalDurationMs = Math.max(...spans.map((s) => s.startOffsetMs + s.durationMs), 1);
  return (
    <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-5">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-700 dark:text-sky-300">轨迹详情</p>
      <h3 className="mt-2 text-lg font-semibold">样例链路</h3>
      <p className="mt-1 text-xs text-[var(--text-muted)]">展示一个典型会话的完整调用链。</p>
      <div className="mt-5 space-y-1.5">
        {tree.map(({ span, depth }) => (
          <SpanRow key={span.id} span={span} depth={depth} totalDurationMs={totalDurationMs} selected={false} onSelect={() => {}} />
        ))}
      </div>
    </section>
  );
}