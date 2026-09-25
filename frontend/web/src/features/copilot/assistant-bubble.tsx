/**
 * Copilot 助手消息气泡(包含 tool 消息) — 拆分自 pages/Copilot.tsx 内联 MessageBubble。
 *
 * AssistantBubble 处理:
 *  - 头部 meta(avatar + agent name + role + status + metrics + 工具/写操作 badge)
 *  - MessageCapabilityTrace 摘要条
 *  - RiskDecisionCard(高风险提示)
 *  - failed / cancelled / moderated 状态条
 *  - TurnThoughtPanel 推理步骤
 *  - body(artifacts + Markdown + execution details + streaming cursor)
 *  - codeBlock 复制按钮
 *  - traceOpen 工具调用明细(citeBlock 装配依据)
 *  - approvalRequest 受控审批卡(签名进度、签发按钮、详情展开)
 *  - hover actions(copy / regenerate / like / dislike / delete)
 *
 * 关键约定:messageRef callback 写入父组件 messageRefs.current[id],
 * 父级在 scrollIntoView 时读取,必须保持签名与行为字节级一致。
 */
import { useMemo, useState } from 'react';
import { cn } from '@de/web-utils';
import { Avatar, Badge, Button } from '@de/web-ui';
import {
  AlertCircle, CheckCircle2, Code, Copy, Download,
  Link2, Lock, Pencil, PlugZap, RotateCcw, ShieldAlert, ShieldCheck,
  Square, ThumbsDown, ThumbsUp, Trash2, Wrench, X,
} from 'lucide-react';
import type { DigitalEmployee } from '@de/web-types';
import { DigitalEmployeeAvatar } from '@/components/DigitalEmployeeAvatar';
import { Markdown } from '@/components/Markdown';
import type { ChatMessageEx, FeedbackKind, Signer } from '@/hooks/types';
import { type WorkbenchContextTab } from '@/features/copilot/workbench';
import { type SkillArtifactLink } from '@/features/copilot/artifact-links';
import { MessageCapabilityTrace } from '@/features/copilot/trace';
import { SkillArtifactDownloadCard } from '@/features/copilot/artifact-card';
import { extractSkillArtifacts } from '@/features/copilot/artifact-links';
import { extractPageOutline, type PageOutline } from '@/features/copilot/page-outline';
import { formatAssistantDisplayContent, formatExecutionDetails } from '@/features/copilot/message-display';
import { TurnThoughtPanel } from '@/features/copilot/turn-narrative/turn-thought-panel';

const STATUS_LABEL: Record<string, string> = {
  queued: '排队中',
  in_flight: '生成中',
  streaming: '生成中',
  succeeded: '已完成',
  failed: '失败',
  cancelled: '已停止',
  expired: '已过期',
  moderated: '内容安全',
};

const ERROR_HINT: Record<string, string> = {
  network: '网络异常,请检查连接后重试',
  auth: '登录已过期,请重新登录',
  timeout: '生成超时,可能需要更长时间',
  rate_limit: '请求频率过高,请稍后再试',
  content_filter: '命中内容安全策略,已拦截',
  tool_denied: '当前操作需要额外授权',
  internal: '服务异常,请稍后再试',
  unknown: '出现未知错误,稍后重试',
};

const SHANGHAI_TIME_ZONE = 'Asia/Shanghai';

function formatShanghaiTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('zh-CN', { timeZone: SHANGHAI_TIME_ZONE, hour: '2-digit', minute: '2-digit', hour12: false }).format(date);
}

