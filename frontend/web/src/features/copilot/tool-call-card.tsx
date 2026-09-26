/**
 * 工具调用明细卡 — 拆分自 AssistantBubble 内联 tool calls 列表。
 *
 * ToolCallCard 封装:
 *  - 标题行:Wrench icon + tool name + permission badge + status badge + sandboxId/traceId
 *  - 重试按钮(failed 时)+ 展开/收起按钮
 *  - 错误信息
 *  - 展开体:args JSON + result 预览
 *
 * 完全等价于 AssistantBubble 原内联实现;不改文案 / 不改样式。
 */
import { AlertCircle, CheckCircle2, Lock, PlugZap, RotateCcw, ShieldCheck, Wrench } from 'lucide-react';
import { cn } from '@de/web-utils';
import { Badge } from '@de/web-ui';

interface ToolCallLike {
  id: string;
  name: string;
  status?: string;
  permission?: string;
  durationMs?: number;
  sandboxId?: string;
  traceId?: string;
  error?: string;
  args?: unknown;
  result?: string;
}

interface ToolCallCardProps {
  toolCall: ToolCallLike;
  isOpen: boolean;
  onToggle: () => void;
  onRetry: () => void;
  argsKey: string;
}

function ToolCallCard({
  toolCall: tc,
  isOpen,
  onToggle,
  onRetry,
  argsKey,
}: ToolCallCardProps) {
  const failed = tc.status === 'failed';
  const denied = tc.status === 'denied' || tc.permission === 'denied';

  return (
    <div className={cn('rounded-md border p-2 text-[11px]', failed || denied ? 'border-[var(--danger)]/40 bg-[var(--danger-bg)]' : 'border-[var(--border)] bg-[var(--bg-elevated)]')}>
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
          <button onClick={onRetry} className="text-[10px] text-[var(--danger)] hover:underline ml-auto">
            <RotateCcw className="inline h-2.5 w-2.5 mr-0.5" />自动重试
          </button>
        )}
        {!failed && !denied && (
          <button
            type="button"
            onClick={onToggle}
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
}

export { ToolCallCard };
export type { ToolCallCardProps, ToolCallLike };