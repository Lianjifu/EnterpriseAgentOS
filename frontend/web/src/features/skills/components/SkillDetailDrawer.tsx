import { useEffect, useState } from 'react';
import { Download, Save } from 'lucide-react';
import { SideDrawer } from '@/components/feedback/SideDrawer';
import type { Skill } from '../schema';
import { DRAWER_NAV_ITEMS, DrawerPanel, RISK_BADGE, STATUS_BADGE, TYPE_META } from './constants';
import {
  DrawerPanelAgents, DrawerPanelAudit, DrawerPanelBasic, DrawerPanelMonitor,
  DrawerPanelPermission, DrawerPanelSchema, DrawerPanelVersions,
} from './DrawerPanels';

interface SkillDetailDrawerProps {
  skill: Skill | null;
  onClose: () => void;
  onChange: (patch: Partial<Skill>) => void;
  onSave: () => void;
  onExport: () => void;
}

export function SkillDetailDrawer({ skill, onClose, onChange, onSave, onExport }: SkillDetailDrawerProps) {
  const [panel, setPanel] = useState<DrawerPanel>('basic');
  useEffect(() => {
    setPanel('basic');
  }, [skill?.id]);
  if (!skill) return null;
  const meta = TYPE_META[skill.type];
  const Icon = meta.icon;
  return (
    <SideDrawer
      open={skill !== null}
      onClose={onClose}
      ariaLabel={`${skill.name}详情`}
      panelClassName="max-w-3xl"
      eyebrow={
        <div className="flex items-center gap-2">
          <span className={`grid h-9 w-9 place-items-center rounded-lg ${meta.tone}`}>
            <Icon className="h-4 w-4" />
          </span>
          <p className="text-[11px] font-semibold tracking-[0.2em] text-[var(--brand)]">{skill.type} · {skill.version}</p>
        </div>
      }
      closeLabel="关闭技能详情"
    >
      <div className="mt-8">
        <h3 className="text-2xl font-semibold">{skill.name}</h3>
        <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">{skill.description}</p>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[11px] font-semibold ${STATUS_BADGE[skill.status].className}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${STATUS_BADGE[skill.status].dot}`} aria-hidden="true" />
            {STATUS_BADGE[skill.status].label}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-[var(--bg-elevated)] px-2 py-1 text-[11px] font-medium">{skill.owner}</span>
          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold ${RISK_BADGE[skill.risk].className}`}>
            {RISK_BADGE[skill.risk].label}
          </span>
        </div>
      </div>

      <div className="mt-8 flex flex-col sm:flex-row">
        <nav aria-label="技能工作区导航" className="hidden w-[200px] shrink-0 flex-col gap-1 border-r border-[var(--border)] bg-[var(--bg-elevated)] p-4 sm:flex">
          <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">工作区</p>
          {DRAWER_NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = panel === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setPanel(item.id)}
                aria-pressed={active}
                className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs font-semibold transition ${active ? 'bg-[var(--brand-light)] text-[var(--brand)]' : 'text-[var(--text-secondary)] hover:bg-[var(--surface-1)]'}`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </button>
            );
          })}
        </nav>
        <div className="flex-1 space-y-5 sm:pl-6">
          {panel === 'basic' && <DrawerPanelBasic draft={skill} onChange={onChange} />}
          {panel === 'schema' && <DrawerPanelSchema draft={skill} onChange={onChange} />}
          {panel === 'permission' && <DrawerPanelPermission draft={skill} onChange={onChange} />}
          {panel === 'versions' && <DrawerPanelVersions draft={skill} />}
          {panel === 'monitor' && <DrawerPanelMonitor draft={skill} />}
          {panel === 'agents' && <DrawerPanelAgents draft={skill} />}
          {panel === 'audit' && <DrawerPanelAudit draft={skill} />}
        </div>
      </div>

      <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border)] pt-5">
        <div className="flex items-center gap-2">
          <button type="button" onClick={onExport} className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-3 py-2 text-xs font-semibold hover:border-[var(--brand)] hover:text-[var(--brand)]">
            <Download className="h-3.5 w-3.5" />导出
          </button>
        </div>
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