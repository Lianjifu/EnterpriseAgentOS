/**
 * Copilot 顶部 chrome bar — 拆分自 pages/Copilot.tsx 内联 header。
 *
 * TopBar 封装:
 *  - 决策徽章(人工交接 / 需审批 / 脱敏放行 / 仅问答 / 方案优先)
 *  - 工作标题 + 状态 badge(待处置 / 生成中 / 执行模式 / 问答中 / 方案中)
 *  - 风险 badge(高 / 中)
 *  - 智能体 chip(头像 + 姓名 + role,点击触发 rebind picker)
 *  - "专家上下文" 按钮(可选,受 canOpenExpertContext 控制)
 *  - "更多" 菜单(结束会话 / 人工交接 / 导出证据子菜单)
 *
 * 自身状态:moreMenuOpen / exportSubOpen,refs:moreMenuRef / detailsToggleRef。
 */
import { useEffect, useRef, useState } from 'react';
import { cn } from '@de/web-utils';
import { Badge, Button } from '@de/web-ui';
import {
  Activity, AlertTriangle, CheckCircle2, ChevronRight, FileText,
  MoreHorizontal, ShieldCheck, Users,
} from 'lucide-react';
import { DigitalEmployeeAvatar } from '@/components/DigitalEmployeeAvatar';
import type { DigitalEmployee } from '@de/web-types';
import type { RunMode } from '@/features/copilot/composer-mode';
import type { WorkbenchSummary } from '@/features/copilot/workbench';

interface SessionUsage {
  tokens: number;
  priced?: number | null;
}

interface TopBarProps {
  workbench: WorkbenchSummary & { pendingApprovals?: number; nextAction?: string };
  runMode: RunMode;
  riskLevel: 'low' | 'medium' | 'high';
  isGenerating: boolean;
  handoffActive: boolean;
  handoffOwner?: string;
  sessionUsage: SessionUsage;
  expertName: string;
  expertMeta?: string | null;
  activeEmployee?: Pick<DigitalEmployee, 'id' | 'name' | 'lifecycle'> | null;
  hasBoundExpert: boolean;
  canOpenExpertContext: boolean;
  isClosed?: boolean;
  detailsToggleRef?: React.Ref<HTMLButtonElement>;
  onOpenRebindExpertPicker: () => void;
  onOpenContext: (tab: 'overview') => void;
  onCloseSession: () => void;
  onHandoffOpen: () => void;
  onPrintAuditRecord: () => void;
  onExport: (format: 'markdown' | 'json') => void;
}

