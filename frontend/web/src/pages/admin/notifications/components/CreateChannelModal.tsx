/**
 * 新建渠道模态 — name / kind / target / description 四字段。
 * kind 切换时 config / template 自动适配 default。
 */
import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { CenterModal } from '@/components/feedback/CenterModal';
import type { ChannelKind, NotificationChannel } from '@/api/admin/notifications/schema';
import { KIND_META } from './constants';

interface CreateChannelModalProps {
  open: boolean;
  onClose: () => void;
  onCreate: (c: NotificationChannel) => void;
  defaultKind?: ChannelKind;
}

function defaultConfig(kind: ChannelKind): Record<string, string> {
  if (kind === 'email') return { host: '', port: '465', from: '' };
  if (kind === 'im') return { workspace: '', channel: '' };
  return { method: 'POST', secret: '' };
}

function defaultTemplate(kind: ChannelKind): string {
  if (kind === 'email') return '{{body}}';
  if (kind === 'im') return '*{title}*\n{{body}}';
  return '{event}';
}

function uid() {
  return `ch-${Math.random().toString(36).slice(2, 8)}`;
}

export function CreateChannelModal({ open, onClose, onCreate, defaultKind = 'email' }: CreateChannelModalProps) {
  const [name, setName] = useState('');
  const [kind, setKind] = useState<ChannelKind>(defaultKind);
  const [target, setTarget] = useState('');
  const [description, setDescription] = useState('');
  useEffect(() => {
    if (open) { setName(''); setKind(defaultKind); setTarget(''); setDescription(''); }
  }, [open, defaultKind]);
  const canSubmit = name.trim().length > 0 && target.trim().length > 0;
  const handleSubmit = () => {
    onCreate({
      id: uid(),
      name: name.trim(),
      kind,
      status: 'draft',
      target: target.trim(),
      description: description.trim() || '由管理员手动创建',
      lastUsed: '从未',
      successRate: 0,
      sentToday: 0,
      config: defaultConfig(kind),
      starred: false,
      scope: [],
      template: defaultTemplate(kind),
    });
  };
  return (
    <CenterModal
      open={open}
      onClose={onClose}
      ariaLabel="新建渠道"
      panelClassName="max-w-2xl"
      title={<span className="flex items-center gap-2"><Plus className="h-5 w-5 text-[var(--brand)]" />新建渠道</span>}
      description="配置一个新的邮件 / IM / Webhook 渠道"
      footer={
        <>
          <button type="button" onClick={onClose} className="rounded-xl border border-[var(--border)] px-4 py-2 text-xs font-semibold">取消</button>
          <button type="button" onClick={handleSubmit} disabled={!canSubmit} className="rounded-xl bg-[var(--brand)] px-4 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40">创建渠道</button>
        </>
      }
    >
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">渠道名称</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="例如:客服告警邮箱" className="mt-1.5 h-10 w-full rounded-xl border border-[var(--border-strong)] bg-[var(--bg-elevated)] px-3 text-sm outline-none focus:border-[var(--brand)]" />
        </div>
        <div>
          <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">渠道类型</label>
          <select value={kind} onChange={(e) => setKind(e.target.value as ChannelKind)} className="mt-1.5 h-10 w-full rounded-xl border border-[var(--border-strong)] bg-[var(--bg-elevated)] px-3 text-sm outline-none focus:border-[var(--brand)]">
            {(Object.keys(KIND_META) as ChannelKind[]).map((k) => <option key={k} value={k}>{KIND_META[k].label}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">目标</label>
          <input type="text" value={target} onChange={(e) => setTarget(e.target.value)} placeholder={kind === 'email' ? '邮箱地址' : kind === 'im' ? '#channel' : 'https://...'} className="mt-1.5 h-10 w-full rounded-xl border border-[var(--border-strong)] bg-[var(--bg-elevated)] px-3 text-sm outline-none focus:border-[var(--brand)]" />
        </div>
        <div className="sm:col-span-2">
          <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">说明</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="简要描述此渠道的用途" className="mt-1.5 w-full rounded-xl border border-[var(--border-strong)] bg-[var(--bg-elevated)] px-3 py-2 text-sm outline-none focus:border-[var(--brand)]" />
        </div>
      </div>
    </CenterModal>
  );
}