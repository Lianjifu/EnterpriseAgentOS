import { Database, FileText, Folder, GitBranch, Globe, Hash, HardDrive, Plug } from 'lucide-react';
import type { Source, SourceType } from '@/api/admin/knowledge/schema';
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
  onSync,
  onConfig,
}: {
  source: Source;
  onSync: (id: string) => void;
  onConfig: (source: Source) => void;
}) {
  const badge = SOURCE_STATUS_BADGE[source.status];
  const meta = SOURCE_TYPE_META[source.type];
  const Icon = SOURCE_ICON[source.type];
  return (
    <article className="group flex flex-col gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-5 transition hover:-translate-y-0.5 hover:border-[var(--brand)] hover:shadow-[var(--shadow-sm)]">
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-[var(--brand-light)] text-[var(--brand)]">
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h4 className="truncate text-sm font-semibold">{source.name}</h4>
          <p className="text-[11px] text-[var(--text-muted)]">{meta.label} · {source.schedule}</p>
        </div>
        <span className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${badge.className}`}>{badge.label}</span>
      </div>
      <div className="grid grid-cols-2 gap-2 text-[11px]">
        <div>
          <p className="text-[10px] text-[var(--text-muted)]">条目数</p>
          <p className="mt-0.5 tabular-nums font-semibold">{source.itemCount.toLocaleString()}</p>
        </div>
        <div>
          <p className="text-[10px] text-[var(--text-muted)]">最近同步</p>
          <p className="mt-0.5 font-semibold">{source.lastSync}</p>
        </div>
      </div>
      {source.lastError && (
        <p className="rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-[11px] text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
          ⚠ {source.lastError}
        </p>
      )}
      <div className="mt-auto flex justify-end gap-2 border-t border-[var(--border)] pt-3">
        <button
          type="button"
          onClick={() => onSync(source.id)}
          disabled={source.status === 'syncing'}
          className="inline-flex items-center justify-center rounded-lg border border-[var(--border)] px-2.5 py-1 text-[11px] font-semibold text-[var(--text-secondary)] hover:border-[var(--brand)] hover:text-[var(--brand)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {source.status === 'syncing' ? '同步中…' : '立即同步'}
        </button>
        <button
          type="button"
          onClick={() => onConfig(source)}
          className="inline-flex items-center justify-center rounded-lg border border-[var(--border)] px-2.5 py-1 text-[11px] font-semibold text-[var(--text-secondary)] hover:border-[var(--brand)] hover:text-[var(--brand)]"
        >
          配置
        </button>
      </div>
    </article>
  );
}