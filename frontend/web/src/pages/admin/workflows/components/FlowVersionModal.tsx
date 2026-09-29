/**
 * FlowVersionModal — 工作流版本历史弹窗。
 */
import { Rocket } from 'lucide-react';
import { CenterModal } from '@/components/feedback/CenterModal';
import type { Flow } from '@/api/admin/workflows/schema';

export function FlowVersionModal({ open, onClose, flow }: { open: boolean; onClose: () => void; flow: Flow | null }) {
  return (
    <CenterModal
      open={open}
      onClose={onClose}
      ariaLabel="版本历史"
      title={flow ? `${flow.name} · 版本历史` : '版本历史'}
      description="每次发布都会生成一条版本记录"
      panelClassName="max-w-2xl"
      footer={
        <div className="flex w-full items-center justify-end gap-2">
          <button type="button" onClick={onClose} className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-3 py-2 text-xs font-semibold text-[var(--text-secondary)] hover:border-[var(--brand)] hover:text-[var(--brand)]">关闭</button>
          <button type="button" onClick={onClose} className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--brand)] px-3 py-2 text-xs font-semibold text-white hover:bg-[var(--brand-hover)]">
            <Rocket className="h-3.5 w-3.5" />发布新版本
          </button>
        </div>
      }
    >
      <ol className="space-y-3">
        {flow?.versions.map((v, i) => (
          <li key={`${v.v}-${i}`} className="relative rounded-xl border border-[var(--border)] bg-[var(--surface-1)] px-4 py-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">{v.v}</p>
              <p className="text-[10px] text-[var(--text-muted)]">{v.at} · {v.operator}</p>
            </div>
            <p className="mt-1 text-xs text-[var(--text-muted)]">{v.note}</p>
          </li>
        ))}
      </ol>
    </CenterModal>
  );
}