import { Database, FileText, Folder, GitBranch, Globe, Hash, HardDrive, Plug } from 'lucide-react';
import {
  AdminListActions, AdminListIdentity, AdminListMetric, AdminListMetrics, AdminListRow,
  adminListActionBtn,
} from '@/components/feedback/AdminListRow';
import type { Source, SourceType } from '../schema';
import { SOURCE_STATUS_BADGE } from './Primitives';
import { SOURCE_TYPE_META } from './constants';

const SOURCE_ICON: Record<SourceType, typeof Database> = {
  notion: FileText,
  slack: Hash,
  web: Globe,
  postgres: Database,
  s3: HardDrive,
  api: Plug,
  folder: Folder,
  confluence: GitBranch,
};

export default function SourceCard({
  source,
  onOpen,
  onSync,
  onConfig,
}: {
  source: Source;
  onOpen?: (source: Source) => void;
  onSync: (id: string) => void;
  onConfig: (source: Source) => void;
}) {
  const badge = SOURCE_STATUS_BADGE[source.status];
  const meta = SOURCE_TYPE_META[source.type];
  const Icon = SOURCE_ICON[source.type];
  return (
    <AdminListRow hasCheckbox={false} hasStar={false}>
      {onOpen ? (
        <div
          role="button"
          tabIndex={0}
          aria-label={`查看 ${source.name} 详情`}
          onClick={() => onOpen(source)}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(source); } }}
          className="absolute inset-0 z-0 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--brand)]"
        />
      ) : null}
      <AdminListIdentity>
        <div className="flex min-w-0 items-center gap-1.5">
          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-[var(--brand-light)] text-[var(--brand)]">
            <Icon className="h-3.5 w-3.5" />
          </span>
          <h4 className="truncate text-sm font-semibold group-hover:text-[var(--brand)]">{source.name}</h4>
          <span className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${badge.className}`}>{badge.label}</span>
        </div>
        <p className="mt-0.5 truncate text-[11px] text-[var(--text-muted)]">
          {meta.label} · {source.schedule}
          {source.lastError ? ` · ${source.lastError}` : ''}
        </p>
      </AdminListIdentity>
      <AdminListMetrics cols={2}>
        <AdminListMetric>{source.itemCount.toLocaleString()} 条</AdminListMetric>
        <AdminListMetric>{source.lastSync}</AdminListMetric>
      </AdminListMetrics>
      <AdminListActions>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onSync(source.id); }}
          disabled={source.status === 'syncing'}
          className={adminListActionBtn}
        >
          {source.status === 'syncing' ? '同步中…' : '立即同步'}
        </button>
        <button type="button" onClick={(e) => { e.stopPropagation(); onConfig(source); }} className={adminListActionBtn}>
          配置
        </button>
      </AdminListActions>
    </AdminListRow>
  );
}
