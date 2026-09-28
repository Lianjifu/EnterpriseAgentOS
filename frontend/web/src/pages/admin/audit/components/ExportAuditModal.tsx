/**
 * ExportAuditModal — 导出 JSON / CSV。
 */
import { useEffect, useState } from 'react';
import { Download } from 'lucide-react';
import { CenterModal } from '@/components/feedback/CenterModal';

export type ExportFormat = 'json' | 'csv';

interface ExportAuditModalProps {
  open: boolean;
  onClose: () => void;
  onExport: (format: ExportFormat) => void;
  total: number;
  selectedCount: number;
}

export function ExportAuditModal({ open, onClose, onExport, total, selectedCount }: ExportAuditModalProps) {
  const [format, setFormat] = useState<ExportFormat>('json');
  useEffect(() => {
    if (open) setFormat('json');
  }, [open]);
  return (
    <CenterModal
      open={open}
      onClose={onClose}
      ariaLabel="导出审计"
      panelClassName="max-w-md"
      title={
        <span className="flex items-center gap-2">
          <Download className="h-5 w-5 text-[var(--brand)]" />
          导出审计数据
        </span>
      }
      description={`将导出${selectedCount > 0 ? `已选的 ${selectedCount} 条` : `全部 ${total} 条`}审计记录。`}
      footer={
        <>
          <button type="button" onClick={onClose} className="rounded-xl border border-[var(--border)] px-4 py-2 text-xs font-semibold">
            取消
          </button>
          <button
            type="button"
            onClick={() => {
              onExport(format);
              onClose();
            }}
            className="rounded-xl bg-[var(--brand)] px-4 py-2 text-xs font-semibold text-white"
          >
            开始导出
          </button>
        </>
      }
    >
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {(['json', 'csv'] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFormat(f)}
            aria-pressed={format === f}
            className={`rounded-xl border p-3 text-xs font-semibold transition ${format === f ? 'border-[var(--brand)] bg-[var(--brand-light)]/40' : 'border-[var(--border)] hover:border-[var(--brand)]'}`}
          >
            {f.toUpperCase()}
          </button>
        ))}
      </div>
    </CenterModal>
  );
}