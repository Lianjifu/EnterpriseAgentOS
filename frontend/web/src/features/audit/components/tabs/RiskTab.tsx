/**
 * RiskTab — 风险事件列表 + 标记处置/重新打开。
 */
import type { RiskEvent } from '../../schema';
import { CATEGORY_META, SEVERITY_BADGE } from '../constants';

interface RiskTabProps {
  risks: RiskEvent[];
  onToggleResolve: (id: string) => void;
}

export function RiskTab({ risks, onToggleResolve }: RiskTabProps) {
  const unresolved = risks.filter((r) => !r.resolved).length;
  return (
    <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-5">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-rose-700 dark:text-rose-300">风险事件</p>
      <h3 className="mt-2 text-lg font-semibold">待处置事件</h3>
      <p className="mt-1 text-xs text-[var(--text-muted)]">
        {risks.length} 个事件 · {unresolved} 个待处置
      </p>
      <ol className="mt-5 space-y-3">
        {risks.map((r) => {
          const badge = SEVERITY_BADGE[r.severity];
          const cat = CATEGORY_META[r.category];
          const Icon = cat.icon;
          return (
            <li key={r.id} className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-5">
              <header className="flex flex-wrap items-center gap-2">
                <span className={`inline-flex h-7 w-7 items-center justify-center rounded-md ${cat.tone}`}>
                  <Icon className="h-3.5 w-3.5" />
                </span>
                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${badge.className}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${badge.dot}`} aria-hidden="true" />
                  {badge.label}
                </span>
                <h4 className="text-sm font-semibold">{r.title}</h4>
                <span className="font-mono text-[10px] text-[var(--text-muted)]">{r.sessionId}</span>
                <span className={`ml-auto rounded-full px-2 py-0.5 text-[10px] font-semibold ${r.resolved ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                  {r.resolved ? '已处置' : '待处置'}
                </span>
                <button
                  type="button"
                  onClick={() => onToggleResolve(r.id)}
                  className="rounded-lg border border-[var(--border)] px-2 py-1 text-[10px] font-semibold hover:border-rose-500"
                >
                  {r.resolved ? '重新打开' : '标记处置'}
                </button>
              </header>
              <p className="mt-2 text-[11px] text-[var(--text-muted)]">{r.message}</p>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px]">
                <span className="rounded-lg bg-[var(--bg-elevated)] px-2 py-1 font-medium">工具:{r.toolName}</span>
                <span className="rounded-lg bg-[var(--bg-elevated)] px-2 py-1 font-medium">用户:{r.affectedUser}</span>
                <span className="rounded-lg bg-[var(--bg-elevated)] px-2 py-1 font-medium">发生:{r.occurredAt}</span>
                <span className="rounded-lg bg-[var(--bg-elevated)] px-2 py-1 font-mono">规则:{r.ruleId}</span>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}