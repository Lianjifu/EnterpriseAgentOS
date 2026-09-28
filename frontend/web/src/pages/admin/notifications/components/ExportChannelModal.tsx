/**
 * 导出渠道模态 — JSON / YAML 二选一。
 * 选中时导出已选条目,未选中时导出全部。
 */
import { useEffect, useState } from 'react';
import { Send } from 'lucide-react';
import { CenterModal } from '@/components/feedback/CenterModal';
import type { ExchangeFormat } from './constants';

interface ExportChannelModalProps {
  open: boolean;
  onClose: () => void;
  onExport: (format: ExchangeFormat) => void;
  total: number;
  selectedCount: number;
}

export function ExportChannelModal({ open, onClose, onExport, total, selectedCount }: ExportChannelModalProps) {
  const [format, setFormat] = useState<ExchangeFormat>('json');
  useEffect(() => { if (open) setFormat('json'); }, [open]);
  return (
    <CenterModal
      open={open}
      onClose={onClose}
      ariaLabel="导出渠道"
      panelClassName="max-w-md"
      title={<span className="flex items-center gap-2"><Send className="h-5 w-5 text-[var(--brand)]" />导出渠道</span>}
      description={`将导出${selectedCount > 0 ? `已选的 ${selectedCount} 条` : `全部 ${total} 条`}渠道。`}
      footer={
        <>
          <button type="button" onClick={onClose} className="rounded-xl border border-[var(--border)] px-4 py-2 text-xs font-semibold">取消</button>
          <button type="button" onClick={() => { onExport(format); onClose(); }} className="rounded-xl bg-[var(--brand)] px-4 py-2 text-xs font-semibold text-white">开始导出</button>
        </>
      }
    >
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {(['json', 'yaml'] as const).map((f) => (
          <button key={f} type="button" onClick={() => setFormat(f)} aria-pressed={format === f} className={`rounded-xl border p-3 text-xs font-semibold transition ${format === f ? 'border-[var(--brand)] bg-[var(--brand-light)]/40' : 'border-[var(--border)] hover:border-[var(--brand)]'}`}>{f.toUpperCase()}</button>
        ))}
      </div>
    </CenterModal>
  );
}