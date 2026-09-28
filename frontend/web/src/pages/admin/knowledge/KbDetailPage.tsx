/**
 * 管理侧「知识库详情」独立页面 — 路由 /admin/knowledge/kbs/:id
 *
 * 顶部返回按钮回到 /admin/knowledge;
 * 头部展示名称 + 状态 + 关键 KPI;
 * 下方展示知识库全部字段 + 反向引用 agent 列表。
 */
import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Database, FileText, Tag, Hash, Activity, Layers, Users } from 'lucide-react';
import { useKnowledgeBase, useKnowledgeDocs } from '@/api/admin/knowledge/useKnowledge';
import { mockAgents } from '@/mock/admin/agents.fixtures';

function NotFound() {
  return (
    <div className="mx-auto w-full max-w-[1440px] space-y-6 p-5 pb-16 sm:p-8 xl:px-6">
      <Link to="/admin/knowledge" className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--text-muted)] hover:text-[var(--brand)]">
        <ArrowLeft className="h-3.5 w-3.5" />返回知识管理
      </Link>
      <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface-1)] p-8 text-center">
        <p className="text-sm font-semibold">知识库不存在或已被删除</p>
        <p className="mt-1 text-xs text-[var(--text-muted)]">请返回列表重新选择。</p>
      </div>
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-4">
      <p className="text-[11px] uppercase tracking-wide text-[var(--text-muted)]">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-[var(--text)]">{value}</p>
      {hint && <p className="mt-1 text-[11px] text-[var(--text-muted)]">{hint}</p>}
    </div>
  );
}

function Field({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-3">
      <span className="mt-0.5 grid h-7 w-7 place-items-center rounded-md bg-[var(--bg-elevated)] text-[var(--brand)]">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] uppercase tracking-wide text-[var(--text-muted)]">{label}</p>
        <div className="mt-0.5 text-sm text-[var(--text)]">{children}</div>
      </div>
    </div>
  );
}

const STATUS_LABEL: Record<string, { label: string; className: string; dot: string }> = {
  indexed: { label: '已索引', className: 'bg-[var(--success-soft)] text-[var(--success)]', dot: 'bg-[var(--success)]' },
  indexing: { label: '索引中', className: 'bg-[var(--info-soft)] text-[var(--info)]', dot: 'bg-[var(--info)]' },
  paused: { label: '已暂停', className: 'bg-[var(--bg-elevated)] text-[var(--text-muted)]', dot: 'bg-[var(--text-muted)]' },
  failed: { label: '索引失败', className: 'bg-[var(--danger-soft)] text-[var(--danger)]', dot: 'bg-[var(--danger)]' },
};

export default function KbDetailPage() {
  const { id = '' } = useParams<{ id: string }>();
  const { data: kb, isLoading } = useKnowledgeBase(id || null);
  const { data: docs = [] } = useKnowledgeDocs();

  const kbDocs = useMemo(() => docs.filter((d) => d.kbId === id), [docs, id]);

  const boundAgents = useMemo(() => {
    if (!kb) return [] as typeof mockAgents;
    return mockAgents.filter((a) => a.knowledgeRefs.some((r) => r.id === kb.id));
  }, [kb]);

  if (isLoading) {
    return (
      <div className="mx-auto w-full max-w-[1440px] p-5 pb-16 sm:p-8 xl:px-6">
        <p className="text-sm text-[var(--text-muted)]">加载中…</p>
      </div>
    );
  }

  if (!kb) return <NotFound />;

  const badge = STATUS_LABEL[kb.status] ?? STATUS_LABEL.paused;

  return (
    <div className="mx-auto w-full max-w-[1440px] space-y-4 p-5 pb-16 sm:p-8 xl:px-6">
      <button
        type="button"
        onClick={() => { window.location.href = '/admin/knowledge'; }}
        className="inline-flex w-fit items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium text-[var(--text-muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--brand)]"
      >
        <ArrowLeft className="h-3.5 w-3.5" />返回知识管理
      </button>

      <header className="flex flex-wrap items-start justify-between gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] px-5 py-4">
        <div className="flex items-start gap-3">
          <span className="grid h-12 w-12 place-items-center rounded-xl bg-[var(--brand-soft)] text-[var(--brand)]">
            <Database className="h-6 w-6" />
          </span>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg font-semibold tracking-tight">{kb.name}</h1>
              <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${badge.className}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${badge.dot}`} />
                {badge.label}
              </span>
              <span className="rounded-md bg-[var(--bg-elevated)] px-2 py-0.5 text-[11px] font-mono text-[var(--text-muted)]">{kb.scope}</span>
            </div>
            <p className="mt-0.5 text-[11px] text-[var(--text-muted)]">{kb.description}</p>
          </div>
        </div>
      </header>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="文档数" value={kb.docCount} hint={`向量 ${kb.vectorCount}`} />
        <Stat label="评测命中率" value={`${(kb.evalHitRate * 100).toFixed(0)}%`} />
        <Stat label="最近更新" value={kb.updatedAt} hint={kb.owner} />
        <Stat label="被 Agent 引用" value={boundAgents.length} />
      </section>

      <section className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <Field icon={<Hash className="h-3.5 w-3.5" />} label="知识库 ID">
          <code className="text-xs">{kb.id}</code>
        </Field>
        <Field icon={<Tag className="h-3.5 w-3.5" />} label="标签">
          <div className="flex flex-wrap gap-1">
            {kb.tags.map((t) => (
              <span key={t} className="rounded-md bg-[var(--bg-elevated)] px-2 py-0.5 text-[11px]">{t}</span>
            ))}
            {kb.tags.length === 0 && <span className="text-[var(--text-muted)]">无标签</span>}
          </div>
        </Field>
        <Field icon={<Activity className="h-3.5 w-3.5" />} label="状态">
          {badge.label}
        </Field>
        <Field icon={<Layers className="h-3.5 w-3.5" />} label="可见范围">
          {kb.scope}
        </Field>
      </section>

      <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-4">
        <div className="flex items-center gap-2 text-xs font-semibold text-[var(--text)]">
          <FileText className="h-3.5 w-3.5 text-[var(--brand)]" />知识库文档 ({kbDocs.length})
        </div>
        {kbDocs.length === 0 ? (
          <p className="mt-2 text-xs text-[var(--text-muted)]">该知识库暂无文档</p>
        ) : (
          <ul className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {kbDocs.map((d) => (
              <li key={d.id} className="flex items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--bg-app)] px-3 py-2 text-xs">
                <span className="font-medium">{d.name}</span>
                <span className="text-[var(--text-muted)]">{d.chunks} chunks · {d.sizeKb}KB</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-4">
        <div className="flex items-center gap-2 text-xs font-semibold text-[var(--text)]">
          <Users className="h-3.5 w-3.5 text-[var(--brand)]" />被以下 Agent 引用
        </div>
        {boundAgents.length === 0 ? (
          <p className="mt-2 text-xs text-[var(--text-muted)]">暂无 Agent 引用</p>
        ) : (
          <ul className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {boundAgents.map((a) => (
              <li key={a.id} className="flex items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--bg-app)] px-3 py-2 text-xs">
                <span className="font-medium">{a.name}</span>
                <Link to={`/admin/agents/${a.id}`} className="text-[var(--brand)] hover:underline">查看 →</Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}