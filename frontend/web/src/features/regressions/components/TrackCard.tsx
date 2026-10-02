/**
 * AdminRegressions — 追踪卡片。
 * 单条 RegressionTrack 的展示 + 选择/收藏/操作栏。
 */
import {
  AlertTriangle, CheckCircle2, CheckSquare, Copy, Edit3, Search, ShieldAlert, ShieldCheck, ShieldQuestion, Square, Star, Trash2,
} from 'lucide-react';
import { Clock } from 'lucide-react';
import type { MouseEvent } from 'react';
import type { RegressionTrack } from '../schema';
import { RISK_BADGE, STATUS_BADGE } from './constants';
import { Delta, Sparkline } from './Primitives';

const riskIconMap: Record<string, typeof ShieldCheck> = {
  ShieldCheck, ShieldQuestion, AlertTriangle, ShieldAlert,
};

interface TrackCardProps {
  track: RegressionTrack;
  selected: boolean;
  onToggleSelect: (id: string) => void;
  onSelect: (track: RegressionTrack) => void;
  onEdit: (track: RegressionTrack) => void;
  onToggleStar: (id: string) => void;
  onDuplicate: (track: RegressionTrack) => void;
  onRequestDelete: (track: RegressionTrack) => void;
  onInvestigate: (track: RegressionTrack) => void;
  onResolve: (track: RegressionTrack) => void;
}

