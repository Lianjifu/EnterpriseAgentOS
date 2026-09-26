/**
 * 审批卡 — 拆分自 AssistantBubble 内联 ~160 行 approval block。
 *
 * PermissionCard 封装:
 *  - 标题行:受控变更 / reason / ticketId / signed-required 进度
 *  - action 文本 + 可选 resource
 *  - Skill Turn 摘要 + steps
 *  - 签名进度条 + 签名人列表
 *  - 操作按钮:单人授权 / 多签 / 拒绝 / 详情
 *  - 状态 badge:pending(按钮)/approved(待执行/已执行)/rejected
 *  - 审计详情折叠
 *
 * 完全等价于 AssistantBubble 原内联实现;不改文案 / 不改样式 / 不改按钮顺序。
 */
import { AlertCircle, CheckCircle2, ShieldCheck, X } from 'lucide-react';
import { cn } from '@de/web-utils';
import { Badge, Button } from '@de/web-ui';

interface SignerLike {
  name: string;
  role: string;
  signed?: boolean;
  signedAt?: string;
  signatureHash?: string;
  userId?: string;
}

interface SkillTurnStepLike {
  id?: string;
  title?: string;
  action?: string;
  status?: string;
}

interface ApprovalRequestLike {
  reason?: string;
  ticketId?: string;
  signed: number;
  required: number;
  action: string;
  planSummary?: string;
  skillTurn?: { summary?: string; steps?: SkillTurnStepLike[] };
  resource?: string;
  signers: SignerLike[];
  decision: 'pending' | 'approved' | 'rejected' | string;
  decidedAt?: string;
  policyHash?: string;
  approverCandidateIds?: string[];
  approverRoleHint?: string;
}

interface ToolCallLike {
  status?: string;
}

interface PermissionCardMessage {
  id: string;
  content?: string;
  approvalRequest?: ApprovalRequestLike;
  toolCalls?: ToolCallLike[];
  linkedTaskId?: string;
  canContinueRun?: boolean;
  nextRunCommand?: string;
}

interface PermissionCardUser {
  id: string;
  name: string;
  role: 'user' | 'admin' | 'auditor' | string;
}

interface PermissionCardProps {
  m: PermissionCardMessage;
  currentUser: PermissionCardUser | null;
  expandedApproval: Record<string, boolean>;
  setExpandedApproval: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  onApprove: (mid: string) => void;
  onApproveSigner: (mid: string, signerIndex: number) => void;
  onRequestReject: (mid: string, idx: number) => void;
  onExecuteAuthorized?: (mid: string) => void | Promise<void>;
  onContinueRun?: (mid: string) => void | Promise<void>;
}

