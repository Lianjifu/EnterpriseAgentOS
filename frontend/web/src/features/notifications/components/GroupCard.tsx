/**
 * 接收人组卡片 — group tab 专用展示。
 * 头部含成员数 / 规则数,主体逐行渲染 GroupMember 列表。
 */
import { UsersRound } from 'lucide-react';
import type { NotificationGroup } from '../schema';
import { KIND_META } from './constants';

export function GroupCard({ group: g }: { group: NotificationGroup }) {
  return (
    <article className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-5">
      <header className="flex flex-wrap items-center gap-2">
        <span className="grid h-9 w-9 place-items-center rounded-lg bg-violet-50 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300">
          <UsersRound className="h-4 w-4" />
        </span>
        <h4 className="text-sm font-semibold">{g.name}</h4>
        <span className="rounded-full bg-[var(--bg-elevated)] px-2 py-0.5 text-[10px] font-medium">{g.members.length} 成员</span>
        <span className="ml-auto rounded-full bg-[var(--bg-elevated)] px-2 py-0.5 text-[10px] font-medium">{g.rules} 规则</span>
      </header>
      <p className="mt-2 text-[11px] text-[var(--text-muted)]">{g.description}</p>
      <ul className="mt-3 space-y-1.5">
        {g.members.map((m, idx) => {
          const meta = KIND_META[m.channel];
          const Icon = meta.icon;
          return (
            <li key={idx} className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] p-2 text-[11px]">
              <span className={`inline-flex h-5 w-5 items-center justify-center rounded-md ${meta.tone}`}><Icon className="h-3 w-3" /></span>
              <span className="font-semibold">{m.name}</span>
              <span className="font-mono text-[var(--text-muted)]">{m.address}</span>
            </li>
          );
        })}
      </ul>
    </article>
  );
}