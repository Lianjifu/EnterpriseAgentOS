/**
 * FlowCard — 工作流列表行。点击进详情；操作保留发布 / 复制 / 下线。
 */
import { CheckCircle2, Copy, Pause, Rocket, Workflow } from 'lucide-react';
import {
  AdminListActions, AdminListIdentity, AdminListMetric, AdminListMetrics, AdminListRow,
  adminListActionBtn, adminListDangerBtn,
} from '@/components/feedback/AdminListRow';
import type { Flow } from '../schema';
import { STATUS_BADGE, TRIGGER_BADGE } from './constants';

export function FlowCard({ flow, onView, onCopy, onPublish, onRetire }: {
  flow: Flow;
  onView: (id: string) => void;
  onCopy: (f: Flow) => void;
  onPublish: (f: Flow) => void;
  onRetire: (f: Flow) => void;
}) {
  const TriggerIcon = TRIGGER_BADGE[flow.trigger].icon;
  const status = STATUS_BADGE[flow.status];
  const isPublished = flow.status === 'published';
  const isRetired = flow.status === 'retired';

  return (
    <AdminListRow hasCheckbox={false} hasStar={false}>
      <div
        role="button"
        tabIndex={0}
        onClick={() => onView(flow.id)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onView(flow.id);
          }
        }}
        aria-label={`查看 ${flow.name} 详情`}
        className="absolute inset-0 z-0 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--brand)]"
      />
      <AdminListIdentity>
        <div className="flex min-w-0 items-center gap-1.5">
          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
            <Workflow className="h-3.5 w-3.5" />
          </span>
          <h3 className="truncate text-sm font-semibold group-hover:text-[var(--brand)]">{flow.name}</h3>
          <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${status.className}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />{status.label}
          </span>
          <span className={`hidden shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold sm:inline-flex ${TRIGGER_BADGE[flow.trigger].className}`}>
            <TriggerIcon className="h-3 w-3" />{TRIGGER_BADGE[flow.trigger].label}
          </span>
        </div>
        <p className="mt-0.5 truncate text-[11px] text-[var(--text-muted)]">{flow.scene} · {flow.owner} · {flow.description}</p>
      </AdminListIdentity>
      <AdminListMetrics cols={3}>
        <AdminListMetric>{flow.initialNodes.length} 节点</AdminListMetric>
        <AdminListMetric>{flow.initialEdges.length} 连线</AdminListMetric>
        <AdminListMetric>{flow.callCount} 次</AdminListMetric>
      </AdminListMetrics>
      <AdminListActions>
        <button
          type="button"
          disabled={isPublished || isRetired}
          onClick={(event) => { event.stopPropagation(); onPublish(flow); }}
          className={adminListActionBtn}
        >
          {isPublished ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Rocket className="h-3.5 w-3.5" />}
          {isPublished ? '已发布' : isRetired ? '已下线' : '发布'}
        </button>
        <button type="button" onClick={(event) => { event.stopPropagation(); onCopy(flow); }} className={adminListActionBtn}>
          <Copy className="h-3.5 w-3.5" />复制
        </button>
        {isPublished ? (
          <button type="button" onClick={(event) => { event.stopPropagation(); onRetire(flow); }} className={adminListDangerBtn}>
            <Pause className="h-3.5 w-3.5" />下线
          </button>
        ) : null}
      </AdminListActions>
    </AdminListRow>
  );
}
