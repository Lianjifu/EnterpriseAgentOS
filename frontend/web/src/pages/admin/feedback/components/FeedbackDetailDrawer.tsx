/**
 * AdminFeedback — 反馈详情侧拉。
 * 3 个 panel: 反馈详情 / 回复处理 / 处理历史。
 */
import { BookOpen, Clock, MessageSquare, Save, Send, Smile, ThumbsDown, ThumbsUp, User, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { DrawerPanel, Feedback, FeedbackPriority, FeedbackStatus } from '@/api/admin/feedback/schema';
import { SideDrawer } from '@/components/feedback/SideDrawer';
import { DRAWER_NAV_ITEMS, PRIORITY_BADGE, SENTIMENT_META, STATUS_BADGE, TYPE_LABEL } from './constants';
import { StarRow } from './Primitives';

const navIconMap: Record<string, typeof BookOpen> = {
  BookOpen, Send, Clock,
};
const sentimentIconMap: Record<string, typeof ThumbsUp> = {
  ThumbsUp, ThumbsDown, Smile,
};

interface DrawerPanelDetailProps {
  fb: Feedback;
  onChange: (patch: Partial<Feedback>) => void;
}

function DrawerPanelDetail({ fb, onChange }: DrawerPanelDetailProps) {
  const update = (patch: Partial<Feedback>) => onChange(patch);
  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-5">
        <div className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-[var(--brand-light)] text-[var(--brand)]">
            <User className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-semibold">{fb.user}</p>
            <p className="text-[11px] text-[var(--text-muted)]">{fb.session} · {fb.submittedAt}</p>
          </div>
          <div className="ml-auto"><StarRow rating={fb.rating} /></div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2 text-[11px]">
          <span className="rounded-full bg-[var(--surface-1)] px-2 py-0.5 font-medium">智能体:{fb.agent}</span>
          <span className="rounded-full bg-[var(--surface-1)] px-2 py-0.5 font-medium">主题:{fb.topic}</span>
          <span className="rounded-full bg-[var(--surface-1)] px-2 py-0.5 font-medium">类型:{TYPE_LABEL[fb.type]}</span>
        </div>
      </div>
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">用户反馈原文</p>
        <p className="mt-2 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-4 text-sm leading-6 text-[var(--text)]">{fb.comment}</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">状态</label>
          <select value={fb.status} onChange={(e) => update({ status: e.target.value as FeedbackStatus })} className="mt-1.5 h-10 w-full rounded-xl border border-[var(--border-strong)] bg-[var(--bg-elevated)] px-3 text-sm outline-none focus:border-[var(--brand)]">
            {(Object.keys(STATUS_BADGE) as FeedbackStatus[]).map((s) => <option key={s} value={s}>{STATUS_BADGE[s].label}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">优先级</label>
          <select value={fb.priority} onChange={(e) => update({ priority: e.target.value as FeedbackPriority })} className="mt-1.5 h-10 w-full rounded-xl border border-[var(--border-strong)] bg-[var(--bg-elevated)] px-3 text-sm outline-none focus:border-[var(--brand)]">
            {(Object.keys(PRIORITY_BADGE) as FeedbackPriority[]).map((p) => <option key={p} value={p}>{PRIORITY_BADGE[p].label}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">主题</label>
          <input type="text" value={fb.topic} onChange={(e) => update({ topic: e.target.value })} className="mt-1.5 h-10 w-full rounded-xl border border-[var(--border-strong)] bg-[var(--bg-elevated)] px-3 text-sm outline-none focus:border-[var(--brand)]" />
        </div>
      </div>
      <div>
        <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">标签</label>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {fb.tags.map((t) => (
            <span key={t} className="inline-flex items-center gap-1 rounded-full bg-[var(--bg-elevated)] px-2 py-0.5 text-[10px] font-medium">
              {t}
              <button type="button" aria-label={`移除标签 ${t}`} onClick={() => update({ tags: fb.tags.filter((x) => x !== t) })} className="grid h-3 w-3 place-items-center rounded-full text-[var(--text-muted)] hover:text-rose-600">
                <X className="h-2.5 w-2.5" />
              </button>
            </span>
          ))}
          <input type="text" placeholder="添加标签后回车" onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); const v = (e.currentTarget.value || '').trim(); if (v && !fb.tags.includes(v)) update({ tags: [...fb.tags, v] }); e.currentTarget.value = ''; } }} className="h-7 w-32 rounded-lg border border-[var(--border)] bg-[var(--surface-1)] px-2 text-[10px] outline-none focus:border-[var(--brand)]" />
        </div>
      </div>
    </div>
  );
}

