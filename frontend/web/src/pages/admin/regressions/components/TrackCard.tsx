/**
 * AdminRegressions — 追踪卡片。
 * 单条 RegressionTrack 的展示 + 选择/收藏/操作菜单。
 */
import { CheckCircle2, Copy, Edit3, MoreVertical, Search, Square, Star, Trash2 } from 'lucide-react';
import { Clock } from 'lucide-react';
import {
  AlertTriangle, ShieldAlert, ShieldCheck, ShieldQuestion,
} from 'lucide-react';
import type { RegressionTrack } from '@/api/admin/regressions/schema';
import { RISK_BADGE, STATUS_BADGE } from './constants';
import { Delta, Sparkline } from './Primitives';

const riskIconMap: Record<string, typeof ShieldCheck> = {
  ShieldCheck, ShieldQuestion, AlertTriangle, ShieldAlert,
};

interface TrackCardProps {
  track: RegressionTrack;
  selected: boolean;
  onToggleSelect: (id: string) => void;
  menuOpen: boolean;
  onToggleMenu: (id: string | null) => void;
  onSelect: (track: RegressionTrack) => void;
  onEdit: (track: RegressionTrack) => void;
  onToggleStar: (id: string) => void;
  onDuplicate: (track: RegressionTrack) => void;
  onRequestDelete: (track: RegressionTrack) => void;
  onInvestigate: (track: RegressionTrack) => void;
  onResolve: (track: RegressionTrack) => void;
}

export function TrackCard({
  track, selected, onToggleSelect, menuOpen, onToggleMenu, onSelect, onEdit, onToggleStar,
  onDuplicate, onRequestDelete, onInvestigate, onResolve,
}: TrackCardProps) {
  const badge = STATUS_BADGE[track.status];
  const risk = RISK_BADGE[track.risk];
  const RiskIcon = riskIconMap[risk.icon] ?? ShieldCheck;
  return (
    <article className={`group relative flex flex-col gap-4 rounded-2xl border bg-[var(--surface-1)] p-5 transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-sm)] ${selected ? 'border-[var(--brand)] shadow-[var(--shadow-sm)]' : 'border-[var(--border)] hover:border-[var(--brand)]'}`}>
      <div role="button" tabIndex={0} onClick={() => onSelect(track)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(track); } }} aria-label={`查看 ${track.name} 详情`} className="absolute inset-0 z-0 cursor-pointer rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)]" />
      <div className="relative z-10 flex items-start justify-between">
        <button type="button" onClick={(e) => { e.stopPropagation(); onToggleSelect(track.id); }} aria-label={selected ? `取消选择 ${track.name}` : `选择 ${track.name}`} aria-pressed={selected} className={`grid h-9 w-9 place-items-center rounded-lg transition ${selected ? 'bg-[var(--brand-light)] text-[var(--brand)]' : 'text-[var(--text-muted)] hover:bg-[var(--bg-hover)]'}`}>
          {selected ? <CheckCircle2 className="h-4 w-4" /> : <Square className="h-4 w-4" />}
        </button>
        <div className="flex items-center gap-1">
          <button type="button" aria-label={track.starred ? '取消收藏' : '收藏'} aria-pressed={track.starred} onClick={(e) => { e.stopPropagation(); onToggleStar(track.id); }} className={`grid h-9 w-9 place-items-center rounded-lg transition ${track.starred ? 'bg-amber-50 text-amber-500 dark:bg-amber-500/15' : 'text-[var(--text-muted)] hover:bg-[var(--bg-hover)] hover:text-amber-500'}`}>
            <Star className={`h-4 w-4 ${track.starred ? 'fill-current' : ''}`} />
          </button>
          <div className="relative">
            <button type="button" aria-label="操作菜单" aria-expanded={menuOpen} onClick={(e) => { e.stopPropagation(); onToggleMenu(menuOpen ? null : track.id); }} className="grid h-9 w-9 place-items-center rounded-lg text-[var(--text-muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--text)]">
              <MoreVertical className="h-4 w-4" />
            </button>
            {menuOpen && (
              <div role="menu" className="absolute right-0 top-10 z-30 w-44 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] py-1 shadow-lg" onClick={(e) => e.stopPropagation()}>
                <button type="button" role="menuitem" onClick={() => { onEdit(track); onToggleMenu(null); }} className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]">
                  <Edit3 className="h-3.5 w-3.5" />编辑
                </button>
                <button type="button" role="menuitem" onClick={() => { onDuplicate(track); onToggleMenu(null); }} className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]">
                  <Copy className="h-3.5 w-3.5" />复制追踪
                </button>
                {track.status === 'regressed' && (
                  <button type="button" role="menuitem" onClick={() => { onInvestigate(track); onToggleMenu(null); }} className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]">
                    <Search className="h-3.5 w-3.5" />标记排查中
                  </button>
                )}
                {track.status === 'investigating' && (
                  <button type="button" role="menuitem" onClick={() => { onResolve(track); onToggleMenu(null); }} className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]">
                    <CheckCircle2 className="h-3.5 w-3.5" />标记已解决
                  </button>
                )}
                <div className="my-1 h-px bg-[var(--border)]" />
                <button type="button" role="menuitem" onClick={() => { onRequestDelete(track); onToggleMenu(null); }} className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-rose-600 hover:bg-rose-50 dark:text-rose-300 dark:hover:bg-rose-500/15">
                  <Trash2 className="h-3.5 w-3.5" />删除
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="relative z-10">
        <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--text-muted)]">对象 · {track.agent}</p>
        <h4 className="mt-1.5 text-base font-semibold tracking-tight text-[var(--text)]">{track.name}</h4>
      </div>
      <div className="relative z-10 flex flex-wrap items-center gap-1.5">
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
      <div className="relative z-10 grid gap-2 rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] p-3 text-[11px]">
        <div className="flex items-center justify-between"><span className="text-[var(--text-muted)]">通过率</span><span className="font-semibold tabular-nums">{track.baseline.passRate.toFixed(1)}% → {track.current.passRate.toFixed(1)}%</span></div>
        <div className="flex items-center justify-between"><span className="text-[var(--text-muted)]">P95 延迟</span><span className="font-semibold tabular-nums">{track.baseline.latencyMs} ms → {track.current.latencyMs} ms</span></div>
        <div className="flex items-center justify-between"><span className="text-[var(--text-muted)]">单次成本</span><span className="font-semibold tabular-nums">¥ {track.baseline.cost.toFixed(1)} → ¥ {track.current.cost.toFixed(1)}</span></div>
      </div>
      <div className="relative z-10 flex flex-wrap items-center gap-2">
        <Delta value={track.passRateDelta} />
        <Delta value={track.latencyDelta} suffix=" ms" invertColor />
        <Delta value={track.costDelta} suffix=" ¥" invertColor />
        <Delta value={track.scoreDelta} />
        <Sparkline data={track.passRateTrend} stroke="var(--brand)" />
      </div>
      <div className="relative z-10 mt-auto flex items-center gap-2 border-t border-[var(--border)] pt-3 text-[11px] text-[var(--text-muted)]">
        <Clock className="h-3 w-3" />{track.lastCheckedAt}
        <span className="ml-auto">{track.cases} 用例 · {track.currentVersion}</span>
      </div>
    </article>
  );
}