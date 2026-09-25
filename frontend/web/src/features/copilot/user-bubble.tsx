/**
 * Copilot 用户消息气泡 — 拆分自 pages/Copilot.tsx 内联 MessageBubble。
 *
 * 用户消息专用的最小外壳:右对齐气泡 + copy/edit hover actions。
 * AssistantBubble 处理 assistant 与 tool 消息,共享 messageRef callback。
 */
import { cn } from '@de/web-utils';
import { Avatar } from '@de/web-ui';
import { CheckCircle2, Copy, Pencil } from 'lucide-react';
import type { ChatMessageEx } from '@/hooks/types';

function UserBubble({
  m,
  messageRef,
  copiedId,
  selectedContextMessageId,
  hoverMsgId,
  setHoverMsgId,
  onCopy,
  onEdit,
}: {
  m: ChatMessageEx;
  messageRef?: (element: HTMLDivElement | null) => void;
  copiedId: string | null;
  selectedContextMessageId?: string;
  hoverMsgId?: string | null;
  setHoverMsgId?: (v: string | null) => void;
  onCopy: (m: ChatMessageEx) => void;
  onEdit: (m: ChatMessageEx) => void;
}) {
  const isEmpty = !m.content;
  return (
    <div
      ref={messageRef}
      className={cn(
        'copilot-message group relative copilot-message--user flex justify-end',
        selectedContextMessageId === m.id && 'is-context-selected',
      )}
      data-message-status={m.status}
      onMouseEnter={() => setHoverMsgId?.(m.id)}
      onMouseLeave={() => setHoverMsgId?.(null)}
    >
      <div className="copilot-message__content min-w-0 space-y-2.5 max-w-[80%]">
        <div className="copilot-message__meta flex items-center gap-1.5 text-[11px] justify-end">
          <Avatar name="王昊" size={20} />
          <span className="font-semibold text-[var(--text)]">王昊</span>
          <span className="text-[10px] text-[var(--text-muted)] font-mono tabular-nums" title={m.createdAt}>
            {new Intl.DateTimeFormat('zh-CN', { timeZone: 'Asia/Shanghai', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(m.createdAt))}
          </span>
        </div>
        {!isEmpty ? (
          <div className="copilot-message__body copilot-message__body--user inline-block max-w-full whitespace-pre-wrap break-words rounded-2xl rounded-tr-sm bg-[var(--brand)] px-4 py-2.5 text-[14px] text-white shadow-sm">
            <span className="whitespace-pre-wrap">{m.content}</span>
          </div>
        ) : null}
        <div className="copilot-message__actions flex items-center gap-0.5 text-[var(--text-muted)] justify-end">
          <button
            onClick={() => onCopy(m)}
            className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] hover:bg-[var(--bg-hover)] hover:text-[var(--text)]"
            title="复制"
            aria-label="复制消息"
          >
            {copiedId === m.id ? <CheckCircle2 className="h-3 w-3 text-[var(--success)]" /> : <Copy className="h-3 w-3" />}
            <span>{copiedId === m.id ? '已复制' : '复制'}</span>
          </button>
          <button
            onClick={() => onEdit(m)}
            className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] hover:bg-[var(--bg-hover)] hover:text-[var(--text)]"
            title="编辑并重新发送"
            aria-label="编辑并重新发送"
          >
            <Pencil className="h-3 w-3" />
            <span>编辑</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export { UserBubble };