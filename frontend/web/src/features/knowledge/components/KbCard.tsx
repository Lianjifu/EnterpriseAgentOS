import { CheckCircle2, Database } from 'lucide-react';
import {
  AdminListActions, AdminListIdentity, AdminListMetric, AdminListMetrics, AdminListRow,
  adminListActionBtn,
} from '@/components/feedback/AdminListRow';
import type { Kb } from '../schema';
import { KB_STATUS_BADGE } from './Primitives';

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
  return (
    <AdminListRow selected={selected} hasStar={false}>
      <div
        role="button"
        tabIndex={0}
        onClick={() => onOpen(kb)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onOpen(kb);
          }
        }}
        aria-label={`查看 ${kb.name} 详情`}
        className="absolute inset-0 z-0 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--brand)]"
      />
      <button
        type="button"
        onClick={(event) => { event.stopPropagation(); onToggleSelect(kb.id); }}
        aria-label={`选择知识库 ${kb.name}`}
        aria-pressed={selected}
        className={`relative z-10 grid h-7 w-7 place-items-center rounded-md border ${selected ? 'border-[var(--brand)] bg-[var(--brand)] text-white' : 'border-[var(--border-strong)] bg-[var(--surface-1)] text-transparent hover:border-[var(--brand)]'}`}
      >
        {selected ? <CheckCircle2 className="h-3.5 w-3.5" /> : null}
      </button>
      <AdminListIdentity>
        <div className="flex min-w-0 items-center gap-1.5">
          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-[var(--brand-light)] text-[var(--brand)]">
            <Database className="h-3.5 w-3.5" />
          </span>
          <h3 className="truncate text-sm font-semibold group-hover:text-[var(--brand)]">{kb.name}</h3>
          <span className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${badge.className}`}>{badge.label}</span>
        </div>
        <p className="mt-0.5 truncate text-[11px] text-[var(--text-muted)]">{kb.scope} · {kb.owner} · {kb.description}</p>
      </AdminListIdentity>
      <AdminListMetrics cols={2}>
        <AdminListMetric>{kb.docCount} 文档</AdminListMetric>
        <AdminListMetric>{kb.vectorCount.toLocaleString()} 向量</AdminListMetric>
      </AdminListMetrics>
      <AdminListActions>
        <button type="button" onClick={(event) => { event.stopPropagation(); onTogglePause(kb); }} className={adminListActionBtn}>
          {kb.status === 'paused' ? '恢复' : '暂停'}
        </button>
      </AdminListActions>
    </AdminListRow>
  );
}
