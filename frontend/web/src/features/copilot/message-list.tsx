/**
 * Copilot 消息列表 — 拆分自 pages/Copilot.tsx 的消息滚动区。
 *
 * MessageList 封装:
 *  - scrollRef + auto-scroll-to-bottom useEffect
 *  - 消息渲染(用户 → UserBubble,助手/工具 → AssistantBubble)
 *  - 流式占位(typing fallback)
 *
 * 关键约定:messageRefs 由父组件持有,通过 prop 传入 —
 * 父级在 jumpToMessage 时读取并 scrollIntoView。
 */
import { useEffect, useRef } from 'react';
import { DigitalEmployeeAvatar } from '@/components/DigitalEmployeeAvatar';
import type { ChatMessageEx, FeedbackKind } from '@/hooks/types';
import type { WorkbenchContextTab } from '@/features/copilot/workbench';
import type { SkillArtifactLink } from '@/features/copilot/artifact-links';
import type { DigitalEmployee } from '@de/web-types';
import { UserBubble } from './user-bubble';
import { AssistantBubble } from './assistant-bubble';

type MessageRefs = Record<string, HTMLDivElement | null>;

interface MessageListContextSelection {
  scope: string;
  messageId?: string;
}

interface MessageListProps {
  messages: ChatMessageEx[];
  showTypingFallback: boolean;
  expertName: string;
  expertMeta?: string | null;
  activeEmployee?: { id: string; name: string; department?: string; avatarUrl?: string; capabilities?: DigitalEmployee['capabilities'] } | null;
  streamingAssistant?: ChatMessageEx;
  generationHint?: string;
  generationElapsedSec?: number;
  expandedArgs: Record<string, boolean>;
  setExpandedArgs: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  expandedApproval: Record<string, boolean>;
  setExpandedApproval: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  hoverMsgId: string | null;
  setHoverMsgId: (v: string | null) => void;
  copiedId: string | null;
  messageRefs: React.MutableRefObject<MessageRefs>;
  contextSelection: MessageListContextSelection;
  onCopy: (m: ChatMessageEx) => void;
  onEdit: (m: ChatMessageEx) => void;
  onApprove: (mid: string) => void;
  onContinueRun?: (mid: string) => void | Promise<void>;
  onExecuteAuthorized?: (mid: string) => void | Promise<void>;
  onCitation: (citation: any, messageId?: string) => void;
  onRetry: (name: string, mid: string) => void;
  onRegenerate: (mid: string) => void;
  onDelete: (mid: string) => void;
  onRetryMessage: (mid: string) => void;
  onFeedback: (mid: string, kind: FeedbackKind) => void;
  onApproveSigner: (mid: string, signerIndex: number) => void;
  onRequestReject: (mid: string, idx: number) => void;
  onOpenContext: (tab: WorkbenchContextTab, messageId?: string, artifact?: SkillArtifactLink, options?: { startSlide?: number }) => void;
  currentUser: { id: string; name: string; role: 'user' | 'admin' | 'auditor' } | null;
}

