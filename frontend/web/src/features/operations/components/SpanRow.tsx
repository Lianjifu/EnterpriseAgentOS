/**
 * SpanRow — 单行 span(深度缩进 + 进度条 + 状态点)。递归构造整棵树。
 */
import type { Span, SpanKind } from '../schema';
import { SPAN_KIND_META } from './constants';

export function buildSpanTree(spans: Span[], parentId: string | null = null): Array<{ span: Span; depth: number }> {
  return spans
    .filter((s) => s.parentId === parentId)
    .flatMap((s) => [{ span: s, depth: parentId == null ? 0 : 1 }, ...buildSpanTree(spans, s.id)]);
}

export function SpanRow({
  span,
  depth,
  totalDurationMs,
  selected,
  onSelect,
}: {
  span: Span;
  depth: number;
  totalDurationMs: number;
  selected: boolean;
  onSelect: () => void;
}) {
  const meta = SPAN_KIND_META[span.kind as SpanKind];
  const Icon = meta.icon;
  const widthPct = Math.max(2, (span.durationMs / totalDurationMs) * 100);
  const offsetPct = (span.startOffsetMs / totalDurationMs) * 100;
  const statusDot = span.status === 'ok' ? 'bg-emerald-500' : span.status === 'error' ? 'bg-rose-500' : 'bg-amber-500';
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`flex w-full items-center gap-2 rounded-xl border p-2 text-left transition ${selected ? 'border-[var(--brand)] bg-[var(--brand-light)]' : 'border-[var(--border)] bg-[var(--surface-1)] hover:border-[var(--brand)]'}`}
    >
      <div style={{ width: depth * 16 }} />
      <span className={`inline-flex h-6 w-6 items-center justify-center rounded-md ${meta.tone}`}>
        <Icon className="h-3 w-3" />
      </span>
      <span className="font-mono text-[10px] font-semibold text-[var(--text-muted)]">{span.id}</span>
      <span className="min-w-0 flex-1 truncate text-xs font-semibold">{span.name}</span>
      <div className="relative h-2 w-32 overflow-hidden rounded-full bg-[var(--bg-elevated)]">
        <div className="absolute h-full rounded-full bg-[var(--brand)]/70" style={{ left: `${offsetPct}%`, width: `${widthPct}%` }} />
      </div>
      <span className="w-12 text-right text-[10px] tabular-nums text-[var(--text-muted)]">{span.durationMs}ms</span>
      <span className={`h-2 w-2 rounded-full ${statusDot}`} aria-hidden="true" />
    </button>
  );
}