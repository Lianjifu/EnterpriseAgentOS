/**
 * LoginDemoChips — 一键体验角色登录(开发环境)
 */
import type { ReactNode } from 'react';

export interface LoginDemoRole {
  email: string;
  label: string;
  sub: string;
  Icon: (props: { className?: string }) => ReactNode;
}

interface LoginDemoChipsProps {
  title: string;
  roles: LoginDemoRole[];
  onChoose: (email: string) => void;
}

export function LoginDemoChips({ title, roles, onChoose }: LoginDemoChipsProps) {
  return (
    <div className="rounded-md border border-dashed border-[var(--border)] bg-[var(--bg-elevated)]/60 px-3 py-3.5">
      <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">
        {title}
      </p>
      <div className="grid grid-cols-2 gap-2.5">
        {roles.map((r) => (
          <button
            key={r.email}
            type="button"
            onClick={() => onChoose(r.email)}
            title={`${r.label} · ${r.sub}`}
            className="login-demo-chip group flex items-center gap-2 rounded-md border
                       border-[var(--border)] bg-[var(--surface-1)] px-2.5 py-2 text-left
                       transition-all hover:-translate-y-0.5 hover:border-[var(--brand)]
                       hover:bg-[var(--brand-light)]
                       focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)]/30"
          >
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-[var(--brand-light)] text-[var(--brand)] transition-colors group-hover:bg-white">
              <r.Icon className="h-3.5 w-3.5" />
            </span>
            <span className="min-w-0 flex-1 leading-tight">
              <div className="text-[12px] font-medium text-[var(--text)] whitespace-nowrap overflow-hidden text-ellipsis">
                {r.label}
              </div>
              <div className="mt-0.5 text-[11px] text-[var(--text-muted)] whitespace-nowrap overflow-hidden text-ellipsis">
                {r.sub}
              </div>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}