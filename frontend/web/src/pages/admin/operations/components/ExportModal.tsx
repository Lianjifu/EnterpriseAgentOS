/**
 * ExportTraceModal — JSON / YAML 二选一导出链路。
 */
import { useEffect, useState } from 'react';
import { FileText } from 'lucide-react';
import { CenterModal } from '@/components/feedback/CenterModal';
import type { ExchangeFormat } from '@/api/admin/operations/schema';

export function ExportTraceModal({
  open,
  onClose,
  onExport,
  total,
  selectedCount,
}: {
  open: boolean;
  onClose: () => void;
  onExport: (format: ExchangeFormat) => void;
  total: number;
  selectedCount: number;
}) {
  const [format, setFormat] = useState<ExchangeFormat>('json');
  useEffect(() => {
    if (open) setFormat('json');
  }, [open]);
  return (
    <CenterModal
      open={open}
      onClose={onClose}
      ariaLabel="导出链路"
      panelClassName="max-w-md"
      title={
        <span className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-[var(--brand)]" />
          导出调用链路
        </span>
      }
      description={`将导出${selectedCount > 0 ? `已选的 ${selectedCount} 条` : `全部 ${total} 条`}会话。`}
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
        {(['json', 'yaml'] as const).map((f) => (
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