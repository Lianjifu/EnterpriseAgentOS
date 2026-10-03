/**
 * AuditCard — 审计列表行。
 */
import {
  CheckSquare, Download, FileLock, ShieldAlert, Square, Star,
} from 'lucide-react';
import {
  AdminListActions, AdminListIdentity, AdminListMetric, AdminListMetrics, AdminListRow,
  adminListActionBtn, adminListDangerBtn,
} from '@/components/feedback/AdminListRow';
import type { AuditEntry } from '../schema';
import { CATEGORY_META, OUTCOME_BADGE, SEVERITY_BADGE } from './constants';
import { RiskBar } from './Primitives';

interface AuditCardProps {
  entry: AuditEntry;
  selected: boolean;
  onToggleSelect: (id: string) => void;
  onSelect: (entry: AuditEntry) => void;
  onToggleStar: (id: string) => void;
  onExportOne: (entry: AuditEntry) => void;
  onResolve: (entry: AuditEntry) => void;
}

export function AuditCard({
  entry, selected, onToggleSelect, onSelect, onToggleStar, onExportOne, onResolve,
}: AuditCardProps) {
  const sev = SEVERITY_BADGE[entry.severity];
  const cat = CATEGORY_META[entry.category];
  const Icon = cat.icon;
  const out = OUTCOME_BADGE[entry.outcome];
  const resolveRose = entry.severity === 'critical';
  return (
    <AdminListRow selected={selected}>
      <div
        role="button"
        tabIndex={0}
        onClick={() => onSelect(entry)}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(entry); } }}
        aria-label={`查看审计条目 ${entry.id}`}
        className="absolute inset-0 z-0 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--brand)]"
      />
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onToggleSelect(entry.id); }}
        aria-label={selected ? `取消选择 ${entry.id}` : `选择 ${entry.id}`}
        aria-pressed={selected}
        className={`relative z-10 grid h-7 w-7 place-items-center rounded-lg ${selected ? 'bg-[var(--brand-light)] text-[var(--brand)]' : 'text-[var(--text-muted)] hover:bg-[var(--bg-hover)]'}`}
      >
        {selected ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}
      </button>
      <AdminListIdentity>
        <div className="flex min-w-0 items-center gap-1.5">
          <p className="truncate font-mono text-sm font-semibold group-hover:text-[var(--brand)]">{entry.toolName}</p>
          <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${cat.tone}`}>
            <Icon className="h-3 w-3" />{cat.label}
          </span>
          <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold ${sev.className}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${sev.dot}`} aria-hidden="true" />{sev.label}
          </span>
          <span className={`hidden shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold sm:inline ${out.className}`}>{out.label}</span>
          {entry.hasSensitive && (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-semibold text-violet-700 dark:bg-violet-500/15 dark:text-violet-300">
              <FileLock className="h-3 w-3" />敏感
            </span>
          )}
        </div>
        <p className="mt-0.5 truncate text-[11px] text-[var(--text-muted)]">
          调用方 {entry.actor} · 会话 {entry.sessionId} · {entry.occurredAt}
          {entry.reason ? ` · ${entry.reason}` : ''}
        </p>
      </AdminListIdentity>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onToggleStar(entry.id); }}
        aria-label={entry.starred ? `取消收藏 ${entry.id}` : `收藏 ${entry.id}`}
        aria-pressed={entry.starred}
        className={`relative z-10 grid h-7 w-7 place-items-center rounded-lg ${entry.starred ? 'text-amber-500' : 'text-[var(--text-muted)] hover:text-amber-500'}`}
      >
        <Star className={`h-4 w-4 ${entry.starred ? 'fill-current' : ''}`} />
      </button>
      <AdminListMetrics cols={2}>
        <span className="flex items-center justify-end"><RiskBar score={entry.riskScore} /></span>
        <AdminListMetric>{entry.occurredAt}</AdminListMetric>
      </AdminListMetrics>
      <AdminListActions>
        <button type="button" onClick={(e) => { e.stopPropagation(); onExportOne(entry); }} className={adminListActionBtn}>
          <Download className="h-3.5 w-3.5" />导出
        </button>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onResolve(entry); }}
          className={resolveRose ? adminListDangerBtn : adminListActionBtn}
        >
          <ShieldAlert className="h-3.5 w-3.5" />处置
        </button>
      </AdminListActions>
    </AdminListRow>
  );
}
