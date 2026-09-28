/**
 * 批量/单条删除确认对话框 — 必须输入智能体名称才能删除(防止误操作)。
 */
import { useState } from 'react';
import { AlertTriangle, Trash2 } from 'lucide-react';
import { CenterModal } from '@/components/feedback/CenterModal';

export interface DeletePayload {
  kind: 'single' | 'bulk';
  agentName?: string;
  agentNames?: string[];
}

export function DeleteConfirmModal({
  open, payload, onClose, onConfirm,
}: {
  open: boolean;
  payload: DeletePayload | null;
  onClose: () => void;
  onConfirm: (force: boolean) => void;
}) {
  const [confirmText, setConfirmText] = useState('');
  const isBulk = payload?.kind === 'bulk';
  const singleName = payload?.kind === 'single' ? (payload.agentName ?? '') : '';
  const bulkNames = payload?.kind === 'bulk' ? (payload.agentNames ?? []) : [];

  const expectedName = isBulk
    ? `${bulkNames.length} 个智能体`
    : singleName;
  const canConfirm = isBulk
    ? confirmText.trim().length > 0 && (confirmText.trim() === bulkNames.length.toString() || confirmText.trim().toLowerCase() === '确认' || confirmText.trim().toLowerCase() === 'yes')
    : confirmText.trim() === singleName;

  const title = (
    <span className="flex items-center gap-2 text-[var(--danger)]">
      <AlertTriangle className="h-5 w-5" />
      {isBulk ? `批量删除 ${bulkNames.length} 个智能体` : `删除「${singleName}」`}
    </span>
  );
  const description = isBulk
    ? `此操作将同时下线所有已选智能体,删除其版本与评估历史。`
    : `此操作将下线智能体并保留 30 天回收窗口,期间可联系运维恢复。`;

  const footer = (
    <>
      <button type="button" onClick={onClose} className="rounded-xl border border-[var(--border)] px-4 py-2 text-xs font-semibold text-[var(--text-secondary)] hover:border-[var(--brand)]">取消</button>
      <button
        type="button"
        onClick={() => onConfirm(false)}
        disabled={!canConfirm}
        className="inline-flex items-center gap-2 rounded-xl bg-[var(--danger)] px-4 py-2 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-50"
      >
        <Trash2 className="h-3.5 w-3.5" />
        {isBulk ? `确认删除 ${bulkNames.length} 个` : '确认删除'}
      </button>
    </>
  );

  return (
    <CenterModal
      open={open}
      onClose={onClose}
      ariaLabel="删除确认"
      title={title}
      description={description}
      panelClassName="max-w-md"
      footer={footer}
    >
      <div className="mt-5 space-y-4">
        {isBulk ? (
          <div className="max-h-40 overflow-auto rounded-xl border border-[var(--danger)]/30 bg-[var(--danger-bg)]/40 p-3 text-xs text-[var(--danger)]">
            <p className="font-semibold">即将删除以下 {bulkNames.length} 个智能体:</p>
            <ul className="mt-2 space-y-0.5">
              {bulkNames.map((name) => (
                <li key={name} className="font-mono text-[11px]">· {name}</li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="rounded-xl border border-[var(--danger)]/30 bg-[var(--danger-bg)]/40 p-3 text-xs text-[var(--danger)]">
            此操作不可撤销(30 天回收窗口外),评估历史、调用配额与外部引用都将断开。
          </div>
        )}
        <div>
          <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">
            {isBulk ? `请输入「${bulkNames.length}」以确认` : `请输入智能体名称「${singleName}」以确认`}
          </label>
          <input
            type="text"
            value={confirmText}
            onChange={(event) => setConfirmText(event.target.value)}
            placeholder={isBulk ? `输入 ${bulkNames.length} 或确认` : singleName}
            className="mt-1.5 h-10 w-full rounded-xl border border-[var(--danger)]/40 bg-[var(--bg-elevated)] px-3 text-sm outline-none focus:border-[var(--danger)]"
            autoFocus
          />
        </div>
        <p className="text-[11px] text-[var(--text-muted)]">提示:删除后将通知所有引用方该智能体已下线,并触发工作流关联告警。</p>
      </div>
    </CenterModal>
  );
}