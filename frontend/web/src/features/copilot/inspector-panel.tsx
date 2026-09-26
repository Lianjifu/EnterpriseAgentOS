/**
 * Copilot 右侧 inspector / context 抽屉 — 拆分自 pages/Copilot.tsx 内联 aside。
 *
 * 封装:
 *  - 顶部:员工头像 + 名字 + role + 来源(消息上下文 / 专家上下文)
 *  - 状态行:接管/生成/执行模式 badge + 风险等级 + 接管提示
 *  - tab 导航:overview / document / evidence / tasks / approvals / audit / admin
 *  - tab 主体:overview → ExpertContextPanel,其他 → ContextDrawerPanel,admin → 风险切换 + 调试
 *  - 操作按钮:返回来源消息(消息上下文时显示)+ 固定 + 关闭
 */
import { ArrowUp, Pin, Settings, X, Activity } from 'lucide-react';
import { cn } from '@de/web-utils';
import { Badge, Button } from '@de/web-ui';
import { DigitalEmployeeAvatar } from '@/components/DigitalEmployeeAvatar';
import { ContextDrawerPanel } from '@/features/copilot/atoms';
import { ExpertContextPanel } from '@/features/copilot/expert-context-panel';
import type { DigitalEmployee } from '@de/web-types';
import type { ChatMessageEx, Citation } from '@/hooks/types';
import type { WorkbenchContextTab } from '@/features/copilot/workbench';
import type { RunMode } from '@/features/copilot/composer-mode';
import type { SkillArtifactLink } from '@/features/copilot/artifact-links';

interface InspectorModel {
  label: string;
  tier: string;
}

interface ContextTabDescriptor {
  tab: WorkbenchContextTab;
  label: string;
  count?: number;
}

interface ContextSummary {
  nextAction: string;
  linkedTasks: number;
  pendingApprovals: number;
  evidence: number;
  executions: number;
}

type CitationLike = Citation;
type ExpertOverview = { [key: string]: unknown };

interface InspectorPanelProps {
  open: boolean;
  scope: string;
  tab: WorkbenchContextTab;
  pinned: boolean;
  messageId?: string;
  startSlide?: number;
  expertName: string;
  expertMeta?: string | null;
  activeEmployee?: DigitalEmployee | null;
  workbenchTitle: string;
  selectedContextMessageCreatedAt?: string;
  riskLevel: 'low' | 'medium' | 'high';
  runMode: RunMode;
  handoffActive: boolean;
  handoffOwner: string;
  isGenerating: boolean;
  visibleContextTabs: ContextTabDescriptor[];
  contextMessages: ChatMessageEx[];
  focusedCitation: CitationLike | null;
  selectedDocumentArtifact: SkillArtifactLink | null | undefined;
  expertOverview: ExpertOverview | null;
  sessionExpertContext: ExpertOverview | null;
  messageExpertContext: ExpertOverview | null;
  contextSummary: ContextSummary;
  turnProgress: any;
  // admin tab
  currentModel: InspectorModel;
  enabledToolCount: number;
  availableToolsCount: number;
  sessionMode: string;
  onRiskLevelChange: (next: 'low' | 'medium' | 'high') => void;
  onOpenDebug: () => void;
  // callbacks
  onClose: () => void;
  onPinToggle: () => void;
  onJumpMessage: (mid: string) => void;
  onOpenTab: (tab: WorkbenchContextTab) => void;
  onPickExpert: () => void;
  onCitation: (c: CitationLike) => void;
}

