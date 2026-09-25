/**
 * Copilot 消息级 trace 卡片 — 拆分自 pages/Copilot.tsx。
 *
 * MessageCapabilityTrace:能力调用 / 依据 / 受控审批 / 关联任务的紧凑摘要条
 * ArtifactOutline:文档产物页面结构跳转条
 */
import { ListChecks as ListChecksIcon, Link2, ShieldCheck, Wrench } from 'lucide-react';
import type { ChatMessageEx } from '@/hooks/types';
import { type WorkbenchContextTab } from '@/features/copilot/workbench';
import { type SkillArtifactLink } from '@/features/copilot/artifact-links';
import type { PageOutline } from '@/features/copilot/page-outline';

/** 能力调用 / 依据摘要:默认一行,点开进专家上下文;明细可按需展开 */
function MessageCapabilityTrace({
  message,
  onOpenContext,
  expanded,
  onToggle,
}: {
  message: ChatMessageEx;
  onOpenContext: (tab: WorkbenchContextTab, messageId?: string, artifact?: SkillArtifactLink, options?: { startSlide?: number }) => void;
  expanded: boolean;
  onToggle: () => void;
}) {
  const toolCount = message.toolCalls?.length ?? 0;
  const citeCount = message.citations?.length ?? 0;
  const taskRef = message.linkedTaskId ?? message.approvalRequest?.ticketId;
  const hasApproval = Boolean(message.approvalRequest);
  if (!toolCount && !citeCount && !hasApproval && !taskRef) return null;
  const okTools = message.toolCalls?.filter((item) => item.status === 'success').length ?? 0;

  return (
    <div className="copilot-message-workcards flex max-w-[920px] flex-wrap items-center gap-1.5" aria-label="岗位能力调用与依据">
      {toolCount > 0 && (
        <button type="button" onClick={() => onOpenContext('audit', message.id)} className="inline-flex items-center gap-1 rounded-md border border-[var(--border)] bg-[var(--bg-elevated)] px-2 py-1 text-[10px] text-[var(--text-secondary)] hover:border-[var(--brand)] hover:text-[var(--brand)]">
          <Wrench className="h-3 w-3 text-[var(--brand)]" />能力调用 {toolCount} · {okTools} 成功
        </button>
      )}
      {citeCount > 0 && (
        <button type="button" onClick={() => onOpenContext('evidence', message.id)} className="inline-flex items-center gap-1 rounded-md border border-[var(--border)] bg-[var(--bg-elevated)] px-2 py-1 text-[10px] text-[var(--text-secondary)] hover:border-[var(--brand)] hover:text-[var(--brand)]">
          <Link2 className="h-3 w-3 text-[var(--brand)]" />依据 {citeCount}
        </button>
      )}
      {hasApproval && (
        <button type="button" onClick={() => onOpenContext('approvals', message.id)} className="inline-flex items-center gap-1 rounded-md border border-[var(--warning)]/40 bg-[var(--warning-bg)] px-2 py-1 text-[10px] text-[var(--text-secondary)] hover:border-[var(--warning)]">
          <ShieldCheck className="h-3 w-3 text-[var(--warning)]" />受控审批 {message.approvalRequest!.signed}/{message.approvalRequest!.required}
        </button>
      )}
      {taskRef && (
        <button type="button" onClick={() => onOpenContext('tasks', message.id)} className="inline-flex items-center gap-1 rounded-md border border-[var(--border)] bg-[var(--bg-elevated)] px-2 py-1 text-[10px] text-[var(--text-secondary)] hover:border-[var(--brand)]">
          <ListChecksIcon className="h-3 w-3 text-[var(--brand)]" />任务 {taskRef}
        </button>
      )}
      {(toolCount > 0 || citeCount > 0) && (
        <button type="button" onClick={onToggle} className="text-[10px] text-[var(--text-muted)] hover:text-[var(--brand)]">
          {expanded ? '收起明细' : '展开明细'}
        </button>
      )}
    </div>
  );
}

function ArtifactOutline({
  outline,
  onJump,
}: {
  outline: PageOutline;
  onJump: (page: number) => void;
}) {
  return (
    <div className="copilot-outline mt-1.5">
      <div className="flex items-baseline justify-between">
        <div className="text-[11px] font-medium text-[var(--text-muted)]">
          页面结构 · {outline.pages.length} 页
        </div>
        <div className="text-[10px] text-[var(--text-muted)]">点击跳转预览</div>
      </div>
      <div className="mt-1.5 flex gap-1.5 overflow-x-auto pb-1">
        {outline.pages.map((p, i) => (
          <button
            key={i}
            type="button"
            onClick={() => onJump(i + 1)}
            className="copilot-outline__chip shrink-0 inline-flex items-center gap-1.5 rounded-md border border-[var(--border)] bg-[var(--surface-1)] px-2 py-1.5 text-[11px] text-[var(--text)] hover:border-[var(--brand)]/40 hover:bg-[var(--brand-light)]/30"
          >
            <span className="inline-flex h-4 min-w-4 items-center justify-center rounded bg-[var(--bg-hover)] px-1 font-mono text-[9px] font-medium text-[var(--text-muted)]">
              P{i + 1}
            </span>
            <span className="max-w-[140px] truncate font-medium">{p}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export { MessageCapabilityTrace, ArtifactOutline };