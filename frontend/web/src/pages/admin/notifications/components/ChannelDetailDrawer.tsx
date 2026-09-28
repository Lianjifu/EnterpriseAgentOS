/**
 * 渠道详情抽屉 — 3 个子面板:
 *   1) 基本信息 (name / target / status / description / config)
 *   2) 消息模板 (template + 渲染预览)
 *   3) 投递记录 (events.filter(e.channelId === channel.id))
 */
import { useEffect, useState } from 'react';
import { Megaphone, Save, Wand2 } from 'lucide-react';
import { SideDrawer } from '@/components/feedback/SideDrawer';
import type { ChannelStatus, NotificationChannel, DeliveryEvent } from '@/api/admin/notifications/schema';
import {
  DELIVERY_BADGE, DRAWER_NAV_ITEMS, KIND_META, STATUS_BADGE,
  type DrawerPanel, type ChannelDetailDrawerProps,
} from './constants';

function DrawerPanelDetail({ channel, onChange }: { channel: NotificationChannel; onChange: (patch: Partial<NotificationChannel>) => void }) {
  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">渠道名称</label>
          <input
            type="text"
            value={channel.name}
            onChange={(e) => onChange({ name: e.target.value })}
            className="mt-1.5 h-10 w-full rounded-xl border border-[var(--border-strong)] bg-[var(--bg-elevated)] px-3 text-sm outline-none focus:border-[var(--brand)]"
          />
        </div>
        <div>
          <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">目标</label>
          <input
            type="text"
            value={channel.target}
            onChange={(e) => onChange({ target: e.target.value })}
            className="mt-1.5 h-10 w-full rounded-xl border border-[var(--border-strong)] bg-[var(--bg-elevated)] px-3 text-sm outline-none focus:border-[var(--brand)]"
          />
        </div>
        <div>
          <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">状态</label>
          <select
            value={channel.status}
            onChange={(e) => onChange({ status: e.target.value as ChannelStatus })}
            className="mt-1.5 h-10 w-full rounded-xl border border-[var(--border-strong)] bg-[var(--bg-elevated)] px-3 text-sm outline-none focus:border-[var(--brand)]"
          >
            {(Object.keys(STATUS_BADGE) as ChannelStatus[]).map((s) => <option key={s} value={s}>{STATUS_BADGE[s].label}</option>)}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">说明</label>
          <textarea
            value={channel.description}
            onChange={(e) => onChange({ description: e.target.value })}
            rows={3}
            className="mt-1.5 w-full rounded-xl border border-[var(--border-strong)] bg-[var(--bg-elevated)] px-3 py-2 text-sm outline-none focus:border-[var(--brand)]"
          />
        </div>
      </div>
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">配置项</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {Object.entries(channel.config).map(([key, value]) => (
            <div key={key}>
              <label className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">{key}</label>
              <input
                type="text"
                value={value}
                onChange={(e) => onChange({ config: { ...channel.config, [key]: e.target.value } })}
                className="mt-1 h-9 w-full rounded-lg border border-[var(--border-strong)] bg-[var(--surface-1)] px-2.5 text-xs font-mono outline-none focus:border-[var(--brand)]"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function DrawerPanelTemplate({ channel, onChange }: { channel: NotificationChannel; onChange: (patch: Partial<NotificationChannel>) => void }) {
  return (
    <div className="space-y-4">
      <div>
        <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">消息模板</label>
        <textarea
          value={channel.template}
          onChange={(e) => onChange({ template: e.target.value })}
          rows={6}
          className="mt-1.5 w-full rounded-xl border border-[var(--border-strong)] bg-[var(--bg-elevated)] px-3 py-2 font-mono text-xs leading-6 outline-none focus:border-[var(--brand)]"
        />
        <p className="mt-1 text-[10px] text-[var(--text-muted)]">支持占位符:{`{title}`} / {`{body}`} / {`{date}`} / {`{summary}`} / {`{event}`} / {`{payload}`}</p>
      </div>
      <div className="rounded-2xl border border-[var(--brand)] bg-[var(--brand-light)] p-4">
        <div className="flex items-center gap-2">
          <Wand2 className="h-4 w-4 text-[var(--brand)]" />
          <span className="text-xs font-semibold text-[var(--brand)]">渲染预览</span>
        </div>
        <pre className="mt-2 whitespace-pre-wrap rounded-lg bg-[var(--surface-1)] p-3 font-mono text-[11px] leading-6 text-[var(--text-secondary)]">
{channel.template
  .replace('{title}', '客户成功部使用率超 80%')
  .replace('{body}', '请前往额度管理查看详情')
  .replace('{date}', '2026-09-28')
  .replace('{summary}', '运营数据摘要')
  .replace('{event}', 'agent.session.completed')
  .replace('{payload}', '{ "session_id": "..." }')}
        </pre>
      </div>
    </div>
  );
}

function DrawerPanelAudit({ channel, events }: { channel: NotificationChannel; events: DeliveryEvent[] }) {
  const list = events.filter((e) => e.channelId === channel.id);
  if (list.length === 0) {
    return <p className="text-xs text-[var(--text-muted)]">暂无投递记录。</p>;
  }
  return (
    <ul className="space-y-2">
      {list.map((e) => {
        const badge = DELIVERY_BADGE[e.status];
        return (
          <li key={e.id} className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${badge.className}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${badge.dot}`} aria-hidden="true" />{badge.label}
              </span>
              <span className="text-xs font-semibold">{e.subject}</span>
              <span className="ml-auto text-[11px] text-[var(--text-muted)]">{e.deliveredAt}</span>
            </div>
            <p className="mt-1 text-[11px] text-[var(--text-muted)]">收件人:{e.recipient}</p>
            {e.error && <p className="mt-1 text-[11px] text-rose-600">错误:{e.error}</p>}
          </li>
        );
      })}
    </ul>
  );
}

function DrawerSidebar({ panel, setPanel }: { panel: DrawerPanel; setPanel: (p: DrawerPanel) => void }) {
  return (
    <nav aria-label="渠道工作区" className="hidden w-[200px] shrink-0 flex-col gap-1 border-r border-[var(--border)] bg-[var(--bg-elevated)] p-4 sm:flex">
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
  );
}

export function ChannelDetailDrawer({ channel, events, onClose, onChange, onSave }: ChannelDetailDrawerProps) {
  const [panel, setPanel] = useState<DrawerPanel>('detail');
  useEffect(() => { setPanel('detail'); }, [channel?.id]);
  if (!channel) return null;
  const meta = KIND_META[channel.kind];
  const Icon = meta.icon;
  const badge = STATUS_BADGE[channel.status];
  return (
    <SideDrawer
      open={channel !== null}
      onClose={onClose}
      ariaLabel={`渠道 ${channel.id}`}
      panelClassName="max-w-3xl"
      closeLabel="关闭渠道详情"
      eyebrow={
        <div className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-[var(--brand-light)] text-[var(--brand)]"><Megaphone className="h-4 w-4" /></span>
          <p className="text-[11px] font-semibold tracking-[0.2em] text-[var(--brand)]">渠道管理</p>
        </div>
      }
    >
      <div className="mt-8">
        <h3 className="text-2xl font-semibold">{channel.name}</h3>
        <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">{channel.description}</p>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-semibold ${meta.tone}`}>
            <Icon className="h-3 w-3" />{meta.label}
          </span>
          <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[11px] font-semibold ${badge.className}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${badge.dot}`} aria-hidden="true" />{badge.label}
          </span>
          <span className="rounded-full bg-[var(--bg-elevated)] px-2 py-1 text-[11px] font-medium">{channel.target}</span>
        </div>
      </div>
      <div className="mt-8 flex flex-col sm:flex-row">
        <DrawerSidebar panel={panel} setPanel={setPanel} />
        <div className="flex-1 space-y-5 sm:pl-6">
          {panel === 'detail' && <DrawerPanelDetail channel={channel} onChange={onChange} />}
          {panel === 'template' && <DrawerPanelTemplate channel={channel} onChange={onChange} />}
          {panel === 'audit' && <DrawerPanelAudit channel={channel} events={events} />}
        </div>
      </div>
      <div className="mt-8 flex items-center justify-end gap-2 border-t border-[var(--border)] pt-5">
        <button type="button" onClick={onClose} className="rounded-lg border border-[var(--border)] px-4 py-2 text-xs font-semibold">关闭</button>
        <button type="button" onClick={onSave} className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--brand)] px-4 py-2 text-xs font-semibold text-white hover:bg-[var(--brand-hover)]">
          <Save className="h-3.5 w-3.5" />保存修改
        </button>
      </div>
    </SideDrawer>
  );
}