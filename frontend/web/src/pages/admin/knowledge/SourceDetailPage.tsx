/**
 * 管理侧「数据源详情」独立页面 — 路由 /admin/knowledge/sources/:id
 *
 * 顶部返回按钮回到 /admin/knowledge;
 * 头部展示名称 + 类型 + 状态;
 * 显示条目数 / 最近同步 两联 stat + 反向引用 KB 列表。
 */
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useKnowledgeSources, useKnowledgeBases, useKnowledgeDocs } from '@/api/admin/knowledge/useKnowledge';
import { SOURCE_STATUS_BADGE } from './components/Primitives';
import { SOURCE_TYPE_META } from './components/constants';

function NotFound() {
  return (
    <div className="mx-auto w-full max-w-[1440px] space-y-6 p-5 pb-16 sm:p-8 xl:px-6">
      <Link to="/admin/knowledge" className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--text-muted)] hover:text-[var(--brand)]">
        <ArrowLeft className="h-3.5 w-3.5" />返回知识管理
      </Link>
      <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface-1)] p-8 text-center">
        <p className="text-sm font-semibold">数据源不存在或已被删除</p>
        <p className="mt-1 text-xs text-[var(--text-muted)]">请返回列表重新选择。</p>
      </div>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string | number; tone?: string }) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-4">
      <p className="text-[10px] uppercase tracking-wide text-[var(--text-muted)]">{label}</p>
      <p className={`mt-1 text-lg font-semibold tabular-nums ${tone ?? ''}`}>{value}</p>
    </div>
  );
}

export default function SourceDetailPage() {
  const { id = '' } = useParams<{ id: string }>();
  const sourcesQuery = useKnowledgeSources();
  const kbsQuery = useKnowledgeBases();
  const docsQuery = useKnowledgeDocs();
  const sources = sourcesQuery.data ?? [];
  const kbs = kbsQuery.data ?? [];
  const docs = docsQuery.data ?? [];
  const source = sources.find((s) => s.id === id);

  if (!source) return <NotFound />;

  const badge = SOURCE_STATUS_BADGE[source.status];
  const meta = SOURCE_TYPE_META[source.type];
  // 反向引用:文档→KB(因为源 schema 没有 boundSources 字段,简化展示所有含该 source 类型文档的 KB)
  const linkedKbs = kbs.filter((k) => docs.some((d) => d.kbId === k.id));

  return (
    <div className="mx-auto w-full max-w-[1440px] space-y-6 p-5 pb-16 sm:p-8 xl:px-6">
      <Link to="/admin/knowledge" className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--text-muted)] hover:text-[var(--brand)]">
        <ArrowLeft className="h-3.5 w-3.5" />返回知识管理
      </Link>

      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--brand)]">数据源 · {meta.label}</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">{source.name}</h1>
          <p className="mt-1 text-xs text-[var(--text-muted)]">同步频率:{source.schedule}</p>
        </div>
        <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-semibold ${badge.className}`}>{badge.label}</span>
      </header>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(280px,1fr)]">
        <div className="space-y-5">
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-5">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--brand)]">关联知识库</p>
            {linkedKbs.length === 0 ? (
              <p className="mt-2 text-sm text-[var(--text-muted)]">暂未绑定任何知识库</p>
            ) : (
              <ul className="mt-2 divide-y divide-[var(--border)]">
                {linkedKbs.map((kb) => (
                  <li key={kb.id}>
                    <Link to={`/admin/knowledge/kbs/${kb.id}`} className="flex items-center justify-between py-2 text-sm font-medium hover:text-[var(--brand)]">
                      <span>{kb.name}</span>
                      <span className="text-[11px] text-[var(--text-muted)]">{kb.docCount.toLocaleString()} 文档</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {source.lastError && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
              <p className="font-semibold">⚠ 最近错误</p>
              <p className="mt-1 text-[11px]">{source.lastError}</p>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Stat label="条目数" value={source.itemCount.toLocaleString()} />
          <Stat label="最近同步" value={source.lastSync} />
        </div>
      </section>

      <p className="text-center text-xs text-[var(--text-muted)]">本页为前端演示数据,生产环境将接入 EOS 知识中台。</p>
    </div>
  );
}