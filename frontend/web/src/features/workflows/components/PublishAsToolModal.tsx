/**
 * PublishAsToolModal — 把工作流发布为可被智能体调用的工具。
 */
import { Rocket } from 'lucide-react';
import { CenterModal } from '@/components/feedback/CenterModal';
import type { Flow } from '../schema';

interface PublishAsToolModalProps {
  open: boolean;
  onClose: () => void;
  flow: Flow | null;
  toolId: string; setToolId: (s: string) => void;
  toolDesc: string; setToolDesc: (s: string) => void;
  toolInput: string; setToolInput: (s: string) => void;
  toolOutput: string; setToolOutput: (s: string) => void;
  onSubmit: () => void;
}

export function PublishAsToolModal({ open, onClose, flow, toolId, setToolId, toolDesc, setToolDesc, toolInput, setToolInput, toolOutput, setToolOutput, onSubmit }: PublishAsToolModalProps) {
  return (
    <CenterModal
      open={open}
      onClose={onClose}
      ariaLabel="发布为工具"
      title={flow ? `发布「${flow.name}」为工具` : '发布为工具'}
      description="发布后,任何智能体都可以按工具 ID 调用此工作流"
      panelClassName="max-w-2xl"
      footer={
        <div className="flex w-full items-center justify-end gap-2">
          <button type="button" onClick={onClose} className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-3 py-2 text-xs font-semibold text-[var(--text-secondary)] hover:border-[var(--brand)] hover:text-[var(--brand)]">取消</button>
          <button type="button" onClick={onSubmit} className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--brand)] px-4 py-2 text-xs font-semibold text-white hover:bg-[var(--brand-hover)]">
            <Rocket className="h-3.5 w-3.5" />确认发布
          </button>
        </div>
      }
    >
      <div className="space-y-3">
        <div className="rounded-lg bg-[var(--bg-elevated)] p-3 text-xs">
          <p className="text-[var(--text-muted)]">当前工作流</p>
          <p className="mt-1 font-semibold">{flow?.name}</p>
          <p className="mt-1 text-[10px] text-[var(--text-muted)]">节点 {flow?.initialNodes.length ?? 0} · 连线 {flow?.initialEdges.length ?? 0} · 触发器 {flow?.trigger}</p>
        </div>
        <label className="block">
          <span className="text-xs font-semibold text-[var(--text-secondary)]">工具 ID</span>
          <input value={toolId} onChange={(e) => setToolId(e.target.value)} placeholder="例如: complaint_triage" className="mt-1 h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-1)] px-3 text-sm outline-none focus:border-[var(--brand)]" />
          <p className="mt-1 text-[10px] text-[var(--text-muted)]">智能体按此 ID 调用,建议用小写下划线</p>
        </label>
        <label className="block">
          <span className="text-xs font-semibold text-[var(--text-secondary)]">工具描述(给智能体看的)</span>
          <textarea value={toolDesc} onChange={(e) => setToolDesc(e.target.value)} rows={2} className="mt-1 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-1)] px-3 py-2 text-sm outline-none focus:border-[var(--brand)]" />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="text-xs font-semibold text-[var(--text-secondary)]">输入 schema</span>
            <input value={toolInput} onChange={(e) => setToolInput(e.target.value)} placeholder="key:type:required" className="mt-1 h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-1)] px-3 text-sm outline-none focus:border-[var(--brand)]" />
            <p className="mt-1 text-[10px] text-[var(--text-muted)]">格式:字段名:类型:必填,逗号分隔</p>
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-[var(--text-secondary)]">输出 schema</span>
            <input value={toolOutput} onChange={(e) => setToolOutput(e.target.value)} placeholder="key:type:required" className="mt-1 h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-1)] px-3 text-sm outline-none focus:border-[var(--brand)]" />
            <p className="mt-1 text-[10px] text-[var(--text-muted)]">格式同上</p>
          </label>
        </div>
      </div>
    </CenterModal>
  );
}