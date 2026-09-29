/**
 * SelectFlowModal — 节点库 / 集成 等场景中,选择目标工作流的弹窗。
 *
 * 只列出非 retired 状态的 flows。
 */
import { useState } from 'react';
import { CenterModal } from '@/components/feedback/CenterModal';
import type { Flow } from '@/api/admin/workflows/schema';
import { STATUS_BADGE } from './constants';

interface SelectFlowModalProps {
  open: boolean;
  onClose: () => void;
  flows: Flow[];
  title?: string;
  description?: string;
  onPick: (flow: Flow) => void;
}

export function SelectFlowModal({ open, onClose, flows, title = '选择目标工作流', description, onPick }: SelectFlowModalProps) {
  const candidates = flows.filter((f) => f.status !== 'retired');
  const [selectedId, setSelectedId] = useState<string>(candidates[0]?.id ?? '');

  return (
    <CenterModal
      open={open}
      onClose={onClose}
      ariaLabel="选择目标工作流"
      title={title}
      description={description ?? '选择要把节点加入或绑定的目标工作流。'}
      onSubmit={(event) => {
        event.preventDefault();
        const picked = candidates.find((f) => f.id === selectedId);
        if (picked) onPick(picked);
      }}
      footer={
        <>
          <button type="button" onClick={onClose} className="rounded-lg border border-[var(--border)] px-3 py-2 text-xs font-semibold text-[var(--text-secondary)] hover:border-[var(--brand)] hover:text-[var(--brand)]">取消</button>
          <button
            type="submit"
            disabled={!selectedId}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--brand)] px-4 py-2 text-xs font-semibold text-white hover:bg-[var(--brand-hover)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            确认
          </button>
        </>
      }
    >
      <div className="mt-4 max-h-72 overflow-y-auto rounded-xl border border-[var(--border)] bg-[var(--bg-app)]">
        {candidates.length === 0 && (
          <p className="p-6 text-center text-xs text-[var(--text-muted)]">暂无可选的工作流</p>
        )}
        {candidates.map((f) => {
          const badge = STATUS_BADGE[f.status];
          return (
            <label
              key={f.id}
              className={`flex cursor-pointer items-center gap-3 border-b border-[var(--border)] px-3 py-2.5 text-xs last:border-b-0 hover:bg-[var(--bg-hover)] ${selectedId === f.id ? 'bg-[var(--brand-light)]' : ''}`}
            >
              <input
                type="radio"
                name="select-flow"
                value={f.id}
                checked={selectedId === f.id}
                onChange={() => setSelectedId(f.id)}
                className="accent-[var(--brand)]"
              />
              <span className="flex-1 truncate font-medium text-[var(--text)]">{f.name}</span>
              <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${badge.className}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${badge.dot}`} />{badge.label}
              </span>
            </label>
          );
        })}
      </div>
    </CenterModal>
  );
}