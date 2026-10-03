import {
  CheckSquare, Clock, Copy, FlaskConical, GitBranch, Play, ShieldCheck, Sparkles, Square, Star, Trash2,
} from 'lucide-react';
import {
  AdminListActions, AdminListIdentity, AdminListMetric, AdminListMetrics, AdminListRow,
  adminListActionBtn, adminListDangerBtn,
} from '@/components/feedback/AdminListRow';
import type { EvalSuite } from '../schema';
import { STATUS_BADGE, TYPE_META } from './constants';

interface SuiteCardProps {
  suite: EvalSuite;
  onSelect: (suite: EvalSuite) => void;
  onToggleStar: (id: string) => void;
  selected: boolean;
  onToggleSelect: (id: string) => void;
  onRun: (suite: EvalSuite) => void;
  onDuplicate: (suite: EvalSuite) => void;
  onRequestDelete: (suite: EvalSuite) => void;
}

export function SuiteCard({
  suite, onSelect, onToggleStar, selected, onToggleSelect,
  onRun, onDuplicate, onRequestDelete,
}: SuiteCardProps) {
  const meta = TYPE_META[suite.type];
  const Icon = iconMap[meta.icon] ?? Sparkles;
  const badge = STATUS_BADGE[suite.status];
  const isRunning = suite.status === 'running';
  return (
    <AdminListRow selected={selected}>
      <div role="button" tabIndex={0} onClick={() => onSelect(suite)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(suite); } }} aria-label={`查看 ${suite.name} 详情`} className="absolute inset-0 z-0 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--brand)]" />
      <button type="button" onClick={(e) => { e.stopPropagation(); onToggleSelect(suite.id); }} aria-label={selected ? `取消选择 ${suite.name}` : `选择 ${suite.name}`} aria-pressed={selected} className={`relative z-10 grid h-7 w-7 place-items-center rounded-lg ${selected ? 'bg-[var(--brand-light)] text-[var(--brand)]' : 'text-[var(--text-muted)] hover:bg-[var(--bg-hover)]'}`}>
        {selected ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}
      </button>
      <AdminListIdentity>
        <div className="flex min-w-0 items-center gap-1.5">
          <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-md ${meta.tone}`}><Icon className="h-3.5 w-3.5" /></span>
          <h4 className="truncate text-sm font-semibold group-hover:text-[var(--brand)]">{suite.name}</h4>
          <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold ${badge.className}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${badge.dot}`} aria-hidden="true" />{badge.label}
          </span>
        </div>
        <p className="mt-0.5 truncate text-[11px] text-[var(--text-muted)]">{meta.label} · {suite.owner} · {suite.description}</p>
      </AdminListIdentity>
      <button type="button" aria-label={suite.starred ? '取消收藏' : '收藏'} aria-pressed={suite.starred} onClick={(e) => { e.stopPropagation(); onToggleStar(suite.id); }} className={`relative z-10 grid h-7 w-7 place-items-center rounded-lg ${suite.starred ? 'text-amber-500' : 'text-[var(--text-muted)] hover:text-amber-500'}`}>
        <Star className={`h-4 w-4 ${suite.starred ? 'fill-current' : ''}`} />
      </button>
      <AdminListMetrics cols={3}>
        <AdminListMetric>{suite.cases} 用例</AdminListMetric>
        <AdminListMetric>
          {suite.status !== 'cancelled' && suite.status !== 'queued' && suite.cases > 0 ? `通过 ${suite.passRate.toFixed(1)}%` : '—'}
        </AdminListMetric>
        <AdminListMetric>
          {suite.status !== 'cancelled' && suite.status !== 'queued' ? (
            <span className="inline-flex items-center justify-end gap-1"><Clock className="h-3 w-3" />{suite.lastRunAt}</span>
          ) : '—'}
        </AdminListMetric>
      </AdminListMetrics>
      <AdminListActions>
        <button type="button" disabled={isRunning} onClick={(e) => { e.stopPropagation(); onRun(suite); }} className={adminListActionBtn}>
          <Play className="h-3.5 w-3.5" />{isRunning ? '运行中' : '运行'}
        </button>
        <button type="button" onClick={(e) => { e.stopPropagation(); onDuplicate(suite); }} className={adminListActionBtn}>
          <Copy className="h-3.5 w-3.5" />复制
        </button>
        <button type="button" onClick={(e) => { e.stopPropagation(); onRequestDelete(suite); }} className={adminListDangerBtn}>
          <Trash2 className="h-3.5 w-3.5" />删除
        </button>
      </AdminListActions>
    </AdminListRow>
  );
}

const iconMap: Record<string, typeof Sparkles> = {
  Sparkles,
  FlaskConical,
  ShieldCheck,
  GitBranch,
};