function MessageList({
  messages,
  showTypingFallback,
  expertName,
  expertMeta,
  activeEmployee,
  streamingAssistant,
  generationHint,
  generationElapsedSec,
  expandedArgs,
  setExpandedArgs,
  expandedApproval,
  setExpandedApproval,
  hoverMsgId,
  setHoverMsgId,
  copiedId,
  messageRefs,
  contextSelection,
  onCopy,
  onEdit,
  onApprove,
  onContinueRun,
  onExecuteAuthorized,
  onCitation,
  onRetry,
  onRegenerate,
  onDelete,
  onRetryMessage,
  onFeedback,
  onApproveSigner,
  onRequestReject,
  onOpenContext,
  currentUser,
}: MessageListProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  // 自动滚到底:消息数量变化 + 流式状态变化时触发
  useEffect(() => {
    if (!scrollRef.current) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    scrollRef.current.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: reduced ? 'auto' : 'smooth',
    });
  }, [messages.length, showTypingFallback]);

  const renderMessageBubble = (m: ChatMessageEx) => {
    const sharedBaseProps = {
      key: m.id,
      m,
      copiedId,
      selectedContextMessageId: contextSelection.scope === 'message' ? contextSelection.messageId : undefined,
      hoverMsgId,
      setHoverMsgId,
      messageRef: (element: HTMLDivElement | null) => {
        messageRefs.current[m.id] = element;
      },
    };
    if (m.role === 'user') {
      return (
        <UserBubble
          {...sharedBaseProps}
          onCopy={onCopy}
          onEdit={onEdit}
        />
      );
    }
    return (
      <AssistantBubble
        {...sharedBaseProps}
        expandedArgs={expandedArgs}
        setExpandedArgs={setExpandedArgs}
        expandedApproval={expandedApproval}
        setExpandedApproval={setExpandedApproval}
        onApprove={onApprove}
        onContinueRun={onContinueRun}
        onExecuteAuthorized={onExecuteAuthorized}
        onCitation={(citation) => onCitation(citation, m.id)}
        onRetry={(name) => onRetry(name, m.id)}
        onCopy={onCopy}
        onRegenerate={onRegenerate}
        onDelete={onDelete}
        onRetryMessage={onRetryMessage}
        onFeedback={onFeedback}
        onApproveSigner={onApproveSigner}
        onRequestReject={onRequestReject}
        currentUser={currentUser}
        agentName={expertName}
        expertRole={expertMeta ?? undefined}
        expert={activeEmployee ?? { id: 'assistant', name: expertName }}
        onOpenContext={onOpenContext}
        generationStatus={streamingAssistant?.id === m.id ? generationHint : undefined}
        generationElapsedSec={streamingAssistant?.id === m.id ? generationElapsedSec : undefined}
      />
    );
  };

  return (
    <div ref={scrollRef} className="copilot-message-scroll flex-1 min-h-0 overflow-y-auto overflow-x-hidden" aria-label="消息列表">
      <div className="copilot-message-list px-4 sm:px-8 md:mx-12 py-4">
        {messages.map((m) => renderMessageBubble(m))}
      </div>

      {showTypingFallback && (
        <div className="copilot-message-list px-4 sm:px-8 md:mx-12 pb-4 pt-0" aria-live="polite" aria-label={`${expertName}正在思考`}>
          <div className="copilot-message copilot-message--assistant flex gap-3">
            <div className="shrink-0 pt-0.5">
              <DigitalEmployeeAvatar
                employee={activeEmployee ?? { id: 'assistant', name: expertName }}
                size={28}
                className="copilot-message__avatar copilot-message__avatar--assistant"
              />
            </div>
            <div className="copilot-message__content min-w-0 space-y-2.5 w-full max-w-[960px]">
              <div className="copilot-message__meta flex items-center gap-1.5 text-[11px]">
                <span className="font-semibold text-[var(--text)]">{expertName}</span>
                {expertMeta && <span className="truncate text-[10px] text-[var(--text-muted)]">{expertMeta}</span>}
                <span className="inline-flex items-center gap-1 text-[10px] text-[var(--brand)]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[var(--brand)] animate-pulse" aria-hidden="true" />
                  生成中
                </span>
              </div>
              <div className="copilot-message__body copilot-message__body--pending inline-flex items-center gap-2.5 text-[var(--text-muted)] text-sm py-1" role="status">
                <span className="copilot-thinking-dots" aria-hidden="true">
                  {[0, 1, 2].map((i) => (
                    <span key={i} style={{ animationDelay: `${i * 0.15}s` }} />
                  ))}
                </span>
                <span className="min-w-0 truncate">{generationHint || '正在思考'}</span>
                {generationElapsedSec != null && generationElapsedSec > 0 && (
                  <span className="font-mono text-[10px] text-[var(--text-muted)]">{generationElapsedSec}s</span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export { MessageList };
export type { MessageListProps, MessageRefs };