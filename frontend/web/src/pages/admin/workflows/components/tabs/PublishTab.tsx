/**
 * PublishTab — 已发布工作流 + 待发布列表(发布与版本 tab)。
 */
import { Brain, History, Rocket, Sparkles } from 'lucide-react';
import type { Flow } from '@/api/admin/workflows/schema';

interface PublishTabProps {
  flows: Flow[];
  onVersions: (f: Flow) => void;
  onPublish: (f: Flow) => void;
}

export function PublishTab({ flows, onVersions, onPublish }: PublishTabProps) {
  const published = flows.filter((f) => f.status === 'published');
  const drafts = flows.filter((f) => f.status === 'draft' || f.status === 'graying');
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
      <section className="space-y-3">
        <h3 className="flex items-center gap-2 text-base font-semibold"><Rocket className="h-4 w-4 text-amber-600" />已发布为工具的工作流</h3>
        <p className="text-xs text-[var(--text-muted)]">这些工作流已发布为可被智能体调用的工具</p>
        {published.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[var(--border-strong)] bg-[var(--surface-1)] p-10 text-center">
            <Rocket className="mx-auto h-6 w-6 text-[var(--text-muted)]" />
            <p className="mt-3 text-sm font-semibold">还没有已发布的工作流</p>
          </div>
        ) : (
          <div className="space-y-3">
            {published.map((f) => (
              <article key={f.id} className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">{f.name}</p>
                    <p className="mt-1 text-xs text-[var(--text-muted)]">{f.description}</p>
                    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-[var(--text-muted)]">
                      <span>工具 ID:{f.id.replace(/^wf-/, '')}</span>
                      <span>本月调用 {f.callCount} 次</span>
                      <span>更新 {f.updatedAt}</span>
                    </div>
                    {f.boundAgents.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {f.boundAgents.map((a) => (
                          <span key={a} className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
                            <Brain className="h-3 w-3" />{a}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <button type="button" onClick={() => onVersions(f)} className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface-1)] px-3 py-2 text-xs font-semibold text-[var(--text-secondary)] hover:border-[var(--brand)] hover:text-[var(--brand)]">
                    <History className="h-3.5 w-3.5" />版本历史
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
      <aside className="space-y-3">
        <h3 className="flex items-center gap-2 text-base font-semibold"><Sparkles className="h-4 w-4 text-amber-600" />待发布</h3>
        <p className="text-xs text-[var(--text-muted)]">草稿 / 灰度中的工作流可以发布为工具</p>
        {drafts.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[var(--border-strong)] bg-[var(--surface-1)] p-8 text-center">
            <p className="text-xs text-[var(--text-muted)]">暂无待发布工作流</p>
          </div>
        ) : (
          <div className="space-y-2">
            {drafts.map((f) => (
              <div key={f.id} className="flex items-center justify-between gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] px-3 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold">{f.name}</p>
                  <p className="text-[10px] text-[var(--text-muted)]">{f.versions[0]?.v}</p>
                </div>
                <button type="button" onClick={() => onPublish(f)} className="inline-flex items-center gap-1 rounded-lg bg-[var(--brand)] px-2.5 py-1.5 text-[11px] font-semibold text-white hover:bg-[var(--brand-hover)]">
                  <Rocket className="h-3 w-3" />发布
                </button>
              </div>
            ))}
          </div>
        )}
      </aside>
    </div>
  );
}