function InspectorPanel({
  open,
  scope,
  tab,
  pinned,
  messageId,
  startSlide,
  expertName,
  expertMeta,
  activeEmployee,
  workbenchTitle,
  selectedContextMessageCreatedAt,
  riskLevel,
  runMode,
  handoffActive,
  handoffOwner,
  isGenerating,
  visibleContextTabs,
  contextMessages,
  focusedCitation,
  selectedDocumentArtifact,
  expertOverview,
  sessionExpertContext,
  messageExpertContext,
  contextSummary,
  turnProgress,
  currentModel,
  enabledToolCount,
  availableToolsCount,
  sessionMode,
  onRiskLevelChange,
  onOpenDebug,
  onClose,
  onPinToggle,
  onJumpMessage,
  onOpenTab,
  onPickExpert,
  onCitation,
}: InspectorPanelProps) {
  if (!open) {
    return (
      <aside
        id="copilot-agent-details"
        className="copilot-agent-details"
        aria-label="会话上下文"
        data-open="false"
        aria-expanded={false}
      />
    );
  }

  return (
    <aside
      id="copilot-agent-details"
      className="copilot-agent-details"
      aria-label="会话上下文"
      data-open="true"
      aria-expanded={true}
    >
      <div className="copilot-agent-details__inner flex min-h-0 flex-1 flex-col">
        <header className="copilot-agent-details__header shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-start gap-2.5">
              <span className="copilot-agent-details__avatar shrink-0 overflow-hidden rounded-full">
                <DigitalEmployeeAvatar
                  employee={activeEmployee ?? { id: 'assistant', name: expertName }}
                  size={32}
                />
              </span>
              <div className="min-w-0">
                <div className="copilot-agent-details__eyebrow">{scope === 'message' ? '消息上下文' : '专家上下文'}</div>
                <div className="copilot-agent-details__title truncate">{expertName}</div>
                {expertMeta && <div className="mt-0.5 truncate text-[10px] text-[var(--text-muted)]">{expertMeta}</div>}
                <div className="mt-1 truncate text-[11px] text-[var(--text-muted)]">
                  {scope === 'message' && selectedContextMessageCreatedAt
                    ? `来源消息 · ${selectedContextMessageCreatedAt}`
                    : `会话 · ${workbenchTitle}`}
                </div>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              {scope === 'message' && messageId && (
                <button
                  type="button"
                  onClick={() => onJumpMessage(messageId)}
                  title="回到来源消息"
                  aria-label="回到来源消息"
                  className="copilot-details-header-action grid h-8 w-8 place-items-center rounded-lg bg-[var(--surface-1)] text-[var(--text-muted)]"
                >
                  <ArrowUp className="h-4 w-4" />
                </button>
              )}
              <button
                type="button"
                onClick={onPinToggle}
                title={pinned ? '取消固定上下文' : '固定当前上下文'}
                aria-label={pinned ? '取消固定上下文' : '固定当前上下文'}
                aria-pressed={pinned}
                className={cn('copilot-details-header-action grid h-8 w-8 place-items-center rounded-lg bg-[var(--surface-1)] text-[var(--text-muted)]', pinned && 'is-pinned')}
              >
                <Pin className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={onClose}
                title="关闭会话上下文"
                aria-label="关闭会话上下文"
                className="copilot-details-header-action grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[var(--surface-1)] text-[var(--text-muted)] hover:!bg-[var(--danger-bg)] hover:!text-[var(--danger)]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div className="copilot-agent-details__status-row">
            <span
              className={cn('copilot-agent-details__status-dot', handoffActive || runMode === 'agent' ? 'copilot-agent-details__status-dot--warning' : 'copilot-agent-details__status-dot--active')}
              aria-hidden="true"
            />
            <Badge tone={handoffActive || runMode === 'agent' ? 'warn' : isGenerating ? 'info' : 'brand'} className="text-[10px]">
              {handoffActive ? '人工接管中' : isGenerating ? '生成中' : runMode === 'agent' ? '执行模式' : runMode === 'ask' ? '问答中' : '方案中'}
            </Badge>
            <span className={cn('copilot-agent-details__risk', riskLevel === 'high' ? 'copilot-agent-details__risk--high' : riskLevel === 'medium' ? 'copilot-agent-details__risk--medium' : 'copilot-agent-details__risk--low')}>
              风险 {riskLevel === 'high' ? '高' : riskLevel === 'medium' ? '中' : '低'}
            </span>
            {handoffActive && <span className="copilot-agent-details__handoff">由 {handoffOwner} 处理后续变更</span>}
          </div>
        </header>

        <nav className="copilot-agent-details__tabs shrink-0" aria-label="会话上下文分区">
          {visibleContextTabs.map(({ tab: t, label, count }) => (
            <button
              key={t}
              type="button"
              onClick={() => onOpenTab(t)}
              aria-current={tab === t ? 'page' : undefined}
              className={cn('copilot-agent-details__tab', tab === t && 'is-active')}
            >
              <span>{label}</span>
              {count !== undefined && <span className="copilot-agent-details__tab-count">{count}</span>}
            </button>
          ))}
        </nav>

        <div className="copilot-agent-details__body min-h-0 flex-1">
          {tab === 'admin' && (
            <section className="copilot-agent-details__section copilot-agent-details__section--admin space-y-3">
              <div className="copilot-agent-details__section-heading flex items-center gap-1.5">
                <Settings className="h-3.5 w-3.5 text-[var(--brand)]" />运行控制 <Badge tone="brand" className="ml-auto text-[9px]">管理员</Badge>
              </div>
              <div className="flex items-center justify-between gap-3 text-xs">
                <span className="text-[var(--text-muted)]">当前模型</span>
                <span className="font-mono text-[11px]">{currentModel.label} · {currentModel.tier}</span>
              </div>
              <div className="flex items-center justify-between gap-3 text-xs">
                <span className="text-[var(--text-muted)]">启用工具</span>
                <span className="font-mono text-[11px]">{enabledToolCount}/{availableToolsCount}</span>
              </div>
              <label className="flex items-center justify-between gap-3 text-xs">
                <span className="text-[var(--text-muted)]">执行风险</span>
                <select
                  value={riskLevel}
                  onChange={(event) => onRiskLevelChange(event.target.value as 'low' | 'medium' | 'high')}
                  className="rounded border border-[var(--border)] bg-[var(--bg)] px-2 py-1 text-[11px]"
                >
                  <option value="low">低 · 仅可逆操作</option>
                  <option value="medium">中 · 需审批</option>
                  <option value="high">高 · 人工审核与回滚</option>
                </select>
              </label>
              <Button size="sm" variant="secondary" className="w-full justify-center" onClick={onOpenDebug}>
                <Activity className="h-3.5 w-3.5" />查看调试与链路指标
              </Button>
              <p className="text-[10px] text-[var(--text-muted)]">{sessionMode}</p>
            </section>
          )}
          {tab !== 'overview' && tab !== 'admin' && (
            <ContextDrawerPanel
              tab={tab}
              messages={contextMessages}
              onCitation={onCitation as any}
              focusedCitation={focusedCitation}
              artifact={selectedDocumentArtifact ?? undefined}
              startSlide={startSlide}
            />
          )}
          {tab === 'overview' && (
            <ExpertContextPanel
              employee={activeEmployee}
              overview={expertOverview as any}
              sessionOverview={sessionExpertContext as any}
              messageOverview={messageExpertContext as any}
              scope={(scope === 'session' || scope === 'message') ? scope : 'session'}
              runMode={runMode}
              riskLevel={riskLevel}
              handoffActive={handoffActive}
              handoffOwner={handoffOwner}
              nextAction={contextSummary.nextAction}
              summaryCounts={{
                linkedTasks: contextSummary.linkedTasks,
                pendingApprovals: contextSummary.pendingApprovals,
                evidence: contextSummary.evidence,
                executions: contextSummary.executions,
              }}
              onOpenTab={onOpenTab}
              onCitation={(c: Citation) => onCitation(c)}
              onJumpMessage={onJumpMessage}
              onPickExpert={onPickExpert}
              turnProgress={turnProgress}
            />
          )}
        </div>
      </div>
    </aside>
  );
}

export { InspectorPanel };
export type { InspectorPanelProps, ContextTabDescriptor, ContextSummary, InspectorModel };