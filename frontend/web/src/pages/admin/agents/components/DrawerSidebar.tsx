/**
 * Drawer 左侧垂直导航 + 批量操作工具栏。
 */
import { CheckCircle2, CheckSquare, Clock, Download, Trash2, X } from 'lucide-react';
import type { DrawerPanel } from '@/api/admin/agents/schema';
import { DRAWER_NAV_ITEMS } from './constants';

export function DrawerSidebar({ panel, setPanel }: { panel: DrawerPanel; setPanel: (p: DrawerPanel) => void }) {
  return (
    <nav aria-label="智能体工作区导航" className="hidden w-[220px] shrink-0 flex-col gap-1 border-r border-[var(--border)] bg-[var(--bg-elevated)] p-4 sm:flex">
      <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">工作区</p>
      {DRAWER_NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        const active = panel === item.id;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => setPanel(item.id)}
            aria-pressed={active}
            className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs font-semibold transition ${active ? 'bg-[var(--brand-light)] text-[var(--brand)]' : 'text-[var(--text-secondary)] hover:bg-[var(--surface-1)]'}`}
          >
            <Icon className="h-4 w-4" />
            {item.label}
          </button>
        );
      })}
    </nav>
  );
}

export function BatchToolbar({
  count, onClear, onBatchPublish, onBatchRetire, onBatchDelete, onBatchExport,
}: {
  count: number;
  onClear: () => void;
  onBatchPublish: () => void;
  onBatchRetire: () => void;
  onBatchDelete: () => void;
  onBatchExport: () => void;
}) {
  return (
    <section
      aria-label="批量操作"
      className="flex flex-wrap items-center gap-3 rounded-2xl border border-[var(--brand)] bg-[var(--brand-light)] px-4 py-3 sm:px-5"
    >
      <div className="flex items-center gap-2 text-sm font-semibold text-[var(--brand)]">
        <CheckSquare className="h-4 w-4" />已选 {count} 项
      </div>
      <div className="ml-auto flex flex-wrap items-center gap-2">
        <button type="button" onClick={onBatchPublish} className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--brand)] bg-[var(--surface-1)] px-3 py-1.5 text-[11px] font-semibold text-[var(--brand)] hover:bg-[var(--brand-light)]">
          <CheckCircle2 className="h-3.5 w-3.5" />批量发布
        </button>
        <button type="button" onClick={onBatchRetire} className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface-1)] px-3 py-1.5 text-[11px] font-semibold text-[var(--text-secondary)] hover:border-[var(--brand)] hover:text-[var(--brand)]">
          <Clock className="h-3.5 w-3.5" />批量下线
        </button>
        <button type="button" onClick={onBatchDelete} className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--danger)]/40 bg-[var(--surface-1)] px-3 py-1.5 text-[11px] font-semibold text-[var(--danger)] hover:bg-[var(--danger-bg)]">
          <Trash2 className="h-3.5 w-3.5" />批量删除
        </button>
        <button type="button" onClick={onBatchExport} className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface-1)] px-3 py-1.5 text-[11px] font-semibold text-[var(--text-secondary)] hover:border-[var(--brand)] hover:text-[var(--brand)]">
          <Download className="h-3.5 w-3.5" />批量导出
        </button>
        <button type="button" onClick={onClear} className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-semibold text-[var(--text-muted)] hover:text-[var(--brand)]">
          <X className="h-3.5 w-3.5" />取消选择
        </button>
      </div>
    </section>
  );
}