function TopBar({
  workbench,
  runMode,
  riskLevel,
  isGenerating,
  handoffActive,
  handoffOwner,
  sessionUsage,
  expertName,
  expertMeta,
  activeEmployee,
  hasBoundExpert,
  canOpenExpertContext,
  isClosed,
  detailsToggleRef,
  onOpenRebindExpertPicker,
  onOpenContext,
  onCloseSession,
  onHandoffOpen,
  onPrintAuditRecord,
  onExport,
}: TopBarProps) {
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [exportSubOpen, setExportSubOpen] = useState(false);
  const moreMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!moreMenuOpen) return;
    const onPointer = (event: MouseEvent) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(event.target as Node)) {
        setMoreMenuOpen(false);
        setExportSubOpen(false);
      }
    };
    window.addEventListener('mousedown', onPointer);
    return () => window.removeEventListener('mousedown', onPointer);
  }, [moreMenuOpen]);

  const decision = handoffActive
    ? { label: '人工交接', tone: 'warn' as const, text: `写操作已暂停，由 ${handoffOwner} 继续处置。` }
    : workbench.pendingApprovals
      ? { label: '需审批', tone: 'warn' as const, text: `${workbench.pendingApprovals} 项写操作待人工审核 · 打开消息中的审批卡授权` }
      : runMode === 'agent' && riskLevel === 'high'
        ? { label: '需审批', tone: 'warn' as const, text: '高风险执行 · 写操作需人工审核授权' }
        : runMode === 'agent'
          ? { label: '脱敏放行', tone: 'info' as const, text: '执行模式 · 写操作进入审批与审计' }
          : runMode === 'ask'
            ? { label: '仅问答', tone: 'success' as const, text: '只回答不改系统 · 需要变更请切换方案或执行' }
            : { label: '方案优先', tone: 'success' as const, text: '先出计划再确认 · 写操作请切换到执行' };

  const showCost = sessionUsage.tokens > 0;
  const showSanitizedTag = runMode === 'agent' && riskLevel === 'low' && !workbench.pendingApprovals && !handoffActive;

  return (
    <header className="app-glass copilot-header px-4 py-3 sm:px-5">
      <div className="copilot-work-header">
        <div className="flex min-w-0 items-center gap-3">
          <div className={cn('grid h-10 w-10 shrink-0 place-items-center rounded-lg', workbench.tone === 'warning' ? 'bg-[var(--warning-bg)] text-[var(--warning)]' : 'bg-[var(--brand-light)] text-[var(--brand)]')}>
            {workbench.tone === 'warning' ? <AlertTriangle className="h-5 w-5" /> : <Activity className="h-5 w-5" />}
          </div>
          <div className="min-w-0">
            <div className="flex min-w-0 flex-wrap items-center gap-1.5">
              <span className="copilot-work-title truncate font-semibold" title={workbench.title}>{workbench.title}</span>
              <Badge tone={workbench.tone === 'warning' ? 'warn' : isGenerating ? 'info' : 'brand'} className="shrink-0 text-[10px]">
                {workbench.pendingApprovals ? '待处置' : isGenerating ? '生成中' : runMode === 'agent' ? '执行模式' : runMode === 'ask' ? '问答中' : '方案中'}
              </Badge>
              {riskLevel !== 'low' && (
                <Badge tone={riskLevel === 'high' ? 'error' : 'warn'} className="shrink-0 text-[10px] font-semibold ring-1 ring-inset ring-current/30">
                  {riskLevel === 'high' ? '高风险' : '中风险'}
                </Badge>
              )}
              {showSanitizedTag && (
                <Badge tone="success" className="shrink-0 text-[10px] ring-1 ring-inset ring-[var(--success)]/30">
                  <ShieldCheck className="mr-0.5 inline h-2.5 w-2.5" />已脱敏
                </Badge>
              )}
            </div>
            {(workbench.nextAction || handoffActive) && (
              <div className="copilot-header__meta copilot-work-next mt-0.5 flex items-center gap-1.5 text-[var(--text-muted)]">
                {workbench.nextAction && <span className="truncate">下一步：{workbench.nextAction}</span>}
                {handoffActive && <span className="hidden sm:inline">{workbench.nextAction ? '· ' : ''}已由 {handoffOwner} 接管</span>}
              </div>
            )}
          </div>
        </div>

        <div className="copilot-header__actions shrink-0">
          <button type="button" onClick={onOpenRebindExpertPicker} className="copilot-toolbar-btn copilot-toolbar-btn--expert hidden sm:inline-flex" title={hasBoundExpert ? '查看或改绑智能体' : '选择智能体（可选）'}>
            <span className="copilot-toolbar-btn__icon relative !bg-transparent !p-0" style={{ boxShadow: 'none' }}>
              <DigitalEmployeeAvatar
                employee={activeEmployee ?? { id: 'assistant', name: expertName }}
                size={22}
              />
              {hasBoundExpert && activeEmployee?.lifecycle === 'active' && <span className="absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full bg-[var(--success)] ring-1 ring-white" />}
            </span>
            <span className="copilot-toolbar-btn__label">
              <span className="copilot-toolbar-btn__name">{hasBoundExpert ? expertName : '选择专家'}</span>
              {expertMeta && <span className="copilot-toolbar-btn__role">{expertMeta}</span>}
            </span>
          </button>
          {canOpenExpertContext && (
            <Button ref={detailsToggleRef} variant="secondary" size="sm" className="copilot-header-action" onClick={() => onOpenContext('overview')}>
              <FileText className="h-3.5 w-3.5" />专家上下文
            </Button>
          )}
          <div className="relative" ref={moreMenuRef}>
            <Button
              variant="secondary"
              size="sm"
              className="copilot-header-action"
              aria-haspopup="menu"
              aria-expanded={moreMenuOpen}
              onClick={() => { setMoreMenuOpen((open) => !open); setExportSubOpen(false); }}
            >
              <MoreHorizontal className="h-3.5 w-3.5" />更多
            </Button>
            {moreMenuOpen && (
              <div role="menu" className="absolute right-0 top-full z-40 mt-1 w-48 overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface-1)] py-1 shadow-lg">
                <button type="button" role="menuitem" disabled={isClosed} className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs hover:bg-[var(--bg-hover)] disabled:opacity-40" onClick={() => { setMoreMenuOpen(false); onCloseSession(); }}>
                  <CheckCircle2 className="h-3.5 w-3.5 text-[var(--text-muted)]" />结束会话
                </button>
                <button type="button" role="menuitem" disabled={isClosed || handoffActive} className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs hover:bg-[var(--bg-hover)] disabled:opacity-40" onClick={() => { setMoreMenuOpen(false); onHandoffOpen(); }}>
                  <Users className="h-3.5 w-3.5 text-[var(--text-muted)]" />人工交接
                </button>
                <div className="my-1 border-t border-[var(--border)]" />
                <button type="button" role="menuitem" className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs hover:bg-[var(--bg-hover)]" onClick={() => setExportSubOpen((open) => !open)}>
                  <ShieldCheck className="h-3.5 w-3.5 text-[var(--text-muted)]" />导出证据
                  <ChevronRight className="ml-auto h-3 w-3 text-[var(--text-muted)]" />
                </button>
                {exportSubOpen && (
                  <div className="border-t border-[var(--border)] bg-[var(--bg-elevated)] py-1">
                    <button type="button" role="menuitem" className="flex w-full px-3 py-1.5 text-left text-[11px] hover:bg-[var(--bg-hover)]" onClick={() => { setMoreMenuOpen(false); onPrintAuditRecord(); }}>证据包 · 打印 / PDF</button>
                    <button type="button" role="menuitem" className="flex w-full px-3 py-1.5 text-left text-[11px] hover:bg-[var(--bg-hover)]" onClick={() => { setMoreMenuOpen(false); onExport('markdown'); }}>Markdown</button>
                    <button type="button" role="menuitem" className="flex w-full px-3 py-1.5 text-left text-[11px] hover:bg-[var(--bg-hover)]" onClick={() => { setMoreMenuOpen(false); onExport('json'); }}>JSON</button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="copilot-header__decision" role="status" aria-label="策略裁决">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          {decision.label !== '脱敏放行' && (
            <Badge tone={decision.tone} className="shrink-0">{decision.label}</Badge>
          )}
          <span className="copilot-header__decision-text">{decision.text}</span>
        </div>
        {showCost && (
          <span className="shrink-0 font-mono text-[10px] text-[var(--text-muted)]" title={`计入 ${expertName}`}>
            {sessionUsage.priced != null ? `¥${sessionUsage.priced}` : '计量中'} · {sessionUsage.tokens} tok · {expertName}
          </span>
        )}
      </div>
    </header>
  );
}

export { TopBar };
export type { TopBarProps, SessionUsage };