function DrawerPanelReply({ fb }: { fb: Feedback }) {
  const [reply, setReply] = useState('');
  const [tone, setTone] = useState<'empathy' | 'thanks' | 'escalate'>('empathy');
  return (
    <div className="space-y-4">
      <div>
        <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">回复模板</label>
        <div className="mt-2 flex flex-wrap gap-2">
          {([
            { id: 'empathy', label: '致歉 + 跟进', text: '抱歉给您带来困扰,我们会立即跟进,预计在 24 小时内给出进一步说明。' },
            { id: 'thanks', label: '感谢 + 鼓励', text: '感谢您的反馈,我们会继续保持,并把您的建议带到下一次迭代。' },
            { id: 'escalate', label: '升级处理', text: '已升级到对应团队,会尽快安排专员与您联系。' },
          ] as const).map((tpl) => (
            <button key={tpl.id} type="button" onClick={() => { setTone(tpl.id); setReply(tpl.text); }} aria-pressed={tone === tpl.id} className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[11px] font-semibold transition ${tone === tpl.id ? 'border-[var(--brand)] bg-[var(--brand-light)] text-[var(--brand)]' : 'border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--brand)]'}`}>
              {tpl.label}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">回复内容</label>
        <textarea value={reply} onChange={(e) => setReply(e.target.value)} rows={6} placeholder="撰写对用户的回复..." className="mt-1.5 w-full rounded-xl border border-[var(--border-strong)] bg-[var(--bg-elevated)] px-3 py-2 text-sm outline-none focus:border-[var(--brand)]" />
      </div>
      <div className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] px-4 py-3">
        <div>
          <p className="text-xs font-semibold">同步通知 {fb.agent} 团队</p>
          <p className="mt-0.5 text-[11px] text-[var(--text-muted)]">发送回复时同步抄送相关团队,便于改进产品。</p>
        </div>
        <button type="button" className="relative inline-flex h-6 w-11 items-center rounded-full bg-[var(--brand)] transition" aria-pressed="true">
          <span className="inline-block h-5 w-5 transform translate-x-5 rounded-full bg-white shadow transition" />
        </button>
      </div>
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-[var(--brand)] bg-[var(--brand-light)] px-4 py-3">
        <Send className="h-4 w-4 text-[var(--brand)]" />
        <span className="text-xs font-semibold text-[var(--brand)]">本地预览模式:不会真正发送,仅模拟回复流程。</span>
      </div>
    </div>
  );
}

function DrawerPanelHistory({ fb }: { fb: Feedback }) {
  const events = [
    { time: fb.submittedAt, actor: fb.user, action: '提交反馈' },
    { time: '分诊后 12 分钟', actor: '客服小张', action: '标记分诊完成' },
    { time: '今天 11:30', actor: '安全团队', action: '认领紧急工单' },
  ];
  return (
    <ul className="space-y-2">
      {events.map((e, idx) => (
        <li key={idx} className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-3">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-[var(--bg-elevated)] text-[var(--text-muted)]">
            <Clock className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold">{e.action}</p>
            <p className="mt-0.5 text-[11px] text-[var(--text-muted)]">{e.time} · 由 {e.actor}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}

interface DrawerSidebarProps {
  panel: DrawerPanel;
  setPanel: (p: DrawerPanel) => void;
}

function DrawerSidebar({ panel, setPanel }: DrawerSidebarProps) {
  return (
    <nav aria-label="反馈工作区" className="hidden w-[200px] shrink-0 flex-col gap-1 border-r border-[var(--border)] bg-[var(--bg-elevated)] p-4 sm:flex">
      <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">工作区</p>
      {DRAWER_NAV_ITEMS.map((item) => {
        const Icon = navIconMap[item.icon] ?? BookOpen;
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

interface FeedbackDetailDrawerProps {
  fb: Feedback | null;
  onClose: () => void;
  onChange: (patch: Partial<Feedback>) => void;
  onSave: () => void;
  onCreateTicket: () => void;
}

export function FeedbackDetailDrawer({ fb, onClose, onChange, onSave, onCreateTicket }: FeedbackDetailDrawerProps) {
  const [panel, setPanel] = useState<DrawerPanel>('detail');
  useEffect(() => { setPanel('detail'); }, [fb?.id]);
  if (!fb) return null;
  const sen = SENTIMENT_META[fb.sentiment];
  const SenIcon = sentimentIconMap[sen.icon] ?? Smile;
  const badge = STATUS_BADGE[fb.status];
  return (
    <SideDrawer open={fb !== null} onClose={onClose} ariaLabel={`反馈 ${fb.id}`} panelClassName="max-w-3xl" closeLabel="关闭反馈详情" eyebrow={<div className="flex items-center gap-2"><span className="grid h-9 w-9 place-items-center rounded-lg bg-[var(--brand-light)] text-[var(--brand)]"><MessageSquare className="h-4 w-4" /></span><p className="text-[11px] font-semibold tracking-[0.2em] text-[var(--brand)]">用户反馈</p></div>}>
      <div className="mt-8">
        <h3 className="text-2xl font-semibold">{fb.topic}</h3>
        <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">{fb.comment}</p>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold ${sen.tone}`}><SenIcon className="h-3 w-3" />{sen.label}</span>
          <span className="rounded-full bg-[var(--bg-elevated)] px-2 py-1 text-[11px] font-medium">{TYPE_LABEL[fb.type]}</span>
          <span className="rounded-full bg-[var(--bg-elevated)] px-2 py-1 text-[11px] font-medium">智能体:{fb.agent}</span>
          <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[11px] font-semibold ${badge.className}`}><span className={`h-1.5 w-1.5 rounded-full ${badge.dot}`} aria-hidden="true" />{badge.label}</span>
          <StarRow rating={fb.rating} />
        </div>
      </div>
      <div className="mt-8 flex flex-col sm:flex-row">
        <DrawerSidebar panel={panel} setPanel={setPanel} />
        <div className="flex-1 space-y-5 sm:pl-6">
          {panel === 'detail' && <DrawerPanelDetail fb={fb} onChange={onChange} />}
          {panel === 'reply' && <DrawerPanelReply fb={fb} />}
          {panel === 'history' && <DrawerPanelHistory fb={fb} />}
        </div>
      </div>
      <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border)] pt-5">
        <button type="button" onClick={onCreateTicket} className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--brand)] px-3 py-2 text-xs font-semibold text-white hover:bg-[var(--brand-hover)]">
          <Send className="h-3.5 w-3.5" />为此反馈创建工单
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