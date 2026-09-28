/**
 * 渠道卡片 — overview / email / im 三个 tab 共用。
 * 卡片可整卡点击打开 drawer,左上圆圈做"批量选择",右上星做"收藏"。
 */
import { CheckCircle2, CircleDot, Sparkles } from 'lucide-react';
import type { ChannelCardProps } from './constants';
import { KIND_META, STATUS_BADGE } from './constants';

export function ChannelCard({ channel, selected, onToggleSelect, onSelect, onToggleStar }: ChannelCardProps) {
  const meta = KIND_META[channel.kind];
  const Icon = meta.icon;
  const badge = STATUS_BADGE[channel.status];
  return (
    <article className={`group relative rounded-2xl border bg-[var(--surface-1)] p-5 transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-sm)] ${selected ? 'border-[var(--brand)] shadow-[var(--shadow-sm)]' : 'border-[var(--border)] hover:border-[var(--brand)]'}`}>
      <div
        role="button"
        tabIndex={0}
        onClick={() => onSelect(channel)}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(channel); } }}
        aria-label={`查看渠道 ${channel.name}`}
        className="absolute inset-0 z-0 cursor-pointer rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)]"
      />
      <div className="relative z-10 flex items-start gap-2">
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onToggleSelect(channel.id); }}
          aria-label={selected ? `取消选择渠道 ${channel.id}` : `选择渠道 ${channel.id}`}
          aria-pressed={selected}
          className={`grid h-9 w-9 place-items-center rounded-lg transition ${selected ? 'bg-[var(--brand-light)] text-[var(--brand)]' : 'text-[var(--text-muted)] hover:bg-[var(--bg-hover)]'}`}
        >
          {selected ? <CheckCircle2 className="h-4 w-4" /> : <CircleDot className="h-4 w-4" />}
        </button>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onToggleStar(channel.id); }}
          aria-label={channel.starred ? `取消收藏 ${channel.name}` : `收藏 ${channel.name}`}
          aria-pressed={channel.starred}
          className={`grid h-9 w-9 place-items-center rounded-lg transition ${channel.starred ? 'bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300' : 'text-[var(--text-muted)] hover:bg-[var(--bg-hover)]'}`}
        >
          <Sparkles className={`h-4 w-4 ${channel.starred ? 'fill-amber-400' : ''}`} />
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`inline-flex h-6 w-6 items-center justify-center rounded-md ${meta.tone}`}><Icon className="h-3.5 w-3.5" /></span>
            <h3 className="text-sm font-semibold">{channel.name}</h3>
            <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold ${badge.className}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${badge.dot}`} aria-hidden="true" />{badge.label}
            </span>
          </div>
          <p className="mt-1.5 line-clamp-2 text-[11px] leading-5 text-[var(--text-muted)]">{channel.description}</p>
          <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] sm:grid-cols-3">
            <div><span className="text-[var(--text-muted)]">目标</span><br /><span className="font-mono font-semibold">{channel.target}</span></div>
            <div><span className="text-[var(--text-muted)]">今日投递</span><br /><span className="font-semibold tabular-nums">{channel.sentToday}</span></div>
            <div><span className="text-[var(--text-muted)]">成功率</span><br /><span className="font-semibold tabular-nums">{channel.successRate}%</span></div>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <span className="rounded-full bg-[var(--bg-elevated)] px-2 py-0.5 text-[10px] font-medium">最近:{channel.lastUsed}</span>
            {channel.scope.map((s) => (
              <span key={s} className="rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-medium text-violet-700 dark:bg-violet-500/15 dark:text-violet-300">{s}</span>
            ))}
          </div>
        </div>
      </div>
    </article>
  );
}