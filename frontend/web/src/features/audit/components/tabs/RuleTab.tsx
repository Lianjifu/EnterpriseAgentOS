/**
 * RuleTab — 审计规则库(启用/停用 + 命中次数)。
 */
import { Plus } from 'lucide-react';
import type { AuditRule } from '../../schema';
import { CATEGORY_META, SEVERITY_BADGE } from '../constants';

interface RuleTabProps {
  rules: AuditRule[];
  onToggleRule: (id: string) => void;
  onCreateRule: () => void;
}

export function RuleTab({ rules, onToggleRule, onCreateRule }: RuleTabProps) {
  const enabled = rules.filter((r) => r.enabled).length;
  return (
    <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-rose-700 dark:text-rose-300">审计规则</p>
          <h3 className="mt-2 text-lg font-semibold">审计规则库</h3>
          <p className="mt-1 text-xs text-[var(--text-muted)]">{rules.length} 条规则 · {enabled} 条启用</p>
        </div>
        <button
          type="button"
          onClick={onCreateRule}
          className="inline-flex items-center gap-1.5 rounded-lg border border-rose-500 bg-rose-50 px-3 py-2 text-[11px] font-semibold text-rose-700 dark:bg-rose-500/15 dark:text-rose-300"
        >
          <Plus className="h-3.5 w-3.5" />
          新建规则
        </button>
      </div>
      <ol className="mt-5 space-y-3">
        {rules.map((r) => {
          const sev = SEVERITY_BADGE[r.severity];
          const cat = CATEGORY_META[r.category];
          const Icon = cat.icon;
          return (
            <li key={r.id} className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-5">
              <header className="flex flex-wrap items-center gap-2">
                <span className={`inline-flex h-7 w-7 items-center justify-center rounded-md ${cat.tone}`}>
                  <Icon className="h-3.5 w-3.5" />
                </span>
                <p className="text-sm font-semibold">{r.name}</p>
                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${sev.className}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${sev.dot}`} aria-hidden="true" />
                  {sev.label}
                </span>
                <span className="rounded-full bg-[var(--bg-elevated)] px-2 py-0.5 text-[10px] font-semibold">{r.action.toUpperCase()}</span>
                <span
                  className={`ml-auto inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${r.enabled ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${r.enabled ? 'bg-emerald-500' : 'bg-slate-400'}`} aria-hidden="true" />
                  {r.enabled ? '启用' : '已停用'}
                </span>
                <button
                  type="button"
                  onClick={() => onToggleRule(r.id)}
                  className="rounded-lg border border-[var(--border)] px-2 py-1 text-[10px] font-semibold hover:border-rose-500"
                >
                  {r.enabled ? '停用' : '启用'}
                </button>
              </header>
              <p className="mt-2 font-mono text-[11px] text-[var(--text-muted)]">
                if {r.condition} → {r.action}
              </p>
              <p className="mt-1.5 text-[11px] text-[var(--text-muted)]">{r.description}</p>
              <p className="mt-3 text-[10px] text-[var(--text-muted)]">命中 {r.hitCount} 次</p>
            </li>
          );
        })}
      </ol>
    </section>
  );
}