export function TrackCard({
  track, selected, onToggleSelect, onSelect, onEdit, onToggleStar,
  onDuplicate, onRequestDelete, onInvestigate, onResolve,
}: TrackCardProps) {
  const badge = STATUS_BADGE[track.status];
  const risk = RISK_BADGE[track.risk];
  const RiskIcon = riskIconMap[risk.icon] ?? ShieldCheck;

  const lifecycleLabel =
    track.status === 'regressed' ? '排查' :
    track.status === 'investigating' ? '解决' : '稳定';
  const lifecycleEnabled = track.status === 'regressed' || track.status === 'investigating';
  const LifecycleIcon =
    track.status === 'investigating' ? CheckCircle2 : Search;

  const handleLifecycle = (event: MouseEvent) => {
    event.stopPropagation();
    if (track.status === 'regressed') onInvestigate(track);
    else if (track.status === 'investigating') onResolve(track);
  };

  return (
    <article className={`group relative flex flex-col gap-4 rounded-2xl border bg-[var(--surface-1)] p-5 transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-sm)] ${selected ? 'border-[var(--brand)] shadow-[var(--shadow-sm)]' : 'border-[var(--border)] hover:border-[var(--brand)]'}`}>
      <div role="button" tabIndex={0} onClick={() => onSelect(track)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(track); } }} aria-label={`查看 ${track.name} 详情`} className="absolute inset-0 z-0 cursor-pointer rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)]" />
      <div className="relative z-10 flex items-start justify-between">
        <button type="button" onClick={(e) => { e.stopPropagation(); onToggleSelect(track.id); }} aria-label={selected ? `取消选择 ${track.name}` : `选择 ${track.name}`} aria-pressed={selected} className={`grid h-9 w-9 place-items-center rounded-lg transition ${selected ? 'bg-[var(--brand-light)] text-[var(--brand)]' : 'text-[var(--text-muted)] hover:bg-[var(--bg-hover)]'}`}>
          {selected ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}
        </button>
        <button type="button" aria-label={track.starred ? '取消收藏' : '收藏'} aria-pressed={track.starred} onClick={(e) => { e.stopPropagation(); onToggleStar(track.id); }} className={`grid h-9 w-9 place-items-center rounded-lg transition ${track.starred ? 'bg-amber-50 text-amber-500 dark:bg-amber-500/15' : 'text-[var(--text-muted)] hover:bg-[var(--bg-hover)] hover:text-amber-500'}`}>
          <Star className={`h-4 w-4 ${track.starred ? 'fill-current' : ''}`} />
        </button>
      </div>
      <div className="pointer-events-none relative z-10">
        <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--text-muted)]">对象 · {track.agent}</p>
        <h4 className="mt-1.5 text-base font-semibold tracking-tight text-[var(--text)]">{track.name}</h4>
      </div>
      <div className="pointer-events-none relative z-10 flex flex-wrap items-center gap-1.5">
        <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold ${badge.className}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${badge.dot}`} aria-hidden="true" />
          {badge.label}
        </span>
        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${risk.className}`}>
          <RiskIcon className="h-3 w-3" />{risk.label}
        </span>
        {track.tags.map((t) => (
          <span key={t} className="rounded-full bg-[var(--bg-elevated)] px-2 py-0.5 text-[10px] font-medium text-[var(--text-secondary)]">{t}</span>
        ))}
      </div>
      <div className="pointer-events-none relative z-10 grid gap-2 rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] p-3 text-[11px]">
        <div className="flex items-center justify-between"><span className="text-[var(--text-muted)]">通过率</span><span className="font-semibold tabular-nums">{track.baseline.passRate.toFixed(1)}% → {track.current.passRate.toFixed(1)}%</span></div>
        <div className="flex items-center justify-between"><span className="text-[var(--text-muted)]">P95 延迟</span><span className="font-semibold tabular-nums">{track.baseline.latencyMs} ms → {track.current.latencyMs} ms</span></div>
        <div className="flex items-center justify-between"><span className="text-[var(--text-muted)]">单次成本</span><span className="font-semibold tabular-nums">¥ {track.baseline.cost.toFixed(1)} → ¥ {track.current.cost.toFixed(1)}</span></div>
      </div>
      <div className="pointer-events-none relative z-10 flex flex-wrap items-center gap-2">
        <Delta value={track.passRateDelta} />
        <Delta value={track.latencyDelta} suffix=" ms" invertColor />
        <Delta value={track.costDelta} suffix=" ¥" invertColor />
        <Delta value={track.scoreDelta} />
        <Sparkline data={track.passRateTrend} stroke="var(--brand)" />
      </div>
      <div className="pointer-events-none relative z-10 mt-auto flex items-center gap-2 border-t border-[var(--border)] pt-3 text-[11px] text-[var(--text-muted)]">
        <Clock className="h-3 w-3" />{track.lastCheckedAt}
        <span className="ml-auto">{track.cases} 用例 · {track.currentVersion}</span>
      </div>
      <div className="relative z-10 flex flex-wrap gap-1.5 border-t border-[var(--border)] pt-3">
        <button type="button" onClick={(event) => { event.stopPropagation(); onEdit(track); }} className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg border border-[var(--border)] px-1.5 py-1.5 text-[11px] font-semibold text-[var(--text-secondary)] hover:border-[var(--brand)] hover:text-[var(--brand)]">
          <Edit3 className="h-3.5 w-3.5" />编辑
        </button>
        <button
          type="button"
          disabled={!lifecycleEnabled}
          onClick={handleLifecycle}
          className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg border border-[var(--border)] px-1.5 py-1.5 text-[11px] font-semibold text-[var(--text-secondary)] hover:border-[var(--brand)] hover:text-[var(--brand)] disabled:cursor-default disabled:opacity-40 disabled:hover:border-[var(--border)] disabled:hover:text-[var(--text-secondary)]"
        >
          <LifecycleIcon className="h-3.5 w-3.5" />{lifecycleLabel}
        </button>
        <button type="button" onClick={(event) => { event.stopPropagation(); onDuplicate(track); }} className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg border border-[var(--border)] px-1.5 py-1.5 text-[11px] font-semibold text-[var(--text-secondary)] hover:border-[var(--brand)] hover:text-[var(--brand)]">
          <Copy className="h-3.5 w-3.5" />复制
        </button>
        <button type="button" onClick={(event) => { event.stopPropagation(); onRequestDelete(track); }} className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg border border-rose-200 px-1.5 py-1.5 text-[11px] font-semibold text-rose-600 hover:bg-rose-50 dark:border-rose-500/30 dark:text-rose-300 dark:hover:bg-rose-500/10">
          <Trash2 className="h-3.5 w-3.5" />删除
        </button>
      </div>
    </article>
  );
}
