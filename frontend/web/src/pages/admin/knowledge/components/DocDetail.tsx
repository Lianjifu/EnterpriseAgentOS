/**
 * 文档详情 — SideDrawer 主体。
 */
import { FileText } from 'lucide-react';
import type { Doc, Kb } from '@/api/admin/knowledge/schema';
import { DOC_STATUS_BADGE } from './Primitives';
import { DOC_TYPE_LABEL } from './constants';

export function DocDetail({ doc, kbs }: { doc: Doc; kbs: Kb[] }) {
  const badge = DOC_STATUS_BADGE[doc.status];
  const kb = kbs.find((k) => k.id === doc.kbId);
  return (
    <div className="mt-4 space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-sky-50 text-sky-600 dark:bg-sky-500/15 dark:text-sky-300">
          <FileText className="h-4 w-4" />
        </span>
        <span className="rounded-full bg-[var(--bg-elevated)] px-2 py-0.5 text-[10px] font-semibold text-[var(--text-secondary)]">{DOC_TYPE_LABEL[doc.type]}</span>
        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${badge.className}`}>{badge.label}</span>
      </div>
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-5">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--brand)]">归属知识库</p>
        <p className="mt-1.5 text-sm font-semibold">{kb?.name ?? doc.kbId}</p>
        <p className="mt-1 text-[11px] text-[var(--text-muted)]">更新于 {doc.updatedAt}</p>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Stat label="大小" value={`${doc.sizeKb.toLocaleString()} KB`} />
        <Stat label="切片" value={doc.chunks.toLocaleString()} />
        <Stat label="引用" value={doc.citations.toLocaleString()} />
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[var(--border)] p-4">
      <p className="text-[10px] uppercase tracking-wide text-[var(--text-muted)]">{label}</p>
      <p className="mt-1 text-lg font-semibold tabular-nums">{value}</p>
    </div>
  );
}