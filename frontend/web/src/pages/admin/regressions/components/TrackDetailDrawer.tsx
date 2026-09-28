/**
 * AdminRegressions — 追踪详情侧拉。
 * 4 个 panel: 基本信息 / 基线对比 / 回归用例 / 变更历史。
 */
import { History, LineChart, ListChecks, RefreshCw, Save, Settings, ShieldAlert, ShieldCheck } from 'lucide-react';
import { AlertTriangle, ShieldQuestion } from 'lucide-react';
import { GitBranch, X } from 'lucide-react';
import { CheckCircle2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { DrawerPanel, RegressionRisk, RegressionTrack } from '@/api/admin/regressions/schema';
import { SideDrawer } from '@/components/feedback/SideDrawer';
import { DRAWER_NAV_ITEMS, RISK_BADGE, STATUS_BADGE } from './constants';
import { Delta, Sparkline } from './Primitives';

const navIconMap: Record<string, typeof History> = {
  History, LineChart, ListChecks, Settings,
};
const riskIconMap: Record<string, typeof ShieldCheck> = {
  ShieldCheck, ShieldQuestion, AlertTriangle, ShieldAlert,
};

interface DrawerPanelBasicProps {
  track: RegressionTrack;
  onChange: (patch: Partial<RegressionTrack>) => void;
}

function DrawerPanelBasic({ track, onChange }: DrawerPanelBasicProps) {
  const update = (patch: Partial<RegressionTrack>) => onChange(patch);
  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">追踪名称</label>
          <input type="text" value={track.name} onChange={(e) => update({ name: e.target.value })} className="mt-1.5 h-10 w-full rounded-xl border border-[var(--border-strong)] bg-[var(--bg-elevated)] px-3 text-sm outline-none focus:border-[var(--brand)]" />
        </div>
        <div>
          <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">追踪对象</label>
          <input type="text" value={track.agent} onChange={(e) => update({ agent: e.target.value })} className="mt-1.5 h-10 w-full rounded-xl border border-[var(--border-strong)] bg-[var(--bg-elevated)] px-3 text-sm outline-none focus:border-[var(--brand)]" />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">基线版本</label>
          <input type="text" value={track.baselineVersion} onChange={(e) => update({ baselineVersion: e.target.value })} className="mt-1.5 h-10 w-full rounded-xl border border-[var(--border-strong)] bg-[var(--bg-elevated)] px-3 text-sm outline-none focus:border-[var(--brand)]" />
        </div>
        <div>
          <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">当前版本</label>
          <input type="text" value={track.currentVersion} onChange={(e) => update({ currentVersion: e.target.value })} className="mt-1.5 h-10 w-full rounded-xl border border-[var(--border-strong)] bg-[var(--bg-elevated)] px-3 text-sm outline-none focus:border-[var(--brand)]" />
        </div>
        <div>
          <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">负责人</label>
          <input type="text" value={track.owner} onChange={(e) => update({ owner: e.target.value })} className="mt-1.5 h-10 w-full rounded-xl border border-[var(--border-strong)] bg-[var(--bg-elevated)] px-3 text-sm outline-none focus:border-[var(--brand)]" />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">调度</label>
          <input type="text" value={track.schedule} onChange={(e) => update({ schedule: e.target.value })} className="mt-1.5 h-10 w-full rounded-xl border border-[var(--border-strong)] bg-[var(--bg-elevated)] px-3 text-sm outline-none focus:border-[var(--brand)]" />
        </div>
        <div>
          <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">风险等级</label>
          <select value={track.risk} onChange={(e) => update({ risk: e.target.value as RegressionRisk })} className="mt-1.5 h-10 w-full rounded-xl border border-[var(--border-strong)] bg-[var(--bg-elevated)] px-3 text-sm outline-none focus:border-[var(--brand)]">
            {(Object.keys(RISK_BADGE) as RegressionRisk[]).map((r) => <option key={r} value={r}>{RISK_BADGE[r].label}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">说明</label>
        <textarea value={track.notes} onChange={(e) => update({ notes: e.target.value })} rows={3} className="mt-1.5 w-full rounded-xl border border-[var(--border-strong)] bg-[var(--bg-elevated)] px-3 py-2 text-sm outline-none focus:border-[var(--brand)]" />
      </div>
    </div>
  );
}

function DrawerPanelBaseline({ track }: { track: RegressionTrack }) {
  const rows: Array<{ label: string; baseline: number; current: number; delta: number; unit: string; invertColor?: boolean }> = [
    { label: '通过率', baseline: track.baseline.passRate, current: track.current.passRate, delta: track.passRateDelta, unit: '%' },
    { label: 'P95 延迟', baseline: track.baseline.latencyMs, current: track.current.latencyMs, delta: track.latencyDelta, unit: ' ms', invertColor: true },
    { label: '单次成本', baseline: track.baseline.cost, current: track.current.cost, delta: track.costDelta, unit: ' ¥', invertColor: true },
    { label: '平均评分', baseline: track.baseline.avgScore, current: track.current.avgScore, delta: track.scoreDelta, unit: '' },
  ];
  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--surface-1)]">
        <table className="w-full text-left text-xs">
          <thead className="bg-[var(--bg-elevated)] text-[var(--text-muted)]">
            <tr>
              <th className="px-3 py-2 font-semibold">指标</th>
              <th className="px-3 py-2 font-semibold">基线</th>
              <th className="px-3 py-2 font-semibold">当前</th>
              <th className="px-3 py-2 font-semibold">变化</th>
              <th className="px-3 py-2 font-semibold">趋势</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.label} className="border-t border-[var(--border)]">
                <td className="px-3 py-2 font-semibold">{r.label}</td>
                <td className="px-3 py-2 tabular-nums">{r.baseline.toFixed(1)}{r.unit}</td>
                <td className="px-3 py-2 tabular-nums">{r.current.toFixed(1)}{r.unit}</td>
                <td className="px-3 py-2"><Delta value={r.delta} suffix={r.unit} invertColor={r.invertColor} /></td>
                <td className="px-3 py-2">
                  <Sparkline data={r.label === '通过率' ? track.passRateTrend : r.label === 'P95 延迟' ? track.latencyTrend : r.label === '单次成本' ? track.costTrend : track.passRateTrend} stroke="var(--brand)" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function DrawerPanelCases({ track }: { track: RegressionTrack }) {
  if (track.casesList.length === 0) {
    return <div className="rounded-2xl border border-dashed border-[var(--border)] p-6 text-center text-[11px] text-[var(--text-muted)]">本次回归暂未挂载具体用例。</div>;
  }
  return (
    <ul className="space-y-2">
      {track.casesList.map((c) => (
        <li key={c.id} className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-3">
          {c.pass ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <X className="h-4 w-4 text-rose-500" />}
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold">{c.name}</p>
            <p className="mt-0.5 text-[11px] text-[var(--text-muted)]">耗时变化:{c.delta}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}

function DrawerPanelHistory({ track }: { track: RegressionTrack }) {
  if (track.history.length === 0) {
    return <div className="rounded-2xl border border-dashed border-[var(--border)] p-6 text-center text-[11px] text-[var(--text-muted)]">暂无历史。</div>;
  }
  return (
    <ul className="space-y-2">
      {track.history.map((h, idx) => {
        const badge = STATUS_BADGE[h.status];
        return (
          <li key={idx} className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-3">
            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${badge.className}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${badge.dot}`} aria-hidden="true" />{badge.label}
              </span>
              <span className="text-xs font-semibold">{h.checkedAt}</span>
              <span className="ml-auto"><Delta value={h.passRateDelta} /></span>
            </div>
            <p className="mt-1 text-[11px] text-[var(--text-muted)]">{h.notes}</p>
          </li>
        );
      })}
    </ul>
  );
}

function DrawerSidebar({ panel, setPanel }: { panel: DrawerPanel; setPanel: (p: DrawerPanel) => void }) {
  return (
    <nav aria-label="回归追踪工作区" className="hidden w-[200px] shrink-0 flex-col gap-1 border-r border-[var(--border)] bg-[var(--bg-elevated)] p-4 sm:flex">
      <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">工作区</p>
      {DRAWER_NAV_ITEMS.map((item) => {
        const Icon = navIconMap[item.icon] ?? History;
        const active = panel === item.id;
        return (
          <button key={item.id} type="button" onClick={() => setPanel(item.id)} aria-pressed={active} className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs font-semibold transition ${active ? 'bg-[var(--brand-light)] text-[var(--brand)]' : 'text-[var(--text-secondary)] hover:bg-[var(--surface-1)]'}`}>
            <Icon className="h-4 w-4" />
            {item.label}
          </button>
        );
      })}
    </nav>
  );
}

interface TrackDetailDrawerProps {
  track: RegressionTrack | null;
  onClose: () => void;
  onChange: (patch: Partial<RegressionTrack>) => void;
  onSave: () => void;
  onRun: () => void;
}

export function TrackDetailDrawer({ track, onClose, onChange, onSave, onRun }: TrackDetailDrawerProps) {
  const [panel, setPanel] = useState<DrawerPanel>('basic');
  useEffect(() => { setPanel('basic'); }, [track?.id]);
  if (!track) return null;
  const badge = STATUS_BADGE[track.status];
  const risk = RISK_BADGE[track.risk];
  const RiskIcon = riskIconMap[risk.icon] ?? ShieldCheck;
  return (
    <SideDrawer open={track !== null} onClose={onClose} ariaLabel={`${track.name}详情`} panelClassName="max-w-3xl" closeLabel="关闭追踪详情" eyebrow={<div className="flex items-center gap-2"><span className="grid h-9 w-9 place-items-center rounded-lg bg-[var(--brand-light)] text-[var(--brand)]"><GitBranch className="h-4 w-4" /></span><p className="text-[11px] font-semibold tracking-[0.2em] text-[var(--brand)]">回归追踪</p></div>}>
      <div className="mt-8">
        <h3 className="text-2xl font-semibold">{track.name}</h3>
        <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">{track.notes}</p>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[11px] font-semibold ${badge.className}`}><span className={`h-1.5 w-1.5 rounded-full ${badge.dot}`} aria-hidden="true" />{badge.label}</span>
          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold ${risk.className}`}><RiskIcon className="h-3 w-3" />{risk.label}</span>
          <span className="inline-flex items-center gap-1 rounded-full bg-[var(--bg-elevated)] px-2 py-1 text-[11px] font-medium">{track.owner}</span>
          <span className="inline-flex items-center gap-1 rounded-full bg-[var(--bg-elevated)] px-2 py-1 text-[11px] font-medium">对象:{track.agent}</span>
          <span className="inline-flex items-center gap-1 rounded-full bg-[var(--bg-elevated)] px-2 py-1 text-[11px] font-medium">{track.baselineVersion} → {track.currentVersion}</span>
        </div>
      </div>
      <div className="mt-8 flex flex-col sm:flex-row">
        <DrawerSidebar panel={panel} setPanel={setPanel} />
        <div className="flex-1 space-y-5 sm:pl-6">
          {panel === 'basic' && <DrawerPanelBasic track={track} onChange={onChange} />}
          {panel === 'baseline' && <DrawerPanelBaseline track={track} />}
          {panel === 'cases' && <DrawerPanelCases track={track} />}
          {panel === 'history' && <DrawerPanelHistory track={track} />}
        </div>
      </div>
      <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border)] pt-5">
        <button type="button" onClick={onRun} className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--brand)] px-3 py-2 text-xs font-semibold text-white hover:bg-[var(--brand-hover)]">
          <RefreshCw className="h-3.5 w-3.5" />立即重跑回归
        </button>
        <div className="flex items-center gap-2">
          <button type="button" onClick={onClose} className="rounded-lg border border-[var(--border)] px-4 py-2 text-xs font-semibold">关闭</button>
          <button type="button" onClick={onSave} className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--brand)] px-4 py-2 text-xs font-semibold text-white hover:bg-[var(--brand-hover)]">
            <Save className="h-3.5 w-3.5" />保存修改
          </button>
        </div>
      </div>
    </SideDrawer>
  );
}