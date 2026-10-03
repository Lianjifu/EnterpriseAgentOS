import { useState, type FormEvent } from 'react';
import { CenterModal } from '@/components/feedback/CenterModal';
import type { Capability } from '../schema';

interface UseModalProps {
  target: Capability | null;
  onClose: () => void;
  onConfirm: (goal: string) => void;
}

export function UseModal({ target, onClose, onConfirm }: UseModalProps) {
  const [goal, setGoal] = useState('');
  return (
    <CenterModal
      open={target !== null}
      onClose={() => {
        setGoal('');
        onClose();
      }}
      ariaLabel={target ? `使用${target.name}` : '使用能力'}
      title={target ? `使用能力：${target.name}` : '使用能力'}
      description="填写这次使用的目标，确认后会记录到最近使用，不会触发真实执行。"
      closeLabel="关闭使用能力窗口"
      onSubmit={(event: FormEvent) => {
        event.preventDefault();
        onConfirm(goal);
        setGoal('');
      }}
      footer={
        <>
          <button
            type="button"
            onClick={() => {
              setGoal('');
              onClose();
            }}
            className="rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm font-medium"
          >
            取消
          </button>
          <button type="submit" className="rounded-xl bg-[var(--brand)] px-4 py-2.5 text-sm font-semibold text-white">
            确认使用
          </button>
        </>
      }
    >
      <label className="mt-6 block text-xs font-semibold">
        本次任务目标
        <textarea
          autoFocus
          value={goal}
          onChange={(event) => setGoal(event.target.value)}
          required
          placeholder="例如：整理本周客户反馈并提取三个行动项"
          className="mt-2 min-h-24 w-full resize-y rounded-xl border border-[var(--border-strong)] bg-[var(--bg-elevated)] p-3 text-sm font-normal outline-none focus:border-[var(--brand)]"
        />
      </label>
    </CenterModal>
  );
}