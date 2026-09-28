/**
 * PermissionTab — 角色权限清单卡片。
 */
import { UserCog, UserPlus } from 'lucide-react';
import type { PermissionScope } from '@/api/admin/audit/schema';

interface PermissionTabProps {
  scopes: PermissionScope[];
  onReReview: (role: string) => void;
}

export function PermissionTab({ scopes, onReReview }: PermissionTabProps) {
  return (
    <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-5">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-rose-700 dark:text-rose-300">权限审查</p>
      <h3 className="mt-2 text-lg font-semibold">角色权限清单</h3>
      <p className="mt-1 text-xs text-[var(--text-muted)]">
        {scopes.length} 个角色 · 平均持有 3 个作用域
      </p>
      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {scopes.map((p) => (
          <article key={p.id} className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-5">
            <header className="flex items-center gap-2">
              <span className="grid h-9 w-9 place-items-center rounded-lg bg-violet-50 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300">
                <UserCog className="h-4 w-4" />
              </span>
              <div>
                <p className="text-sm font-semibold">{p.role}</p>
                <p className="text-[10px] text-[var(--text-muted)]">{p.userCount} 位用户 · 最近审查 {p.lastReview}</p>
              </div>
              <button
                type="button"
                onClick={() => onReReview(p.role)}
                className="ml-auto inline-flex items-center gap-1 rounded-lg border border-[var(--border)] px-2 py-1 text-[10px] font-semibold hover:border-rose-500"
              >
                <UserPlus className="h-3 w-3" />
                复审
              </button>
            </header>
            <ul className="mt-3 flex flex-wrap gap-1.5">
              {p.scopes.map((s) => (
                <li key={s} className="rounded-full bg-[var(--bg-elevated)] px-2 py-0.5 font-mono text-[10px] font-medium">
                  {s}
                </li>
              ))}
            </ul>
            <p className="mt-3 text-[10px] text-[var(--text-muted)]">审查人:{p.reviewer}</p>
          </article>
        ))}
      </div>
    </section>
  );
}