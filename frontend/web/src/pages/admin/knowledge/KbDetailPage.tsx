/**
 * 管理侧「知识库详情」独立页面 — 路由 /admin/knowledge/kbs/:id
 *
 * 顶部返回知识管理;头部展示名称 + 状态 + 可见范围 + 关键 KPI;
 * 下方展示知识库全部字段 + 反向引用 doc / agent 列表。
 * wrapper / Stat / Field / NotFound / Skeleton 全部走 components/DetailLayout 共享件。
 */
import { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { Database, FileText, Tag, Hash, Activity, Layers, Users } from 'lucide-react';
import { useKnowledgeBase, useKnowledgeDocs } from '@/api/admin/knowledge/useKnowledge';
import { mockAgents } from '@/mock/admin/agents.fixtures';
import { KB_STATUS_BADGE } from './components/Primitives';
import {
  DetailShell, DetailHeader, DetailStatGrid, DetailStat, DetailSection, DetailField,
  DetailNotFound, DetailSkeleton,
} from './components/DetailLayout';

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
      <DetailShell>
        <DetailSkeleton rows={3} />
      </DetailShell>
    );
  }

  if (!kb) {
    return (
      <DetailShell>
        <DetailNotFound subject="知识库不存在或已被删除" />
      </DetailShell>
    );
  }

  const badge = KB_STATUS_BADGE[kb.status] ?? KB_STATUS_BADGE.paused;
  const badges = [
    { label: badge.label, className: badge.className },
    { label: `可见范围 · ${kb.scope}`, className: 'bg-[var(--bg-elevated)] text-[var(--text-secondary)]' },
  ];

  return (
    <DetailShell>
      <DetailHeader
        icon={Database}
        title={kb.name}
        subtitle={kb.description}
        badges={badges}
      />

      <DetailStatGrid columns={4}>
        <DetailStat label="文档数" value={kb.docCount} hint={`向量 ${kb.vectorCount}`} />
        <DetailStat label="评测命中率" value={`${(kb.evalHitRate * 100).toFixed(0)}%`} />
        <DetailStat label="最近更新" value={kb.updatedAt} hint={kb.owner} />
        <DetailStat label="被 Agent 引用" value={boundAgents.length} />
      </DetailStatGrid>

      <DetailSection>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <DetailField icon={Hash} label="知识库 ID">
            <code className="text-xs">{kb.id}</code>
          </DetailField>
          <DetailField icon={Tag} label="标签">
            <div className="flex flex-wrap gap-1">
              {kb.tags.map((t) => (
                <span key={t} className="rounded-md bg-[var(--bg-elevated)] px-2 py-0.5 text-[11px]">{t}</span>
              ))}
              {kb.tags.length === 0 && <span className="text-[var(--text-muted)]">无标签</span>}
            </div>
          </DetailField>
          <DetailField icon={Activity} label="状态">
            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${badge.className}`}>
              {badge.label}
            </span>
          </DetailField>
          <DetailField icon={Layers} label="可见范围">
            {kb.scope}
          </DetailField>
        </div>
      </DetailSection>

      <DetailSection title={`知识库文档 (${kbDocs.length})`} icon={FileText}>
        {kbDocs.length === 0 ? (
          <p className="text-xs text-[var(--text-muted)]">该知识库暂无文档</p>
        ) : (
          <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {kbDocs.map((d) => (
              <li key={d.id} className="flex items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--bg-app)] px-3 py-2 text-xs">
                <span className="font-medium">{d.name}</span>
                <span className="text-[var(--text-muted)]">{d.chunks} chunks · {d.sizeKb}KB</span>
              </li>
            ))}
          </ul>
        )}
      </DetailSection>

      <DetailSection title={`被以下 Agent 引用 (${boundAgents.length})`} icon={Users}>
        {boundAgents.length === 0 ? (
          <p className="text-xs text-[var(--text-muted)]">暂无 Agent 引用</p>
        ) : (
          <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {boundAgents.map((a) => (
              <li key={a.id} className="flex items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--bg-app)] px-3 py-2 text-xs">
                <span className="font-medium">{a.name}</span>
                <a href={`/admin/agents/${a.id}`} className="text-[var(--brand)] hover:underline">查看 →</a>
              </li>
            ))}
          </ul>
        )}
      </DetailSection>
    </DetailShell>
  );
}