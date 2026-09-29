/**
 * 管理侧「文档详情」独立页面 — 路由 /admin/knowledge/docs/:id
 *
 * 顶部返回按钮回到 /admin/knowledge;
 * 头部展示文档名 + 类型 + 状态;
 * 显示大小 / 切片 / 引用 三联 stat + 归属 KB / 来源数据源 链接。
 * wrapper / Stat / NotFound / Skeleton 全部走 components/DetailLayout 共享件。
 */
import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { FileText, Database } from 'lucide-react';
import { useKnowledgeDocs, useKnowledgeBases, useKnowledgeSources } from '@/api/admin/knowledge/useKnowledge';
import { DOC_STATUS_BADGE } from './components/Primitives';
import { DOC_TYPE_LABEL } from './components/constants';
import {
  DetailShell, DetailHeader, DetailStatGrid, DetailStat, DetailSection,
  DetailNotFound, DetailSkeleton,
} from './components/DetailLayout';

export default function DocDetailPage() {
  const { id = '' } = useParams<{ id: string }>();
  const docsQuery = useKnowledgeDocs();
  const kbsQuery = useKnowledgeBases();
  const sourcesQuery = useKnowledgeSources();
  const docs = docsQuery.data ?? [];
  const kbs = kbsQuery.data ?? [];
  const sources = sourcesQuery.data ?? [];

  const doc = useMemo(() => docs.find((d) => d.id === id), [docs, id]);
  const kb = useMemo(() => doc ? kbs.find((k) => k.id === doc.kbId) : undefined, [doc, kbs]);
  const source = useMemo(() => doc?.sourceId ? sources.find((s) => s.id === doc.sourceId) : undefined, [doc, sources]);

  const loading = docsQuery.isLoading || kbsQuery.isLoading || sourcesQuery.isLoading;

  if (loading) {
    return (
      <DetailShell>
        <DetailSkeleton rows={3} />
      </DetailShell>
    );
  }

  if (!doc) {
    return (
      <DetailShell>
        <DetailNotFound subject="文档不存在或已被删除" />
      </DetailShell>
    );
  }

  const badge = DOC_STATUS_BADGE[doc.status];

  return (
    <DetailShell>
      <DetailHeader
        eyebrow={`文档 · ${DOC_TYPE_LABEL[doc.type]}`}
        title={doc.name}
        icon={FileText}
        badges={[{ label: badge.label, className: badge.className }]}
      />

      <DetailSection>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--brand)]">归属知识库</p>
            {kb ? (
              <Link to={`/admin/knowledge/kbs/${kb.id}`} className="mt-1.5 block text-sm font-semibold hover:text-[var(--brand)]">
                {kb.name}
              </Link>
            ) : (
              <p className="mt-1.5 text-sm font-semibold text-[var(--text-muted)]">{doc.kbId}</p>
            )}
            <p className="mt-1 text-[11px] text-[var(--text-muted)]">更新于 {doc.updatedAt}</p>
          </div>

          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--brand)]">来源数据源</p>
            {source ? (
              <Link to={`/admin/knowledge/sources/${source.id}`} className="mt-1.5 flex items-center gap-1.5 text-sm font-semibold hover:text-[var(--brand)]">
                <Database className="h-3.5 w-3.5" />
                {source.name}
              </Link>
            ) : (
              <p className="mt-1.5 text-sm font-semibold text-[var(--text-muted)]">未关联数据源</p>
            )}
            <p className="mt-1 text-[11px] text-[var(--text-muted)]">文档 ID · <code className="text-[10px]">{doc.id}</code></p>
          </div>
        </div>
      </DetailSection>

      <DetailStatGrid columns={3}>
        <DetailStat label="大小" value={`${doc.sizeKb.toLocaleString()} KB`} />
        <DetailStat label="切片" value={doc.chunks.toLocaleString()} />
        <DetailStat label="引用" value={doc.citations.toLocaleString()} />
      </DetailStatGrid>

      <p className="text-center text-xs text-[var(--text-muted)]">本页为前端演示数据,生产环境将接入 EOS 知识中台。</p>
    </DetailShell>
  );
}