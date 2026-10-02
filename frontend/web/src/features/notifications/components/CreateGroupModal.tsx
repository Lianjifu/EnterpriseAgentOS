/**
 * 新建接收人组模态 — name + 多成员(姓名 / 渠道类型 / 地址)。
 * 成员行内嵌"添加"按钮,确认时整组提交。
 */
import { useEffect, useState } from 'react';
import { UsersRound } from 'lucide-react';
import { CenterModal } from '@/components/feedback/CenterModal';
import type { ChannelKind, GroupMember, NotificationGroup } from '../schema';
import { KIND_META } from './constants';

interface CreateGroupModalProps {
  open: boolean;
  onClose: () => void;
  onCreate: (g: NotificationGroup) => void;
}

function uid() {
  return `gp-${Math.random().toString(36).slice(2, 8)}`;
}

export function CreateGroupModal({ open, onClose, onCreate }: CreateGroupModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [member, setMember] = useState<GroupMember>({ name: '', channel: 'email', address: '' });
  const [members, setMembers] = useState<GroupMember[]>([]);
  useEffect(() => {
    if (open) { setName(''); setDescription(''); setMembers([]); setMember({ name: '', channel: 'email', address: '' }); }
  }, [open]);
  const canSubmit = name.trim().length > 0;
  const addMember = () => {
    if (member.name.trim().length === 0 || member.address.trim().length === 0) return;
    setMembers((current) => [...current, { name: member.name.trim(), channel: member.channel, address: member.address.trim() }]);
    setMember({ name: '', channel: 'email', address: '' });
  };
  const handleSubmit = () => {
    onCreate({
      id: uid(),
      name: name.trim(),
      description: description.trim() || '由管理员手动创建',
      members,
      rules: 0,
    });
  };
  return (
    <CenterModal
      open={open}
      onClose={onClose}
      ariaLabel="新建接收人组"
      panelClassName="max-w-2xl"
      title={<span className="flex items-center gap-2"><UsersRound className="h-5 w-5 text-[var(--brand)]" />新建接收人组</span>}
      description="组合多个渠道的接收人,统一管理通知订阅"
      footer={
        <>
          <button type="button" onClick={onClose} className="rounded-xl border border-[var(--border)] px-4 py-2 text-xs font-semibold">取消</button>
          <button type="button" onClick={handleSubmit} disabled={!canSubmit} className="rounded-xl bg-[var(--brand)] px-4 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40">创建组</button>
        </>
      }
    >
      <div className="mt-4 space-y-4">
        <div>
          <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">组名称</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="例如:全员运营组" className="mt-1.5 h-10 w-full rounded-xl border border-[var(--border-strong)] bg-[var(--bg-elevated)] px-3 text-sm outline-none focus:border-[var(--brand)]" />
        </div>
        <div>
          <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">说明</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className="mt-1.5 w-full rounded-xl border border-[var(--border-strong)] bg-[var(--bg-elevated)] px-3 py-2 text-sm outline-none focus:border-[var(--brand)]" />
        </div>
        <div>
          <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">添加成员</label>
          <div className="mt-1.5 grid gap-2 sm:grid-cols-[1fr_140px_1fr_auto]">
            <input type="text" value={member.name} onChange={(e) => setMember({ ...member, name: e.target.value })} placeholder="姓名" className="h-10 rounded-xl border border-[var(--border-strong)] bg-[var(--bg-elevated)] px-3 text-sm outline-none focus:border-[var(--brand)]" />
            <select value={member.channel} onChange={(e) => setMember({ ...member, channel: e.target.value as ChannelKind })} className="h-10 rounded-xl border border-[var(--border-strong)] bg-[var(--bg-elevated)] px-3 text-sm outline-none focus:border-[var(--brand)]">
              {(Object.keys(KIND_META) as ChannelKind[]).map((k) => <option key={k} value={k}>{KIND_META[k].label}</option>)}
            </select>
            <input type="text" value={member.address} onChange={(e) => setMember({ ...member, address: e.target.value })} placeholder="地址" className="h-10 rounded-xl border border-[var(--border-strong)] bg-[var(--bg-elevated)] px-3 text-sm outline-none focus:border-[var(--brand)]" />
            <button type="button" onClick={addMember} className="h-10 rounded-xl bg-[var(--brand)] px-3 text-xs font-semibold text-white hover:bg-[var(--brand-hover)]">添加</button>
          </div>
          {members.length > 0 && (
            <ul className="mt-3 space-y-1.5">
              {members.map((m, idx) => (
                <li key={idx} className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface-1)] p-2 text-xs">
                  <span className="font-semibold">{m.name}</span>
                  <span className="text-[var(--text-muted)]">·</span>
                  <span>{KIND_META[m.channel].label}</span>
                  <span className="font-mono">{m.address}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </CenterModal>
  );
}