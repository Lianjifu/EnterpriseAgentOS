import {
  CheckSquare, Clock, Copy, Edit3, FlaskConical, GitBranch, Play, ShieldCheck, Sparkles, Square, Star, Trash2,
} from 'lucide-react';
import type { EvalSuite } from '../schema';
import { Sparkline } from './Primitives';
import { STATUS_BADGE, TYPE_META } from './constants';

interface SuiteCardProps {
  suite: EvalSuite;
  onSelect: (suite: EvalSuite) => void;
  onToggleStar: (id: string) => void;
  selected: boolean;
  onToggleSelect: (id: string) => void;
  onRun: (suite: EvalSuite) => void;
  onEdit: (suite: EvalSuite) => void;
  onDuplicate: (suite: EvalSuite) => void;
  onRequestDelete: (suite: EvalSuite) => void;
}

export function SuiteCard({
  suite, onSelect, onToggleStar, selected, onToggleSelect,
  onRun, onEdit, onDuplicate, onRequestDelete,
}: SuiteCardProps) {
  const meta = TYPE_META[suite.type];
  const Icon = iconMap[meta.icon] ?? Sparkles;
  const badge = STATUS_BADGE[suite.status];
  const isRunning = suite.status === 'running';
  return (
    <article className={`group relative flex flex-col gap-4 rounded-2xl border bg-[var(--surface-1)] p-5 transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-sm)] ${selected ? 'border-[var(--brand)] shadow-[var(--shadow-sm)]' : 'border-[var(--border)] hover:border-[var(--brand)]'}`}>
      <div role="button" tabIndex={0} onClick={() => onSelect(suite)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(suite); } }} aria-label={`查看 ${suite.name} 详情`} className="absolute inset-0 z-0 cursor-pointer rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)]" />
      <div className="relative z-10 flex items-start justify-between">
        <button type="button" onClick={(e) => { e.stopPropagation(); onToggleSelect(suite.id); }} aria-label={selected ? `取消选择 ${suite.name}` : `选择 ${suite.name}`} aria-pressed={selected} className={`grid h-9 w-9 place-items-center rounded-lg transition ${selected ? 'bg-[var(--brand-light)] text-[var(--brand)]' : 'text-[var(--text-muted)] hover:bg-[var(--bg-hover)]'}`}>
          {selected ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}
        </button>
        <button type="button" aria-label={suite.starred ? '取消收藏' : '收藏'} aria-pressed={suite.starred} onClick={(e) => { e.stopPropagation(); onToggleStar(suite.id); }} className={`grid h-9 w-9 place-items-center rounded-lg transition ${suite.starred ? 'bg-amber-50 text-amber-500 dark:bg-amber-500/15' : 'text-[var(--text-muted)] hover:bg-[var(--bg-hover)] hover:text-amber-500'}`}>
          <Star className={`h-4 w-4 ${suite.starred ? 'fill-current' : ''}`} />
        </button>
      </div>
      <div className="pointer-events-none relative z-10 flex items-start gap-3">
        <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl ${meta.tone}`}>
          <Icon className="h-6 w-6" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--text-muted)]">{meta.label} · {suite.owner}</p>
          <h4 className="mt-1.5 text-base font-semibold tracking-tight text-[var(--text)]">{suite.name}</h4>
        </div>
      </div>
      <p className="pointer-events-none relative z-10 line-clamp-2 text-xs leading-5 text-[var(--text-muted)]">{suite.description}</p>
      <div className="pointer-events-none relative z-10 flex flex-wrap gap-1.5">
        {suite.tags.map((t) => (
          <span key={t} className="rounded-full bg-[var(--bg-elevated)] px-2 py-0.5 text-[10px] font-medium text-[var(--text-secondary)]">{t}</span>
        ))}
      </div>
      <div className="pointer-events-none relative z-10 mt-auto flex flex-wrap items-center gap-3 border-t border-[var(--border)] pt-3 text-[11px]">
        <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 font-semibold ${badge.className}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${badge.dot}`} aria-hidden="true" />
          {badge.label}
        </span>
        <span className="text-[var(--text-muted)]">· {suite.cases} 用例</span>
        {suite.status !== 'cancelled' && suite.status !== 'queued' && suite.cases > 0 && (
          <span className="text-[var(--text-muted)]">· 通过 {suite.passRate.toFixed(1)}%</span>
        )}
      </div>
      {suite.status !== 'cancelled' && suite.status !== 'queued' && (
        <div className="pointer-events-none relative z-10 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-[var(--text-muted)]">
          <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" />{suite.lastRunAt}</span>
          <span className="inline-flex items-center gap-1"><Sparkles className="h-3 w-3" />评分 {suite.avgScore.toFixed(1)}</span>
          <Sparkline data={suite.trend} stroke="var(--brand)" />
        </div>
      )}
      <div className="relative z-10 flex flex-wrap gap-1.5 border-t border-[var(--border)] pt-3">
        <button type="button" onClick={(e) => { e.stopPropagation(); onEdit(suite); }} className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg border border-[var(--border)] px-1.5 py-1.5 text-[11px] font-semibold text-[var(--text-secondary)] hover:border-[var(--brand)] hover:text-[var(--brand)]">
          <Edit3 className="h-3.5 w-3.5" />编辑
        </button>
        <button
          type="button"
          disabled={isRunning}
          onClick={(e) => { e.stopPropagation(); onRun(suite); }}
          className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg border border-[var(--border)] px-1.5 py-1.5 text-[11px] font-semibold text-[var(--text-secondary)] hover:border-[var(--brand)] hover:text-[var(--brand)] disabled:cursor-default disabled:opacity-40 disabled:hover:border-[var(--border)] disabled:hover:text-[var(--text-secondary)]"
        >
          <Play className="h-3.5 w-3.5" />{isRunning ? '运行中' : '运行'}
        </button>
        <button type="button" onClick={(e) => { e.stopPropagation(); onDuplicate(suite); }} className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg border border-[var(--border)] px-1.5 py-1.5 text-[11px] font-semibold text-[var(--text-secondary)] hover:border-[var(--brand)] hover:text-[var(--brand)]">
          <Copy className="h-3.5 w-3.5" />复制
        </button>
        <button type="button" onClick={(e) => { e.stopPropagation(); onRequestDelete(suite); }} className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg border border-rose-200 px-1.5 py-1.5 text-[11px] font-semibold text-rose-600 hover:bg-rose-50 dark:border-rose-500/30 dark:text-rose-300 dark:hover:bg-rose-500/10">
          <Trash2 className="h-3.5 w-3.5" />删除
        </button>
      </div>
    </article>
  );
}

const iconMap: Record<string, typeof Sparkles> = {
  Sparkles,
  FlaskConical,
  ShieldCheck,
  GitBranch,
};
