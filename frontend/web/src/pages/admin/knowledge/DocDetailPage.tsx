/**
 * 管理侧「文档详情」独立页面 — 路由 /admin/knowledge/docs/:id
 *
 * 顶部返回按钮回到 /admin/knowledge;
 * 头部展示文档名 + 类型 + 状态;
 * 显示大小 / 切片 / 引用 三联 stat + 归属 KB 链接。
 */
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, FileText } from 'lucide-react';
import { useKnowledgeDocs, useKnowledgeBases } from '@/api/admin/knowledge/useKnowledge';
import { DOC_STATUS_BADGE } from './components/Primitives';
import { DOC_TYPE_LABEL } from './components/constants';

function NotFound() {
  return (
    <div className="mx-auto w-full max-w-[1440px] space-y-6 p-5 pb-16 sm:p-8 xl:px-6">
      <Link to="/admin/knowledge" className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--text-muted)] hover:text-[var(--brand)]">
        <ArrowLeft className="h-3.5 w-3.5" />返回知识管理
      </Link>
      <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface-1)] p-8 text-center">
        <p className="text-sm font-semibold">文档不存在或已被删除</p>
        <p className="mt-1 text-xs text-[var(--text-muted)]">请返回列表重新选择。</p>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-4">
      <p className="text-[10px] uppercase tracking-wide text-[var(--text-muted)]">{label}</p>
      <p className="mt-1 text-lg font-semibold tabular-nums">{value}</p>
    </div>
  );
}

export default function DocDetailPage() {
  const { id = '' } = useParams<{ id: string }>();
  const docsQuery = useKnowledgeDocs();
  const kbsQuery = useKnowledgeBases();
  const docs = docsQuery.data ?? [];
  const kbs = kbsQuery.data ?? [];
  const doc = docs.find((d) => d.id === id);

  if (!doc) return <NotFound />;

  const badge = DOC_STATUS_BADGE[doc.status];
  const kb = kbs.find((k) => k.id === doc.kbId);

  return (
    <div className="mx-auto w-full max-w-[1440px] space-y-6 p-5 pb-16 sm:p-8 xl:px-6">
      <Link to="/admin/knowledge" className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--text-muted)] hover:text-[var(--brand)]">
        <ArrowLeft className="h-3.5 w-3.5" />返回知识管理
      </Link>

      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--brand)]">文档 · {DOC_TYPE_LABEL[doc.type]}</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">{doc.name}</h1>
        </div>
        <div className="flex items-center gap-2">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-sky-50 text-sky-600 dark:bg-sky-500/15 dark:text-sky-300">
            <FileText className="h-4 w-4" />
          </span>
          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${badge.className}`}>{badge.label}</span>
        </div>
      </header>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(280px,1fr)]">
        <div className="space-y-5">
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-5">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--brand)]">归属知识库</p>
            {kb ? (
              <Link to={`/admin/knowledge/kbs/${kb.id}`} className="mt-1.5 block text-sm font-semibold hover:text-[var(--brand)]">
                {kb.name}
              </Link>
            ) : (
              <p className="mt-1.5 text-sm font-semibold">{doc.kbId}</p>
            )}
            <p className="mt-1 text-[11px] text-[var(--text-muted)]">更新于 {doc.updatedAt}</p>
          </div>

          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-5">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--brand)]">文档 ID</p>
            <p className="mt-1.5 font-mono text-xs">{doc.id}</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <Stat label="大小" value={`${doc.sizeKb.toLocaleString()} KB`} />
          <Stat label="切片" value={doc.chunks.toLocaleString()} />
          <Stat label="引用" value={doc.citations.toLocaleString()} />
        </div>
      </section>

      <p className="text-center text-xs text-[var(--text-muted)]">本页为前端演示数据,生产环境将接入 EOS 知识中台。</p>
    </div>
  );
}