function PermissionCard({
  m,
  currentUser,
  expandedApproval,
  setExpandedApproval,
  onApprove,
  onApproveSigner,
  onRequestReject,
  onExecuteAuthorized,
  onContinueRun,
}: PermissionCardProps) {
  if (!m.approvalRequest) return null;

  const approval = m.approvalRequest;
  const isSingleAuth = (approval.required ?? 2) <= 1;
  const canSingleApprove = isSingleAuth && !!currentUser && approval.decision === 'pending' && (
    currentUser.role === 'admin'
    || (approval.approverCandidateIds ?? []).includes(currentUser.id)
    || (!!approval.approverRoleHint && currentUser.name.includes(approval.approverRoleHint))
    || (!!approval.signers?.[0]?.userId && approval.signers[0].userId === currentUser.id)
  );

  const canSign = (s: SignerLike) => {
    if (!currentUser) return false;
    if (currentUser.role === 'admin') return true;
    if (s.userId && s.userId === currentUser.id) return true;
    return currentUser.name === s.name && currentUser.role === s.role;
  };

  return (
    <div className="copilot-message__approval rounded-md border border-[var(--danger)]/30 bg-[var(--danger-bg)] p-3 max-w-md">
      <div className="flex items-center gap-1.5 text-xs font-semibold text-[var(--danger)] mb-1 flex-wrap">
        <ShieldCheck className="h-3.5 w-3.5" />{isSingleAuth ? '受控变更 · 人工审核' : '受控变更 · 待审核'}
        {approval.reason && <Badge tone="warn" className="text-[9px] ml-1">{approval.reason}</Badge>}
        {approval.ticketId && <span className="text-[10px] font-mono text-[var(--text-muted)]">· {approval.ticketId}</span>}
        <span className="ml-auto text-[10px] font-mono text-[var(--text-muted)]">
          {approval.signed}/{approval.required}
        </span>
      </div>
      <div className="text-[11px] text-[var(--text)] mb-2 font-mono break-all">{approval.action}</div>
      {(approval.planSummary || approval.skillTurn?.summary) && (
        <div className="mb-2 rounded border border-[var(--border)] bg-[var(--bg)]/60 px-2 py-1.5 text-[10px] text-[var(--text-secondary)]">
          <span className="text-[var(--text-muted)]">Skill Turn:</span>
          {approval.planSummary ?? approval.skillTurn?.summary}
          {approval.skillTurn?.steps && approval.skillTurn.steps.length > 0 && (
            <ol className="mt-1 list-inside list-decimal space-y-0.5">
              {approval.skillTurn.steps.map((step, i) => (
                <li key={step.id ?? i}>
                  {step.title ?? step.action ?? `步骤 ${i + 1}`}
                  {approval.decision !== 'pending' && step.status ? ` · ${step.status}` : ''}
                </li>
              ))}
            </ol>
          )}
        </div>
      )}
      {approval.resource && (
        <div className="text-[10px] text-[var(--text-muted)] mb-2">资源:<span className="font-mono">{approval.resource}</span></div>
      )}

      {/* 签名进度条 */}
      <div className="flex gap-1 mb-2" aria-label={`签名进度 ${approval.signed}/${approval.required}`}>
        {approval.signers.map((s, i) => (
          <div
            key={i}
            className={cn('flex-1 h-1.5 rounded-full', s.signed ? (s.role === 'auditor' ? 'bg-[var(--info)]' : 'bg-[var(--success)]') : 'bg-[var(--bg)]')}
            title={`${s.name}(${s.role})${s.signedAt ? ` · ${s.signedAt.slice(11, 19)}` : ''}`}
          />
        ))}
      </div>

      {/* 签名人列表 */}
      <div className="space-y-1 mb-2">
        {approval.signers.map((s, i) => (
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
      {approval.decision === 'pending' && (
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
              {approval.signers.map((s, i) => (
                !s.signed && (
                  <Button key={i} size="sm" variant={canSign(s) ? 'danger' : 'secondary'} disabled={!canSign(s)} title={canSign(s) ? '使用当前登录身份签发' : `仅 ${s.name} 可签发`} onClick={() => onApproveSigner(m.id, i)}>
                    <ShieldCheck className="h-3 w-3" />{canSign(s) ? `批准(${s.name})` : `待 ${s.name} 签发`}
                  </Button>
                )
              ))}
              {approval.signers.some((s) => !s.signed && canSign(s)) && (
                <Button size="sm" variant="secondary" onClick={() => {
                  const idx = approval.signers.findIndex((s) => !s.signed && canSign(s));
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
      {approval.decision === 'approved' && (
        <div className="flex flex-wrap items-center gap-1.5">
          {!m.content?.includes('—— 授权后执行结果 ——') ? (
            <Badge tone="warn" className="text-[10px]">
              <ShieldCheck className="mr-1 inline h-3 w-3" />{isSingleAuth ? '已授权 · 待执行' : '已通过 · 待执行'}
              {approval.decidedAt && <span className="ml-1 font-mono">{approval.decidedAt.slice(11, 19)}</span>}
            </Badge>
          ) : m.content.includes('执行失败')
            || (m.toolCalls ?? []).some((tc) => tc.status === 'failed')
            || (approval.skillTurn?.steps ?? []).some((s) => s.status === 'failed' || s.status === 'needs_instruction') ? (
            <Badge tone="error" className="text-[10px]">
              <AlertCircle className="mr-1 inline h-3 w-3" />执行失败
            </Badge>
          ) : (
            <Badge tone="success" className="text-[10px]">
              <CheckCircle2 className="mr-1 inline h-3 w-3" />{isSingleAuth ? '已授权并执行' : '已通过并执行'}
              {approval.decidedAt && <span className="ml-1 font-mono">{approval.decidedAt.slice(11, 19)}</span>}
            </Badge>
          )}
          {!m.linkedTaskId && !m.content?.includes('—— 授权后执行结果 ——') && onExecuteAuthorized && (
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
      {approval.decision === 'rejected' && (
        <Badge tone="error" className="text-[10px]">
          <X className="mr-1 inline h-3 w-3" />已拒绝
          {approval.decidedAt && <span className="ml-1 font-mono">{approval.decidedAt.slice(11, 19)}</span>}
        </Badge>
      )}

      {/* 审计 / 详情展开 */}
      {expandedApproval[m.id] && (
        <div className="mt-2 pt-2 border-t border-[var(--border)] text-[10px] space-y-1">
          <div className="text-[var(--text-muted)]">审计字段:</div>
          <div>policyHash:<span className="font-mono">{approval.policyHash ?? '—'}</span></div>
          <div>resource:<span className="font-mono">{approval.resource ?? '—'}</span></div>
          <div>reason:<span className="font-mono">{approval.reason ?? '—'}</span></div>
        </div>
      )}
    </div>
  );
}

export { PermissionCard };
export type {
  PermissionCardProps,
  PermissionCardMessage,
  ApprovalRequestLike,
  SignerLike,
  SkillTurnStepLike,
  ToolCallLike,
  PermissionCardUser,
};