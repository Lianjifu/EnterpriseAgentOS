/**
 * SessionDetailDrawer — 会话详情的 SideDrawer,4 子面板由左侧 nav 切换。
 */
import { useEffect, useState } from 'react';
import { Activity, FileText } from 'lucide-react';
import { SideDrawer } from '@/components/feedback/SideDrawer';
import type { DrawerPanel, Session, Span } from '../schema';
import { SESSION_BADGE } from './constants';
import {
  DrawerPanelContext, DrawerPanelLogs, DrawerPanelOverview, DrawerPanelSpans, DrawerSidebar,
} from './DrawerPanels';

export function SessionDetailDrawer({
  session,
  spans,
  onClose,
}: {
  session: Session | null;
  spans: Span[];
  onClose: () => void;
}) {
  const [panel, setPanel] = useState<DrawerPanel>('overview');
  useEffect(() => {
    setPanel('overview');
  }, [session?.id]);
  if (!session) return null;
  const badge = SESSION_BADGE[session.status];
  return (
    <SideDrawer
      open={session !== null}
      onClose={onClose}
      ariaLabel={`会话 ${session.id}`}
      panelClassName="max-w-3xl"
      closeLabel="关闭会话详情"
      eyebrow={
        <div className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-[var(--brand-light)] text-[var(--brand)]">
            <Activity className="h-4 w-4" />
          </span>
          <p className="text-[11px] font-semibold tracking-[0.2em] text-[var(--brand)]">调用链路</p>
        </div>
      }
    >
      <div className="mt-8">
        <h3 className="font-mono text-2xl font-semibold">{session.id}</h3>
        <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">{session.summary}</p>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[11px] font-semibold ${badge.className}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${badge.dot}`} aria-hidden="true" />
            {badge.label}
          </span>
          <span className="rounded-full bg-[var(--bg-elevated)] px-2 py-1 text-[11px] font-medium">{session.agentName}</span>
          <span className="rounded-full bg-[var(--bg-elevated)] px-2 py-1 text-[11px] font-medium">{session.user}</span>
        </div>
      </div>
      <div className="mt-8 flex flex-col sm:flex-row">
        <DrawerSidebar panel={panel} setPanel={setPanel} />
        <div className="flex-1 space-y-5 sm:pl-6">
          {panel === 'overview' && <DrawerPanelOverview session={session} />}
          {panel === 'spans' && <DrawerPanelSpans session={session} spans={spans} />}
          {panel === 'context' && <DrawerPanelContext session={session} />}
          {panel === 'logs' && <DrawerPanelLogs session={session} />}
        </div>
      </div>
      <div className="mt-8 flex items-center justify-end gap-2 border-t border-[var(--border)] pt-5">
        <button type="button" onClick={onClose} className="rounded-lg border border-[var(--border)] px-4 py-2 text-xs font-semibold">
          关闭
        </button>
        <button
          type="button"
          onClick={() => alert('已生成调用链路报告')}
          className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--brand)] px-4 py-2 text-xs font-semibold text-white hover:bg-[var(--brand-hover)]"
        >
          <FileText className="h-3.5 w-3.5" />
          生成报告
        </button>
      </div>
    </SideDrawer>
  );
}