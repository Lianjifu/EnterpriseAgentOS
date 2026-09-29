import { Database, FileText, Hash, Folder } from 'lucide-react';
import type { Kb } from '@/api/admin/knowledge/schema';
import { KB_STATUS_BADGE, Sparkline } from './Primitives';

export default function KbCard({
  kb,
  selected,
  onToggleSelect,
  onOpen,
  onTogglePause,
}: {
  kb: Kb;
  selected: boolean;
  onToggleSelect: (id: string) => void;
  onOpen: (kb: Kb) => void;
  onTogglePause: (kb: Kb) => void;
}) {
  const badge = KB_STATUS_BADGE[kb.status];
  const sparkData = [kb.evalHitRate, kb.evalHitRate * 0.95, kb.evalHitRate * 1.02, kb.evalHitRate * 0.98, kb.evalHitRate * 1.05, kb.evalHitRate * 1.03];
  const Icon = Database;
  return (
    <article
      className={`group flex flex-col gap-3 rounded-2xl border bg-[var(--surface-1)] p-5 transition hover:-translate-y-0.5 hover:border-[var(--brand)] hover:shadow-[var(--shadow-sm)] ${selected ? 'border-[var(--brand)] shadow-[var(--shadow-sm)]' : 'border-[var(--border)]'}`}
    >
      <div className="flex items-start justify-between">
        <button
          type="button"
          onClick={() => onToggleSelect(kb.id)}
          aria-label={`选择知识库 ${kb.name}`}
          aria-pressed={selected}
          className={`grid h-5 w-5 shrink-0 place-items-center rounded-md border transition ${selected ? 'border-[var(--brand)] bg-[var(--brand)] text-white' : 'border-[var(--border-strong)] bg-[var(--surface-1)] text-transparent hover:border-[var(--brand)]'}`}
        >
          <span className="text-[10px]">✓</span>
        </button>
        <Sparkline data={sparkData} stroke="var(--brand)" />
      </div>
      <button type="button" onClick={() => onOpen(kb)} aria-label={`查看 ${kb.name} 详情`} className="text-left">
        <div className="flex items-center gap-2">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[var(--brand-light)] text-[var(--brand)]">
            <Icon className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-sm font-semibold group-hover:text-[var(--brand)]">{kb.name}</h3>
            <p className="text-[11px] text-[var(--text-muted)]">{kb.scope} · {kb.owner}</p>
          </div>
        </div>
        <p className="mt-2 line-clamp-2 text-xs leading-5 text-[var(--text-secondary)]">{kb.description}</p>
        <div className="mt-2 flex flex-wrap gap-1">
          {kb.tags.slice(0, 3).map((t) => (
            <span key={t} className="rounded-full bg-[var(--bg-elevated)] px-2 py-0.5 text-[10px] font-medium text-[var(--text-secondary)]">
              #{t}
            </span>
          ))}
        </div>
      </button>
      <div className="mt-auto flex items-center justify-between border-t border-[var(--border)] pt-3">
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${badge.className}`}>{badge.label}</span>
          <span className="text-[11px] tabular-nums text-[var(--text-muted)]">{kb.docCount} 文档 · {kb.vectorCount.toLocaleString()} 向量</span>
        </div>
        <button
          type="button"
          onClick={() => onTogglePause(kb)}
          className="inline-flex items-center gap-1 rounded-lg border border-[var(--border)] px-2.5 py-1 text-[11px] font-semibold text-[var(--text-secondary)] hover:border-[var(--brand)] hover:text-[var(--brand)]"
        >
          {kb.status === 'paused' ? '恢复' : '暂停'}
        </button>
      </div>
    </article>
  );
}