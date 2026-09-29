/**
 * 管理侧「数据源详情」独立页面 — 路由 /admin/knowledge/sources/:id
 *
 * 顶部返回按钮回到 /admin/knowledge;
 * 头部展示名称 + 类型 + 状态 + 同步频率;
 * 显示条目数 / 最近同步 两联 stat + 反向引用 KB 列表(经由 doc.sourceId 派生)。
 * wrapper / Stat / NotFound / Skeleton 全部走 components/DetailLayout 共享件。
 */
import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useKnowledgeSources, useKnowledgeBases, useKnowledgeDocs } from '@/api/admin/knowledge/useKnowledge';
import { SOURCE_STATUS_BADGE, SOURCE_TYPE_ICON } from './components/Primitives';
import { SOURCE_TYPE_META } from './components/constants';
import {
  DetailShell, DetailHeader, DetailStatGrid, DetailStat, DetailSection,
  DetailNotFound, DetailSkeleton,
} from './components/DetailLayout';

export default function SourceDetailPage() {
  const { id = '' } = useParams<{ id: string }>();
  const sourcesQuery = useKnowledgeSources();
  const kbsQuery = useKnowledgeBases();
  const docsQuery = useKnowledgeDocs();
  const sources = sourcesQuery.data ?? [];
  const kbs = kbsQuery.data ?? [];
  const docs = docsQuery.data ?? [];

  const source = useMemo(() => sources.find((s) => s.id === id), [sources, id]);

  const linkedKbs = useMemo(() => {
    if (!source) return [] as typeof kbs;
    const linkedDocKbIds = new Set(docs.filter((d) => d.sourceId === source.id).map((d) => d.kbId));
    return kbs.filter((kb) => linkedDocKbIds.has(kb.id));
  }, [source, docs, kbs]);

  const loading = sourcesQuery.isLoading || kbsQuery.isLoading || docsQuery.isLoading;

  if (loading) {
    return (
      <DetailShell>
        <DetailSkeleton rows={3} />
      </DetailShell>
    );
  }

  if (!source) {
    return (
      <DetailShell>
        <DetailNotFound subject="数据源不存在或已被删除" />
      </DetailShell>
    );
  }

  const badge = SOURCE_STATUS_BADGE[source.status];
  const meta = SOURCE_TYPE_META[source.type];
  const Icon = SOURCE_TYPE_ICON[source.type];

  return (
    <DetailShell>
      <DetailHeader
        eyebrow={`数据源 · ${meta.label}`}
        title={source.name}
        icon={Icon}
        badges={[{ label: badge.label, className: badge.className }]}
        subtitle={`同步频率:${source.schedule}`}
      />

      {source.lastError && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
          <p className="font-semibold">⚠ 最近错误</p>
          <p className="mt-1 text-[11px]">{source.lastError}</p>
        </div>
      )}

      <DetailSection title={`关联知识库 (${linkedKbs.length})`}>
        {linkedKbs.length === 0 ? (
          <p className="text-xs text-[var(--text-muted)]">该数据源暂未通过文档绑定到任何知识库</p>
        ) : (
          <>
            <p className="mb-3 text-[11px] text-[var(--text-muted)]">
              数据源经由文档(docs.sourceId)绑定到知识库;关联列表按绑定文档数倒序排列。
            </p>
            <ul className="divide-y divide-[var(--border)]">
              {linkedKbs.map((kb) => {
                const linkedDocCount = docs.filter((d) => d.sourceId === source.id && d.kbId === kb.id).length;
                return (
                  <li key={kb.id}>
                    <Link to={`/admin/knowledge/kbs/${kb.id}`} className="flex items-center justify-between py-2 text-sm font-medium hover:text-[var(--brand)]">
                      <span>{kb.name}</span>
                      <span className="text-[11px] text-[var(--text-muted)]">{linkedDocCount} 个文档 · {kb.docCount.toLocaleString()} 总文档</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </DetailSection>

      <DetailStatGrid columns={2}>
        <DetailStat label="条目数" value={source.itemCount.toLocaleString()} />
        <DetailStat label="最近同步" value={source.lastSync} />
      </DetailStatGrid>

      <p className="text-center text-xs text-[var(--text-muted)]">本页为前端演示数据,生产环境将接入 EOS 知识中台。</p>
    </DetailShell>
  );
}