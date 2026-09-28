/**
 * 知识库详情 — SideDrawer 主体(沿用 AdminOverview 的 AlertDetail 模式)。
 */
import { useState } from 'react';
import { AlertTriangle, CheckCircle2, Clock } from 'lucide-react';
import type { Kb, Doc, Task, EvalCase } from '@/api/admin/knowledge/schema';
import { KB_STATUS_BADGE, TONE_CLASS } from './Primitives';

type PanelId = 'overview' | 'sources' | 'eval';

const PANELS: { id: PanelId; label: string }[] = [
  { id: 'overview', label: '概览' },
  { id: 'sources', label: '文档' },
  { id: 'eval', label: '评测' },
];

export function KbDetail({
  kb,
  docs,
  tasks,
  evalCases,
}: {
  kb: Kb;
  docs: Doc[];
  tasks: Task[];
  evalCases: EvalCase[];
}) {
  const [panel, setPanel] = useState<PanelId>('overview');
  const badge = KB_STATUS_BADGE[kb.status];
  const linkedDocs = docs.filter((d) => d.kbId === kb.id);
  const linkedTasks = tasks.filter((t) => t.kbId === kb.id);
  const linkedEval = evalCases.filter((e) => e.expectedKb === kb.id);
  const hitRate = Math.round(kb.evalHitRate * 100);

  return (
    <div className="mt-4 space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${badge.className}`}>{badge.label}</span>
        <span className="rounded-full bg-[var(--bg-elevated)] px-2 py-0.5 text-[10px] font-medium text-[var(--text-secondary)]">{kb.scope}</span>
        <span className="text-[11px] text-[var(--text-muted)]">{kb.owner} · 最近更新 {kb.updatedAt}</span>
      </div>
      <div>
        <p className="text-sm leading-6 text-[var(--text-secondary)]">{kb.description}</p>
        <div className="mt-3 flex flex-wrap gap-1">
          {kb.tags.map((t) => (
            <span key={t} className="rounded-full bg-[var(--bg-elevated)] px-2 py-0.5 text-[10px] font-medium text-[var(--text-secondary)]">#{t}</span>
          ))}
        </div>
      </div>

      <nav className="flex items-center gap-1 border-b border-[var(--border)]">
        {PANELS.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setPanel(p.id)}
            className={`border-b-2 px-3 py-2 text-xs font-semibold transition ${panel === p.id ? 'border-[var(--brand)] text-[var(--brand)]' : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--brand)]'}`}
          >
            {p.label}
          </button>
        ))}
      </nav>

      {panel === 'overview' && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <KpiMini label="文档数" value={kb.docCount} tone="brand" />
          <KpiMini label="向量数" value={kb.vectorCount.toLocaleString()} tone="info" />
          <KpiMini label="命中率" value={`${hitRate}%`} tone="success" />
          <KpiMini label="关联任务" value={linkedTasks.length} tone="warn" />
        </div>
      )}
      {panel === 'sources' && (
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)]">
          {linkedDocs.length === 0 ? (
            <p className="px-5 py-6 text-center text-xs text-[var(--text-muted)]">暂无关联文档</p>
          ) : (
            <ul className="divide-y divide-[var(--border)]">
              {linkedDocs.map((d) => (
                <li key={d.id} className="flex items-center justify-between px-5 py-3">
                  <span className="truncate text-sm font-semibold">{d.name}</span>
                  <span className="shrink-0 text-[11px] text-[var(--text-muted)]">{d.chunks} 切片 · {d.updatedAt}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      {panel === 'eval' && (
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)]">
          {linkedEval.length === 0 ? (
            <p className="px-5 py-6 text-center text-xs text-[var(--text-muted)]">暂无评测用例</p>
          ) : (
            <ul className="divide-y divide-[var(--border)]">
              {linkedEval.map((e) => (
                <li key={e.id} className="flex items-center justify-between gap-3 px-5 py-3">
                  <span className="truncate text-sm">{e.query}</span>
                  <span className={`shrink-0 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${e.status === 'pass' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300' : 'bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300'}`}>
                    {e.status === 'pass' ? <CheckCircle2 className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
                    {e.status === 'pass' ? '通过' : '未命中'} · {(e.mrr * 100).toFixed(0)}%
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 border-t border-[var(--border)] pt-4 text-[11px] text-[var(--text-muted)]">
        <Clock className="h-3.5 w-3.5" />
        最近更新 {kb.updatedAt}
      </div>
    </div>
  );
}

function KpiMini({ label, value, tone }: { label: string; value: string | number; tone: keyof typeof TONE_CLASS }) {
  return (
    <div className={`flex flex-col gap-1 rounded-xl border border-[var(--border)] px-4 py-3 ${TONE_CLASS[tone]}`}>
      <span className="text-[10px] uppercase tracking-wide opacity-70">{label}</span>
      <span className="text-xl font-semibold tabular-nums">{value}</span>
    </div>
  );
}