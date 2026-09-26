/**
 * Composer 浮层行级 helper — 拆分自 Copilot.tsx 内联 slash / mention popover。
 *
 * 三件套:
 *  - SlashRow  : `/` 命令一行(icon + cmd + desc + category badge)
 *  - MentionRow: `@` 提及一行(icon + title + desc + optional badge / chevron)
 *  - PopoverEmpty: 空态提示段落
 *
 * 完全等价于 Copilot.tsx 原内联 button 结构;不改文案 / 不改样式 / 不改 className。
 * 仅是 JSX 收敛,不引入新视觉、不引入新状态。
 */
import type { ReactNode } from 'react';
import { Badge } from '@de/web-ui';

interface SlashRowProps {
  icon: ReactNode;
  cmd: string;
  desc?: string;
  category?: string;
  onClick: () => void;
}

function SlashRow({ icon, cmd, desc, category, onClick }: SlashRowProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left hover:bg-[var(--bg-hover)]"
    >
      <span className="grid h-7 w-7 place-items-center rounded-md bg-[var(--brand-light)] text-[var(--brand)]">
        {icon}
      </span>
      <div className="flex-1">
        <div className="text-xs font-mono font-semibold">{cmd}</div>
        {desc && <div className="text-[10px] text-[var(--text-muted)]">{desc}</div>}
      </div>
      {category && <Badge tone="neutral" className="text-[9px]">{category}</Badge>}
    </button>
  );
}

interface MentionRowProps {
  icon: ReactNode;
  title: string;
  desc?: string;
  badge?: { label: string; tone?: 'warn' | 'neutral' };
  showChevron?: boolean;
  truncate?: boolean;
  monospace?: boolean;
  onClick: () => void;
}

function MentionRow({ icon, title, desc, badge, showChevron, truncate, monospace, onClick }: MentionRowProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left hover:bg-[var(--bg-hover)]"
    >
      <span className="grid h-7 w-7 place-items-center rounded-md bg-[var(--info-bg)] text-[var(--info)]">
        {icon}
      </span>
      <div className="flex-1 min-w-0">
        <div className={`${monospace ? 'text-xs font-mono font-semibold' : 'text-xs font-semibold'} ${truncate ? 'truncate' : ''}`}>{title}</div>
        {desc && <div className={`text-[10px] text-[var(--text-muted)] ${truncate ? 'truncate' : ''}`}>{desc}</div>}
      </div>
      {badge && <Badge tone={badge.tone ?? 'neutral'} className="text-[9px] shrink-0">{badge.label}</Badge>}
      {showChevron && (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5 text-[var(--text-muted)]">
          <path d="m9 18 6-6-6-6" />
        </svg>
      )}
    </button>
  );
}

interface PopoverEmptyProps {
  children: ReactNode;
  leading?: boolean;
}

function PopoverEmpty({ children, leading }: PopoverEmptyProps) {
  return (
    <p className={`px-3 py-3 text-[11px] ${leading ? 'leading-5' : ''} text-[var(--text-muted)]`}>
      {children}
    </p>
  );
}

export { SlashRow, MentionRow, PopoverEmpty };
export type { SlashRowProps, MentionRowProps, PopoverEmptyProps };