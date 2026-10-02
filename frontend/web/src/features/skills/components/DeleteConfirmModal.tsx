import { Trash2 } from 'lucide-react';
import { CenterModal } from '@/components/feedback/CenterModal';
import type { Skill } from '../schema';
import { STATUS_BADGE } from './constants';

interface DeleteConfirmModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  skill: Skill | null;
}

export function DeleteConfirmModal({ open, onClose, onConfirm, skill }: DeleteConfirmModalProps) {
  if (!skill) return null;
  const affectedAgents = skill.usedByAgents.length;
  return (
    <CenterModal
      open={open}
      onClose={onClose}
      ariaLabel="删除技能"
      panelClassName="max-w-md"
      title={<span className="flex items-center gap-2"><Trash2 className="h-5 w-5 text-rose-600" />删除技能:{skill.name}</span>}
      description={`确认后将永久删除该技能,且${affectedAgents > 0 ? `会影响 ${affectedAgents} 个智能体的调用` : '当前未被任何智能体使用'}。`}
      footer={
        <>
          <button type="button" onClick={onClose} className="rounded-xl border border-[var(--border)] px-4 py-2 text-xs font-semibold">取消</button>
          <button type="button" onClick={onConfirm} className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white">确认删除</button>
        </>
      }
    >
      <div className="mt-4 space-y-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-900 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200">
        <p>· 类型:{skill.type}</p>
        <p>· 状态:{STATUS_BADGE[skill.status].label}</p>
        <p>· 关联智能体:{affectedAgents > 0 ? skill.usedByAgents.join('、') : '无'}</p>
        <p>· 最后更新:{skill.lastUpdate}</p>
      </div>
    </CenterModal>
  );
}