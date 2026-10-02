/**
 * 告警详情 — SideDrawer 主体。
 */
import type { OverviewAlert } from '../schema';

export function AlertDetail({ alert }: { alert: OverviewAlert }) {
  return (
    <div className="mt-6 space-y-6">
      <div>
        <h3 className="text-xl font-semibold">{alert.title}</h3>
        <p className="mt-2 text-sm text-[var(--text-muted)]">影响范围：{alert.affected}</p>
      </div>
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-5">
        <p className="text-xs font-semibold text-[var(--brand)]">建议处理</p>
        <p className="mt-2 text-sm leading-6">{alert.suggestion}</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-[var(--border)] p-4">
          <p className="text-xs text-[var(--text-muted)]">首次出现</p>
          <p className="mt-1 text-sm font-semibold">{alert.time}</p>
        </div>
        <div className="rounded-xl border border-[var(--border)] p-4">
          <p className="text-xs text-[var(--text-muted)]">处理状态</p>
          <p className="mt-1 text-sm font-semibold">待处理</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" className="inline-flex items-center gap-2 rounded-xl bg-[var(--brand)] px-4 py-2 text-xs font-semibold text-white hover:bg-[var(--brand-hover)]">立即处理</button>
        <button type="button" className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] px-4 py-2 text-xs font-semibold hover:border-[var(--brand)]">分派同事</button>
        <button type="button" className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] px-4 py-2 text-xs font-semibold hover:border-[var(--brand)]">稍后处理</button>
      </div>
    </div>
  );
}