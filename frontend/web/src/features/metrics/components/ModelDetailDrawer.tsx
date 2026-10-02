/**
 * ModelDetailDrawer — 4-panel SideDrawer,eyebrow + 自定义 sidebar + content。
 */
import { useEffect, useState } from 'react';
import type {
  CostBreakdown, LatencyPoint, ModelMetric, ThresholdRule, MetricsDrawerPanel,
} from '../schema';
import { SideDrawer } from '@/components/feedback/SideDrawer';
import { DRAWER_NAV } from './constants';
import { AlertPanel, BreakdownPanel, OverviewPanel, TrendPanel } from './DrawerPanels';

function DrawerSidebar({ panel, setPanel }: { panel: MetricsDrawerPanel; setPanel: (p: MetricsDrawerPanel) => void }) {
  return (
    <nav aria-label="指标工作区" className="hidden w-[200px] shrink-0 flex-col gap-1 border-r border-[var(--border)] bg-[var(--bg-elevated)] p-4 sm:flex">
      <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">工作区</p>
      {DRAWER_NAV.map((item) => {
        const Icon = item.icon;
        const active = panel === item.id;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => setPanel(item.id)}
            aria-pressed={active}
            className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs font-semibold transition ${active ? 'bg-[var(--brand-light)] text-[var(--brand)]' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'}`}
          >
            <Icon className="h-4 w-4" />
            {item.label}
          </button>
        );
      })}
    </nav>
  );
}

export function ModelDetailDrawer({ model, latency, breakdown, rules, onClose }: {
  model: ModelMetric;
  latency: LatencyPoint[];
  breakdown: CostBreakdown[];
  rules: ThresholdRule[];
  onClose: () => void;
}) {
  const [panel, setPanel] = useState<MetricsDrawerPanel>('overview');
  useEffect(() => { setPanel('overview'); }, [model.id]);
  return (
    <SideDrawer
      open={true}
      onClose={onClose}
      ariaLabel={`指标详情 ${model.model}`}
      panelClassName="max-w-3xl"
      closeLabel="关闭面板"
      eyebrow={
        <div>
          <p className="text-[11px] font-semibold tracking-[0.2em] text-[var(--text-muted)]">{model.provider}</p>
          <p className="mt-1 font-mono text-2xl font-semibold">{model.model}</p>
        </div>
      }
    >
      <div className="mt-8 flex flex-col sm:flex-row">
        <DrawerSidebar panel={panel} setPanel={setPanel} />
        <div className="flex-1 space-y-5 sm:pl-6">
          {panel === 'overview' && <OverviewPanel model={model} />}
          {panel === 'breakdown' && <BreakdownPanel model={model} breakdown={breakdown} />}
          {panel === 'trend' && <TrendPanel points={latency} />}
          {panel === 'alert' && <AlertPanel model={model} rules={rules} />}
        </div>
      </div>
    </SideDrawer>
  );
}