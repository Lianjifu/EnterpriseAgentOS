import { FileText } from 'lucide-react';
import type { Doc } from '../schema';
import { DOC_STATUS_BADGE } from './Primitives';
import { DOC_TYPE_LABEL } from './constants';

export default function DocCard({ doc, onOpen }: { doc: Doc; onOpen: (doc: Doc) => void }) {
  const badge = DOC_STATUS_BADGE[doc.status];
  return (
    <article className="group flex flex-col gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-5 transition hover:-translate-y-0.5 hover:border-[var(--brand)] hover:shadow-[var(--shadow-sm)]">
      <div className="flex items-center gap-2">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-sky-50 text-sky-600 dark:bg-sky-500/15 dark:text-sky-300">
          <FileText className="h-4 w-4" />
        </span>
        <span className="rounded-full bg-[var(--bg-elevated)] px-2 py-0.5 text-[10px] font-semibold text-[var(--text-secondary)]">
          {DOC_TYPE_LABEL[doc.type]}
        </span>
        <span className={`ml-auto inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${badge.className}`}>{badge.label}</span>
      </div>
      <button type="button" onClick={() => onOpen(doc)} aria-label={`查看 ${doc.name} 详情`} className="text-left">
        <h4 className="truncate text-sm font-semibold group-hover:text-[var(--brand)]">{doc.name}</h4>
        <div className="mt-2 grid grid-cols-3 gap-2 text-[11px]">
          <div>
            <p className="text-[10px] text-[var(--text-muted)]">大小</p>
            <p className="mt-0.5 tabular-nums font-semibold">{doc.sizeKb.toLocaleString()} KB</p>
          </div>
          <div>
            <p className="text-[10px] text-[var(--text-muted)]">切片</p>
            <p className="mt-0.5 tabular-nums font-semibold">{doc.chunks}</p>
          </div>
          <div>
            <p className="text-[10px] text-[var(--text-muted)]">引用</p>
            <p className="mt-0.5 tabular-nums font-semibold">{doc.citations.toLocaleString()}</p>
          </div>
        </div>
      </button>
      <div className="mt-auto flex items-center justify-between border-t border-[var(--border)] pt-3 text-[11px]">
        <span className="text-[var(--text-muted)]">{doc.updatedAt}</span>
        <button
          type="button"
          onClick={() => onOpen(doc)}
          className="inline-flex items-center gap-1 rounded-lg border border-[var(--border)] px-2.5 py-1 text-[11px] font-semibold text-[var(--text-secondary)] hover:border-[var(--brand)] hover:text-[var(--brand)]"
        >
          详情
        </button>
      </div>
    </article>
  );
}