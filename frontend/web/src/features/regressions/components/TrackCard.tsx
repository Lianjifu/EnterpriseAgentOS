/**
 * AdminRegressions — 追踪列表行。
 */
import {
  AlertTriangle, CheckCircle2, CheckSquare, Copy, Search, ShieldAlert, ShieldCheck, ShieldQuestion, Square, Star, Trash2,
} from 'lucide-react';
import { Clock } from 'lucide-react';
import type { MouseEvent } from 'react';
import {
  AdminListActions, AdminListIdentity, AdminListMetric, AdminListMetrics, AdminListRow,
  adminListActionBtn, adminListDangerBtn,
} from '@/components/feedback/AdminListRow';
import type { RegressionTrack } from '../schema';
import { RISK_BADGE, STATUS_BADGE } from './constants';
import { Delta } from './Primitives';

const riskIconMap: Record<string, typeof ShieldCheck> = {
  ShieldCheck, ShieldQuestion, AlertTriangle, ShieldAlert,
};

interface TrackCardProps {
  track: RegressionTrack;
  selected: boolean;
  onToggleSelect: (id: string) => void;
  onSelect: (track: RegressionTrack) => void;
  onToggleStar: (id: string) => void;
  onDuplicate: (track: RegressionTrack) => void;
  onRequestDelete: (track: RegressionTrack) => void;
  onInvestigate: (track: RegressionTrack) => void;
  onResolve: (track: RegressionTrack) => void;
}

export function TrackCard({
  track, selected, onToggleSelect, onSelect, onToggleStar,
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
    <AdminListRow selected={selected}>
      <div role="button" tabIndex={0} onClick={() => onSelect(track)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(track); } }} aria-label={`查看 ${track.name} 详情`} className="absolute inset-0 z-0 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--brand)]" />
      <button type="button" onClick={(e) => { e.stopPropagation(); onToggleSelect(track.id); }} aria-label={selected ? `取消选择 ${track.name}` : `选择 ${track.name}`} aria-pressed={selected} className={`relative z-10 grid h-7 w-7 place-items-center rounded-lg ${selected ? 'bg-[var(--brand-light)] text-[var(--brand)]' : 'text-[var(--text-muted)] hover:bg-[var(--bg-hover)]'}`}>
        {selected ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}
      </button>
      <AdminListIdentity>
        <div className="flex min-w-0 items-center gap-1.5">
          <h4 className="truncate text-sm font-semibold group-hover:text-[var(--brand)]">{track.name}</h4>
          <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold ${badge.className}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${badge.dot}`} aria-hidden="true" />{badge.label}
          </span>
          <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${risk.className}`}>
            <RiskIcon className="h-3 w-3" />{risk.label}
          </span>
        </div>
        <p className="mt-0.5 truncate text-[11px] text-[var(--text-muted)]">对象 · {track.agent} · {track.cases} 用例 · {track.currentVersion}</p>
      </AdminListIdentity>
      <button type="button" aria-label={track.starred ? '取消收藏' : '收藏'} aria-pressed={track.starred} onClick={(e) => { e.stopPropagation(); onToggleStar(track.id); }} className={`relative z-10 grid h-7 w-7 place-items-center rounded-lg ${track.starred ? 'text-amber-500' : 'text-[var(--text-muted)] hover:text-amber-500'}`}>
        <Star className={`h-4 w-4 ${track.starred ? 'fill-current' : ''}`} />
      </button>
      <AdminListMetrics cols={3}>
        <span className="flex justify-end"><Delta value={track.passRateDelta} /></span>
        <span className="flex justify-end"><Delta value={track.latencyDelta} suffix=" ms" invertColor /></span>
        <AdminListMetric>
          <span className="inline-flex items-center justify-end gap-1"><Clock className="h-3 w-3" />{track.lastCheckedAt}</span>
        </AdminListMetric>
      </AdminListMetrics>
      <AdminListActions>
        <button type="button" disabled={!lifecycleEnabled} onClick={handleLifecycle} className={adminListActionBtn}>
          <LifecycleIcon className="h-3.5 w-3.5" />{lifecycleLabel}
        </button>
        <button type="button" onClick={(event) => { event.stopPropagation(); onDuplicate(track); }} className={adminListActionBtn}>
          <Copy className="h-3.5 w-3.5" />复制
        </button>
        <button type="button" onClick={(event) => { event.stopPropagation(); onRequestDelete(track); }} className={adminListDangerBtn}>
          <Trash2 className="h-3.5 w-3.5" />删除
        </button>
      </AdminListActions>
    </AdminListRow>
  );
}