function AssistantBubble({
  m, expandedArgs, setExpandedArgs,
  expandedApproval, setExpandedApproval,
  onApprove, onContinueRun, onExecuteAuthorized, onCitation, onRetry, onCopy, onRegenerate, onDelete, onRetryMessage, onFeedback,
  onApproveSigner, onRequestReject,
  copiedId, agentName, expertRole, expert, onOpenContext, selectedContextMessageId, messageRef, currentUser,
  generationStatus, generationElapsedSec,
  hoverMsgId, setHoverMsgId,
}: {
  m: ChatMessageEx;
  expandedArgs: Record<string, boolean>;
  setExpandedArgs: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  expandedApproval: Record<string, boolean>;
  setExpandedApproval: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  onApprove: (msgId: string) => void;
  onContinueRun?: (msgId: string) => void | Promise<void>;
  onExecuteAuthorized?: (msgId: string) => void | Promise<void>;
  onCitation: (c: any, messageId?: string) => void;
  onRetry: (name: string) => void;
  onCopy: (m: ChatMessageEx) => void;
  onRegenerate: (mid: string) => void;
  onDelete: (mid: string) => void;
  onRetryMessage: (mid: string) => void;
  onFeedback: (mid: string, kind: FeedbackKind) => void;
  onApproveSigner: (mid: string, signerIndex: number) => void;
  onRequestReject: (mid: string, idx: number) => void;
  copiedId: string | null;
  agentName?: string;
  expertRole?: string;
  expert?: Pick<DigitalEmployee, 'id' | 'name' | 'department' | 'avatarUrl' | 'capabilities'> | { id: string; name: string; department?: string; avatarUrl?: string; capabilities?: DigitalEmployee['capabilities'] };
  onOpenContext: (tab: WorkbenchContextTab, messageId?: string, artifact?: SkillArtifactLink, options?: { startSlide?: number }) => void;
  selectedContextMessageId?: string;
  messageRef?: (element: HTMLDivElement | null) => void;
  currentUser: { id: string; name: string; role: 'user' | 'admin' | 'auditor' } | null;
  generationStatus?: string;
  generationElapsedSec?: number;
  hoverMsgId?: string | null;
  setHoverMsgId?: (v: string | null) => void;
}) {
  const isTool = m.role === 'tool';
  const isEmpty = !m.content;
  const isStreaming = m.status === 'streaming' || m.status === 'in_flight';
  const agentDisplayName = agentName || m.agentName || (isTool ? '能力调用' : '助手');
  const [traceOpen, setTraceOpen] = useState(false);
  const needsDecision = /CVE|高危|高风险|影响资产/.test(m.content ?? '');
  const artifacts = useMemo(
    () => (isTool || !m.content ? [] : extractSkillArtifacts(m.content)),
    [isTool, m.content],
  );
  const displayContent = useMemo(
    () => formatAssistantDisplayContent(m.content ?? '', artifacts.length > 0),
    [artifacts.length, m.content],
  );
  const executionDetails = useMemo(
    () => formatExecutionDetails(m.content ?? ''),
    [m.content],
  );
  const outline = useMemo<PageOutline | null>(
    () => (isTool || !m.content ? null : extractPageOutline(m.content)),
    [isTool, m.content],
  );
  const sanitizedFields = useMemo(() => {
    if (!m.safety || m.safety.action !== 'redact') return undefined;
    const text = m.content ?? '';
    const matches = text.match(/\[已脱敏\]|\[REDACTED\]|<redacted>|<\*\*\*>/gi);
    return matches ? matches.length : 1;
  }, [m.content, m.safety]);
  const expectedPlatformRole: Record<Signer['role'], 'user' | 'admin' | 'auditor'> = { operator: 'user', approver: 'admin', auditor: 'auditor' };
  const isSingleAuth = (m.approvalRequest?.required ?? 2) <= 1;
  const canSign = (signer: Signer) => {
    if (!currentUser || signer.signed) return false;
    if (isSingleAuth) {
      // 单人审核:管理员可授权;或席位已绑定当前用户
      if (currentUser.role === 'admin') return true;
      if (signer.userId && signer.userId === currentUser.id) return true;
      return false;
    }
    return signer.userId === currentUser.id && expectedPlatformRole[signer.role] === currentUser.role;
  };
  const canSingleApprove = isSingleAuth && !!currentUser && m.approvalRequest?.decision === 'pending' && (
    currentUser.role === 'admin'
    || (m.approvalRequest.approverCandidateIds ?? []).includes(currentUser.id)
    || (!!m.approvalRequest.approverRoleHint && currentUser.name.includes(m.approvalRequest.approverRoleHint))
    || (!!m.approvalRequest.signers?.[0]?.userId && m.approvalRequest.signers[0].userId === currentUser.id)
  );
  return (
    <div
      ref={messageRef}
      className={cn('copilot-message group relative', isTool ? 'copilot-message--tool flex gap-3' : 'copilot-message--assistant flex gap-3', selectedContextMessageId === m.id && 'is-context-selected')}
      data-message-status={m.status}
      onMouseEnter={() => setHoverMsgId?.(m.id)}
      onMouseLeave={() => setHoverMsgId?.(null)}
    >
      <div className="shrink-0 pt-0.5">
        {isTool ? (
          <div className="copilot-message__avatar copilot-message__avatar--tool grid h-7 w-7 place-items-center rounded-full bg-[var(--warning-bg)] text-[var(--warning)]">
            <Wrench className="h-3.5 w-3.5" />
          </div>
        ) : (
          <DigitalEmployeeAvatar
            employee={expert ?? { id: 'expert', name: agentDisplayName }}
            size={28}
            className="copilot-message__avatar copilot-message__avatar--assistant"
          />
        )}
      </div>
      <div className="copilot-message__content min-w-0 space-y-2.5 w-full max-w-[960px]">
        <div className="copilot-message__meta flex items-center gap-1.5 text-[11px]">
          <Avatar name="王昊" size={20} className="hidden" />
          <span className="font-semibold text-[var(--text)]">{agentDisplayName}</span>
          {!isTool && expertRole && (
            <span className="truncate text-[10px] text-[var(--text-muted)]">{expertRole}</span>
          )}
          {m.status && (
            <span className={cn('inline-flex items-center gap-1 text-[10px] text-[var(--text-muted)]', isStreaming && 'text-[var(--brand)]')}>
              {isStreaming && <span className="h-1.5 w-1.5 rounded-full bg-[var(--brand)] animate-pulse" aria-hidden="true" />}
              {STATUS_LABEL[m.status]}
            </span>
          )}
          {m.metrics?.ttftMs !== undefined && <details className="text-[10px] text-[var(--text-muted)]"><summary className="cursor-pointer">运行详情</summary><span className="font-mono">TTFT {m.metrics.ttftMs}ms · {m.metrics.durationMs ? `${(m.metrics.durationMs / 1000).toFixed(1)}s` : ''}{m.metrics.model ? ` · ${m.metrics.model}` : ''}</span></details>}
          <span className="text-[10px] text-[var(--text-muted)] font-mono tabular-nums" title={m.createdAt}>{formatShanghaiTime(m.createdAt)}</span>
          {((m.toolCalls?.length ?? 0) > 0 || isTool) && <Badge tone="warn" className="text-[9px]">能力调用</Badge>}
          {m.approvalRequest && <Badge tone="error" className="text-[9px]">写操作</Badge>}
        </div>

        <MessageCapabilityTrace
          message={m}
          onOpenContext={onOpenContext}
          expanded={traceOpen}
          onToggle={() => setTraceOpen((open) => !open)}
        />

        {needsDecision && (
          <div className="max-w-[760px] rounded-lg border border-[var(--warning)]/35 bg-[var(--warning-bg)]/25 p-3" aria-label="风险处置建议">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-1.5 text-xs font-semibold">
                  <AlertCircle className="h-3.5 w-3.5 text-[var(--warning)]" />风险处置建议
                </div>
                <p className="mt-1 text-[11px] text-[var(--text-secondary)]">已识别高风险项。建议先核验受影响资产,再生成受控修复任务并发起人工复核。</p>
              </div>
              <Badge tone="warn" className="shrink-0 text-[10px]">需复核</Badge>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button size="sm" variant="secondary" onClick={() => onOpenContext('evidence', m.id)}>查看受影响资产</Button>
              <Button size="sm" onClick={() => onOpenContext('tasks', m.id)}>生成修复任务</Button>
              <Button size="sm" variant="secondary" onClick={() => onOpenContext('approvals', m.id)}>发起人工复核</Button>
            </div>
          </div>
        )}

        {/* 错误条(failed / cancelled / moderated) */}
        {m.status === 'failed' && (
          <div role="alert" className="rounded-md border border-[var(--danger)]/30 bg-[var(--danger-bg)] px-3 py-2 text-[11px] flex items-center gap-2">
            <AlertCircle className="h-3.5 w-3.5 text-[var(--danger)]" />
            <span className="text-[var(--text)]">
              {m.error?.message ?? ERROR_HINT[m.error?.category ?? 'unknown']}
            </span>
            <button
              type="button"
              onClick={() => onRetryMessage(m.id)}
              className="ml-auto inline-flex items-center gap-1 text-[10px] text-[var(--danger)] hover:underline"
            >
              <RotateCcw className="h-3 w-3" />重试
            </button>
          </div>
        )}
        {m.status === 'cancelled' && (
          <div className="rounded-md border border-[var(--border)] bg-[var(--bg-elevated)] px-3 py-1.5 text-[11px] text-[var(--text-muted)] inline-flex items-center gap-1.5">
            <Square className="h-3 w-3" />生成已停止
          </div>
        )}
        {m.status === 'moderated' && m.safety && (
          <div role="alert" className="rounded-md border border-[var(--warning)]/30 bg-[var(--warning-bg)] px-3 py-2 text-[11px] flex items-center gap-2">
            <ShieldAlert className="h-3.5 w-3.5 text-[var(--warning)]" />
            <span className="text-[var(--text)]">
              内容安全:{m.safety.flaggedCategory ?? 'policy'} · 已{m.safety.action === 'block' ? '拦截' : m.safety.action === 'redact' ? '脱敏' : '告警'}
            </span>
            {m.safety.redactedText && (
              <details className="ml-auto text-[10px]">
                <summary className="cursor-pointer text-[var(--text-muted)]">查看脱敏后</summary>
                <pre className="mt-1 max-w-md whitespace-pre-wrap text-[10px]">{m.safety.redactedText}</pre>
              </details>
            )}
          </div>
        )}

        {!isTool && (
          <TurnThoughtPanel message={m} streaming={isStreaming} showNarrative={expert?.capabilities?.cognitive?.showNarrative !== false} />
        )}

        {!isEmpty ? (
          <div className={cn(
            'copilot-message__body relative',
            isTool
              ? 'copilot-message__body--tool rounded-lg border border-[var(--warning)]/30 bg-[var(--warning-bg)]/50 px-3 py-2 text-[12px] text-[var(--text-secondary)] font-mono'
              : 'copilot-message__body--assistant max-w-[920px] text-[14.5px] leading-[1.7] text-[var(--text)] break-words',
          )}>
            {isTool ? (
              <span className="whitespace-pre-wrap">{m.content}</span>
            ) : (
              <div className="md-content space-y-3">
                {artifacts.length > 0 && (
                  <div className="flex flex-col gap-2" role="list" aria-label="可下载产物">
                    {artifacts.map((a) => (
                      <div key={a.href} role="listitem">
                        <SkillArtifactDownloadCard
                          href={a.href}
                          filename={a.filename}
                          downloadName={a.downloadName}
                          title={a.title}
                          kind={a.kind}
                          sanitizedFields={sanitizedFields}
                          onView={() => onOpenContext('document', m.id, a)}
                        />
                      </div>
                    ))}
                    {outline && (
                      <div className="copilot-outline mt-1.5">
                        <div className="flex items-baseline justify-between">
                          <div className="text-[11px] font-medium text-[var(--text-muted)]">页面结构 · {outline.pages.length} 页</div>
                          <div className="text-[10px] text-[var(--text-muted)]">点击跳转预览</div>
                        </div>
                        <div className="mt-1.5 flex gap-1.5 overflow-x-auto pb-1">
                          {outline.pages.map((p, i) => (
                            <button
                              key={i}
                              type="button"
                              onClick={() => onOpenContext('document', m.id, artifacts[0], { startSlide: i + 1 })}
                              className="copilot-outline__chip shrink-0 inline-flex items-center gap-1.5 rounded-md border border-[var(--border)] bg-[var(--surface-1)] px-2 py-1.5 text-[11px] text-[var(--text)] hover:border-[var(--brand)]/40 hover:bg-[var(--brand-light)]/30"
                            >
                              <span className="inline-flex h-4 min-w-4 items-center justify-center rounded bg-[var(--bg-hover)] px-1 font-mono text-[9px] font-medium text-[var(--text-muted)]">P{i + 1}</span>
                              <span className="max-w-[140px] truncate font-medium">{p}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
                {displayContent ? <Markdown text={displayContent} /> : null}
                {executionDetails && (
                  <details className="copilot-execution-details rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] px-3 py-2 text-[11px]">
                    <summary className="cursor-pointer select-none font-medium text-[var(--text-muted)] hover:text-[var(--text)]">
                      查看执行明细
                    </summary>
                    <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap break-words font-mono text-[10px] leading-relaxed text-[var(--text-secondary)]">
                      {executionDetails}
                    </pre>
                  </details>
                )}
                {isStreaming && <span className="inline-block h-3.5 w-1.5 ml-0.5 align-text-bottom bg-[var(--brand)] animate-pulse rounded-sm" aria-hidden="true" />}
              </div>
            )}
          </div>
        ) : isStreaming ? (
          <div className="copilot-message__body copilot-message__body--pending inline-flex items-center gap-2.5 text-[var(--text-muted)] text-sm py-1" role="status" aria-label="消息正在生成">
            <span className="copilot-thinking-dots" aria-hidden="true">
              {[0, 1, 2].map((i) => (
                <span key={i} style={{ animationDelay: `${i * 0.15}s` }} />
              ))}
            </span>
            <span className="min-w-0 truncate">
              {generationStatus
                || ((m.reasoningSteps?.length ?? 0) > 0 ? '正在生成回复…' : '正在思考')}
            </span>
            {generationElapsedSec != null && generationElapsedSec > 0 && (
              <span className="font-mono text-[10px] text-[var(--text-muted)]">{generationElapsedSec}s</span>
            )}
          </div>
        ) : null}

        {m.codeBlock && (
          <div className="copilot-message__code rounded-md border border-[var(--border)] bg-[var(--bg)] overflow-hidden max-w-2xl">
            <div className="flex items-center justify-between px-3 py-1.5 border-b border-[var(--border)] bg-[var(--bg-elevated)]">
              <div className="flex items-center gap-1.5 text-[10px]">
                <Code className="h-3 w-3 text-[var(--text-muted)]" />
                <span className="font-mono text-[var(--text-muted)]">{m.codeBlock.lang}</span>
              </div>
              <button
                onClick={async () => { try { await navigator.clipboard.writeText(m.codeBlock!.code); } catch {} }}
                className="text-[10px] text-[var(--text-muted)] hover:text-[var(--text)] flex items-center gap-1"
              >
                <Download className="h-3 w-3" />复制
              </button>
            </div>
            <pre className="overflow-x-auto p-3 text-[11px] font-mono leading-relaxed text-[var(--text)]">
              {m.codeBlock.code}
            </pre>
          </div>
        )}

        {traceOpen && m.toolCalls && m.toolCalls.length > 0 && (
          <div className="copilot-message__toolcalls max-w-[920px] space-y-1.5">
            <div className="flex items-center gap-1.5 px-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
              <Wrench className="h-3 w-3 text-[var(--brand)]" />能力调用明细 · {m.toolCalls.length} 项
            </div>
            {m.toolCalls.map((tc) => {
              const argsKey = `${m.id}-${tc.id}`;
              const isOpen = expandedArgs[argsKey];
              const failed = tc.status === 'failed';
              const denied = tc.status === 'denied' || tc.permission === 'denied';
              return (
                <div key={tc.id} className={cn('rounded-md border p-2 text-[11px]', failed || denied ? 'border-[var(--danger)]/40 bg-[var(--danger-bg)]' : 'border-[var(--border)] bg-[var(--bg-elevated)]')}>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Wrench className={cn('h-3 w-3', failed || denied ? 'text-[var(--danger)]' : 'text-[var(--brand)]')} />
                    <span className="font-mono font-semibold">{tc.name}</span>
                    {(tc.permission === 'approval-required' || tc.permission === 'approval_required') && (
                      <Badge tone="warn" className="text-[9px]"><ShieldCheck className="mr-0.5 inline h-2.5 w-2.5" />需人工审核</Badge>
                    )}
                    {String(tc.status) === 'pending_authorization' && tc.permission !== 'approval-required' && tc.permission !== 'approval_required' && (
                      <Badge tone="warn" className="text-[9px]"><ShieldCheck className="mr-0.5 inline h-2.5 w-2.5" />待授权</Badge>
                    )}
                    {tc.permission === 'auto' && (
                      <Badge tone="success" className="text-[9px]"><PlugZap className="mr-0.5 inline h-2.5 w-2.5" />auto</Badge>
                    )}
                    {tc.permission === 'denied' && (
                      <Badge tone="error" className="text-[9px]"><Lock className="mr-0.5 inline h-2.5 w-2.5" />已拦截</Badge>
                    )}
                    {failed ? (
                      <Badge tone="error" className="text-[9px]">
                        <AlertCircle className="mr-0.5 inline h-2.5 w-2.5" />失败
                      </Badge>
                    ) : tc.status === 'needs_instruction' ? (
                      <Badge tone="warn" className="text-[9px]">待补全命令</Badge>
                    ) : !denied ? (
                      <Badge tone="success" className="text-[9px]">
                        <CheckCircle2 className="mr-0.5 inline h-2.5 w-2.5" />{tc.durationMs}ms
                      </Badge>
                    ) : null}
                    {tc.sandboxId && (
                      <span className="text-[9px] font-mono text-[var(--text-muted)]" title="gVisor 沙箱 ID">[{tc.sandboxId}]</span>
                    )}
                    {tc.traceId && (
                      <span className="text-[9px] font-mono text-[var(--text-muted)]" title="执行 traceId">{tc.traceId}</span>
                    )}
                    {failed && (
                      <button onClick={() => onRetry(tc.name)} className="text-[10px] text-[var(--danger)] hover:underline ml-auto">
                        <RotateCcw className="inline h-2.5 w-2.5 mr-0.5" />自动重试
                      </button>
                    )}
                    {!failed && !denied && (
                      <button
                        type="button"
                        onClick={() => setExpandedArgs({ ...expandedArgs, [argsKey]: !isOpen })}
                        aria-expanded={!!isOpen}
                        aria-controls={`tool-args-${argsKey}`}
                        className="ml-auto text-[10px] text-[var(--text-muted)] hover:text-[var(--text)]"
                      >
                        {isOpen ? '收起' : '参数'}
                      </button>
                    )}
                  </div>
                  {tc.error && (
                    <div className="mt-1 text-[10px] font-mono text-[var(--danger)]">{tc.error}</div>
                  )}
                  {isOpen && (
                    <div id={`tool-args-${argsKey}`} className="mt-1.5 space-y-1 pl-5">
                      <pre className="text-[10px] font-mono text-[var(--text-muted)] bg-[var(--bg)] rounded p-1.5 overflow-x-auto">
                        {JSON.stringify(tc.args, null, 2)}
                      </pre>
                      {tc.result && (
                        <pre className="text-[10px] font-mono text-[var(--success)] bg-[var(--bg)] rounded p-1.5 overflow-x-auto">
                          → {tc.result}
                        </pre>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {m.approvalRequest && (
          <div className="copilot-message__approval rounded-md border border-[var(--danger)]/30 bg-[var(--danger-bg)] p-3 max-w-md">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-[var(--danger)] mb-1 flex-wrap">
              <ShieldCheck className="h-3.5 w-3.5" />{isSingleAuth ? '受控变更 · 人工审核' : '受控变更 · 待审核'}
              {m.approvalRequest.reason && <Badge tone="warn" className="text-[9px] ml-1">{m.approvalRequest.reason}</Badge>}
              {m.approvalRequest.ticketId && <span className="text-[10px] font-mono text-[var(--text-muted)]">· {m.approvalRequest.ticketId}</span>}
              <span className="ml-auto text-[10px] font-mono text-[var(--text-muted)]">
                {m.approvalRequest.signed}/{m.approvalRequest.required}
              </span>
            </div>
            <div className="text-[11px] text-[var(--text)] mb-2 font-mono break-all">{m.approvalRequest.action}</div>
            {(m.approvalRequest.planSummary || m.approvalRequest.skillTurn?.summary) && (
              <div className="mb-2 rounded border border-[var(--border)] bg-[var(--bg)]/60 px-2 py-1.5 text-[10px] text-[var(--text-secondary)]">
                <span className="text-[var(--text-muted)]">Skill Turn:</span>
                {m.approvalRequest.planSummary ?? m.approvalRequest.skillTurn?.summary}
                {m.approvalRequest.skillTurn?.steps && m.approvalRequest.skillTurn.steps.length > 0 && (
                  <ol className="mt-1 list-inside list-decimal space-y-0.5">
                    {m.approvalRequest.skillTurn.steps.map((step, i) => (
                      <li key={step.id ?? i}>
                        {step.title ?? step.action ?? `步骤 ${i + 1}`}
                        {m.approvalRequest!.decision !== 'pending' && step.status ? ` · ${step.status}` : ''}
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            )}
            {m.approvalRequest.resource && (
              <div className="text-[10px] text-[var(--text-muted)] mb-2">资源:<span className="font-mono">{m.approvalRequest.resource}</span></div>
            )}

            {/* 签名进度条 */}
            <div className="flex gap-1 mb-2" aria-label={`签名进度 ${m.approvalRequest.signed}/${m.approvalRequest.required}`}>
              {m.approvalRequest.signers.map((s, i) => (
                <div
                  key={i}
                  className={cn('flex-1 h-1.5 rounded-full', s.signed ? (s.role === 'auditor' ? 'bg-[var(--info)]' : 'bg-[var(--success)]') : 'bg-[var(--bg)]')}
                  title={`${s.name}(${s.role})${s.signedAt ? ` · ${s.signedAt.slice(11, 19)}` : ''}`}
                />
              ))}
            </div>

            {/* 签名人列表 */}
            <div className="space-y-1 mb-2">
              {m.approvalRequest.signers.map((s, i) => (
                <div key={i} className="flex items-center gap-1.5 text-[10px]">
                  <span className={cn('w-3 inline-block', s.signed ? 'text-[var(--success)]' : 'text-[var(--text-muted)]')}>{s.signed ? '✓' : '○'}</span>
                  <span className={cn('flex-1', s.signed ? 'text-[var(--success)]' : 'text-[var(--text-muted)]')}>{s.name}</span>
                  <Badge tone={s.role === 'auditor' ? 'info' : 'neutral'} className="text-[9px]">{s.role}</Badge>
                  {s.signedAt && <span className="text-[9px] font-mono text-[var(--text-muted)]">{s.signedAt.slice(11, 19)}</span>}
                  {s.signatureHash && <span className="text-[9px] font-mono text-[var(--text-muted)]" title="签名 hash">#{s.signatureHash.slice(-6)}</span>}
                </div>
              ))}
            </div>

            {/* 操作按钮 */}
            {m.approvalRequest.decision === 'pending' && (
              <div className="flex gap-1.5 flex-wrap">
                {isSingleAuth ? (
                  <>
                    <Button
                      size="sm"
                      variant={canSingleApprove ? 'danger' : 'secondary'}
                      disabled={!canSingleApprove}
                      title={canSingleApprove ? '使用当前登录身份审核授权' : '需管理员或授权人审核'}
                      onClick={() => onApprove(m.id)}
                    >
                      <ShieldCheck className="h-3 w-3" />审核授权
                    </Button>
                    {canSingleApprove && (
                      <Button size="sm" variant="secondary" onClick={() => onRequestReject(m.id, 0)}>
                        <X className="h-3 w-3" />拒绝
                      </Button>
                    )}
                  </>
                ) : (
                  <>
                    {m.approvalRequest.signers.map((s, i) => (
                      !s.signed && (
                        <Button key={i} size="sm" variant={canSign(s) ? 'danger' : 'secondary'} disabled={!canSign(s)} title={canSign(s) ? '使用当前登录身份签发' : `仅 ${s.name} 可签发`} onClick={() => onApproveSigner(m.id, i)}>
                          <ShieldCheck className="h-3 w-3" />{canSign(s) ? `批准(${s.name})` : `待 ${s.name} 签发`}
                        </Button>
                      )
                    ))}
                    {m.approvalRequest.signers.some((s) => !s.signed && canSign(s)) && (
                      <Button size="sm" variant="secondary" onClick={() => {
                        const idx = m.approvalRequest!.signers.findIndex((s) => !s.signed && canSign(s));
                        if (idx >= 0) onRequestReject(m.id, idx);
                      }}>
                        <X className="h-3 w-3" />拒绝
                      </Button>
                    )}
                  </>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setExpandedApproval({ ...expandedApproval, [m.id]: !expandedApproval[m.id] })}
                >
                  详情
                </Button>
              </div>
            )}
            {m.approvalRequest.decision === 'approved' && (
              <div className="flex flex-wrap items-center gap-1.5">
                {!m.content.includes('—— 授权后执行结果 ——') ? (
                  <Badge tone="warn" className="text-[10px]">
                    <ShieldCheck className="mr-1 inline h-3 w-3" />{isSingleAuth ? '已授权 · 待执行' : '已通过 · 待执行'}
                    {m.approvalRequest.decidedAt && <span className="ml-1 font-mono">{m.approvalRequest.decidedAt.slice(11, 19)}</span>}
                  </Badge>
                ) : m.content.includes('执行失败')
                  || (m.toolCalls ?? []).some((tc) => tc.status === 'failed')
                  || (m.approvalRequest.skillTurn?.steps ?? []).some((s) => s.status === 'failed' || s.status === 'needs_instruction') ? (
                  <Badge tone="error" className="text-[10px]">
                    <AlertCircle className="mr-1 inline h-3 w-3" />执行失败
                  </Badge>
                ) : (
                  <Badge tone="success" className="text-[10px]">
                    <CheckCircle2 className="mr-1 inline h-3 w-3" />{isSingleAuth ? '已授权并执行' : '已通过并执行'}
                    {m.approvalRequest.decidedAt && <span className="ml-1 font-mono">{m.approvalRequest.decidedAt.slice(11, 19)}</span>}
                  </Badge>
                )}
                {!m.linkedTaskId && !m.content.includes('—— 授权后执行结果 ——') && onExecuteAuthorized && (
                  <Button
                    size="sm"
                    variant="primary"
                    title="授权已完成,点击开始执行"
                    onClick={() => void onExecuteAuthorized(m.id)}
                  >
                    开始执行
                  </Button>
                )}
                {(m.canContinueRun || m.nextRunCommand) && onContinueRun && (
                  <Button
                    size="sm"
                    variant="primary"
                    title={m.nextRunCommand ? `继续执行 ${m.nextRunCommand}` : '继续执行 run'}
                    onClick={() => void onContinueRun(m.id)}
                  >
                    继续执行 run
                  </Button>
                )}
              </div>
            )}
            {m.approvalRequest.decision === 'rejected' && (
              <Badge tone="error" className="text-[10px]">
                <X className="mr-1 inline h-3 w-3" />已拒绝
                {m.approvalRequest.decidedAt && <span className="ml-1 font-mono">{m.approvalRequest.decidedAt.slice(11, 19)}</span>}
              </Badge>
            )}

            {/* 审计 / 详情展开 */}
            {expandedApproval[m.id] && (
              <div className="mt-2 pt-2 border-t border-[var(--border)] text-[10px] space-y-1">
                <div className="text-[var(--text-muted)]">审计字段:</div>
                <div>policyHash:<span className="font-mono">{m.approvalRequest.policyHash ?? '—'}</span></div>
                <div>resource:<span className="font-mono">{m.approvalRequest.resource ?? '—'}</span></div>
                <div>reason:<span className="font-mono">{m.approvalRequest.reason ?? '—'}</span></div>
              </div>
            )}
          </div>
        )}

        {/* Hover 消息操作栏 — Claude Code 风格 chip row */}
        {!isEmpty && (
          <div className="copilot-message__actions flex items-center gap-0.5 text-[var(--text-muted)]">
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
              onClick={() => onRegenerate(m.id)}
              className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] hover:bg-[var(--bg-hover)] hover:text-[var(--text)]"
              title="重新生成"
              aria-label="重新生成"
              disabled={m.status === 'streaming'}
            >
              <RotateCcw className="h-3 w-3" />
              <span>重新生成</span>
            </button>
            <div className="mx-1 h-3 w-px bg-[var(--border)]" aria-hidden="true" />
            <button
              className={cn(
                'inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] hover:bg-[var(--bg-hover)]',
                m.feedback?.kind === 'like' ? 'text-[var(--success)]' : 'hover:text-[var(--text)]',
              )}
              title="点赞 · 提交自进化候选"
              aria-label="点赞"
              aria-pressed={m.feedback?.kind === 'like'}
              onClick={() => onFeedback(m.id, m.feedback?.kind === 'like' ? null : 'like')}
            >
              <ThumbsUp className="h-3 w-3" />
            </button>
            <button
              className={cn(
                'inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] hover:bg-[var(--bg-hover)]',
                m.feedback?.kind === 'dislike' ? 'text-[var(--danger)]' : 'hover:text-[var(--text)]',
              )}
              title="点踩 · 提交自进化候选"
              aria-label="点踩"
              aria-pressed={m.feedback?.kind === 'dislike'}
              onClick={() => onFeedback(m.id, m.feedback?.kind === 'dislike' ? null : 'dislike')}
            >
              <ThumbsDown className="h-3 w-3" />
            </button>
            <button
              onClick={() => onDelete(m.id)}
              className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] hover:bg-[var(--bg-hover)] hover:text-[var(--danger)]"
              title="删除"
              aria-label="删除消息"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export { AssistantBubble };