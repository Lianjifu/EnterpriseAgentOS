/**
 * Webhook 列表卡片 — webhook tab 专用展示,只读(暂无 inline mutation)。
 */
import { Webhook } from 'lucide-react';
import type { WebhookCardProps } from './constants';

export function WebhookCard({ webhook: w }: WebhookCardProps) {
  return (
    <article className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-5">
      <header className="flex flex-wrap items-center gap-2">
        <span className="grid h-9 w-9 place-items-center rounded-lg bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
          <Webhook className="h-4 w-4" />
        </span>
        <h4 className="text-sm font-semibold">{w.name}</h4>
        <span className="rounded-full bg-[var(--bg-elevated)] px-2 py-0.5 text-[10px] font-medium">{w.method}</span>
        <span className={`ml-auto inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${w.enabled ? 'bg-emerald-50 text-emerald-700' : 'bg-[var(--bg-elevated)] text-[var(--text-muted)]'}`}>
          {w.enabled ? '已启用' : '已停用'}
        </span>
      </header>
      <p className="mt-2 font-mono text-[11px] text-[var(--text-muted)]">{w.url}</p>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px]">
        <span className="rounded-lg bg-[var(--bg-elevated)] px-2 py-1 font-mono">{w.secret}</span>
        {w.eventFilter.map((e) => (
          <span key={e} className="rounded-lg bg-violet-50 px-2 py-1 font-medium text-violet-700 dark:bg-violet-500/15 dark:text-violet-300">{e}</span>
        ))}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] sm:grid-cols-3">
        <div><span className="text-[var(--text-muted)]">最近投递</span><br /><span className="font-semibold">{w.lastDelivery}</span></div>
        <div><span className="text-[var(--text-muted)]">状态</span><br /><span className="font-semibold">{w.status === 'success' ? '成功' : w.status === 'failed' ? '失败' : '待启用'}</span></div>
        <div><span className="text-[var(--text-muted)]">重试次数</span><br /><span className="font-semibold tabular-nums">{w.retry}</span></div>
      </div>
    </article>
  );
}