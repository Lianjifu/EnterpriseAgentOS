/**
 * ChannelCard — 列表行。
 */
import {
  CheckCircle2, CircleDot, Download, Power, Sparkles, Trash2,
} from 'lucide-react';
import {
  AdminListActions, AdminListIdentity, AdminListMetric, AdminListMetrics, AdminListRow,
  adminListActionBtn, adminListDangerBtn,
} from '@/components/feedback/AdminListRow';
import type { NotificationChannel } from '../schema';
import { KIND_META, STATUS_BADGE } from './constants';

interface ChannelCardProps {
  channel: NotificationChannel;
  selected: boolean;
  onToggleSelect: (id: string) => void;
  onSelect: (c: NotificationChannel) => void;
  onToggleStar: (id: string) => void;
  onEnable: (c: NotificationChannel) => void;
  onExportOne: (c: NotificationChannel) => void;
  onRequestDelete: (c: NotificationChannel) => void;
}

export function ChannelCard({
  channel, selected, onToggleSelect, onSelect, onToggleStar,
  onEnable, onExportOne, onRequestDelete,
}: ChannelCardProps) {
  const meta = KIND_META[channel.kind];
  const Icon = meta.icon;
  const badge = STATUS_BADGE[channel.status];
  const isActive = channel.status === 'active';

  return (
    <AdminListRow selected={selected}>
      <div
        role="button"
        tabIndex={0}
        onClick={() => onSelect(channel)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onSelect(channel);
          }
        }}
        aria-label={`查看渠道 ${channel.name}`}
        className="absolute inset-0 z-0 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--brand)]"
      />

      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onToggleSelect(channel.id); }}
        aria-label={selected ? `取消选择渠道 ${channel.id}` : `选择渠道 ${channel.id}`}
        aria-pressed={selected}
        className={`relative z-10 grid h-7 w-7 place-items-center rounded-lg ${selected ? 'bg-[var(--brand-light)] text-[var(--brand)]' : 'text-[var(--text-muted)] hover:bg-[var(--bg-hover)]'}`}
      >
        {selected ? <CheckCircle2 className="h-4 w-4" /> : <CircleDot className="h-4 w-4" />}
      </button>

      <AdminListIdentity>
        <div className="flex min-w-0 items-center gap-1.5">
          <span className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md ${meta.tone}`}><Icon className="h-3.5 w-3.5" /></span>
          <h3 className="truncate text-sm font-semibold group-hover:text-[var(--brand)]">{channel.name}</h3>
          <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold ${badge.className}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${badge.dot}`} aria-hidden="true" />{badge.label}
          </span>
        </div>
        <p className="mt-0.5 truncate text-[11px] text-[var(--text-muted)]">{channel.target} · {channel.description}</p>
      </AdminListIdentity>

      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onToggleStar(channel.id); }}
        aria-label={channel.starred ? `取消收藏 ${channel.name}` : `收藏 ${channel.name}`}
        aria-pressed={channel.starred}
        className={`relative z-10 grid h-7 w-7 place-items-center rounded-lg ${channel.starred ? 'text-amber-500' : 'text-[var(--text-muted)] hover:text-amber-500'}`}
      >
        <Sparkles className={`h-4 w-4 ${channel.starred ? 'fill-amber-400' : ''}`} />
      </button>

      <AdminListMetrics cols={3}>
        <AdminListMetric>今日 {channel.sentToday} 会话</AdminListMetric>
        <AdminListMetric>{channel.successRate}%</AdminListMetric>
        <AdminListMetric>{channel.lastUsed}</AdminListMetric>
      </AdminListMetrics>

      <AdminListActions>
        <button type="button" disabled={isActive} onClick={(e) => { e.stopPropagation(); onEnable(channel); }} className={adminListActionBtn}>
          {isActive ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Power className="h-3.5 w-3.5" />}
          {isActive ? '已启用' : '启用'}
        </button>
        <button type="button" onClick={(e) => { e.stopPropagation(); onExportOne(channel); }} className={adminListActionBtn}>
          <Download className="h-3.5 w-3.5" />导出
        </button>
        <button type="button" onClick={(e) => { e.stopPropagation(); onRequestDelete(channel); }} className={adminListDangerBtn}>
          <Trash2 className="h-3.5 w-3.5" />删除
        </button>
      </AdminListActions>
    </AdminListRow>
  );
}
