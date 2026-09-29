/**
 * L3 团队知识详情 — 路由 /admin/memory/l3/:id
 */
import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Calendar, Hash, Layers, User } from 'lucide-react';
import { useL3Entry } from '@/api/admin/memory';
import {
  DetailShell, DetailHeader, DetailStatGrid, DetailStat,
  DetailSection, DetailField, DetailNotFound, DetailSkeleton,
} from '@/pages/admin/knowledge/components/DetailLayout';
import { L3_STATUS_BADGE, LAYER_META } from './components/constants';

export default function L3DetailPage() {
  const { id = '' } = useParams<{ id: string }>();
  const decoded = useMemo(() => decodeURIComponent(id), [id]);
  const { data: entry, isLoading } = useL3Entry(decoded || null);
  const meta = LAYER_META.l3;
  const Icon = meta.icon;

  if (isLoading) {
    return (
      <DetailShell backTo="/admin/memory" backLabel="返回记忆管理">
        <DetailSkeleton rows={3} />
      </DetailShell>
    );
  }
  if (!entry) {
    return (
      <DetailShell backTo="/admin/memory" backLabel="返回记忆管理">
        <DetailNotFound subject="L3 团队知识不存在或已被下线" />
      </DetailShell>
    );
  }

  const status = L3_STATUS_BADGE[entry.status];

  return (
    <DetailShell backTo="/admin/memory" backLabel="返回记忆管理">
      <DetailHeader
        eyebrow={`L3 知识记忆 · ${entry.team}`}
        title={entry.title}
        icon={Icon}
        iconClass="bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300"
        subtitle={`贡献者 ${entry.contributor} · 更新 ${entry.updatedAt}`}
        badges={[
          { label: status.label, className: status.className },
          { label: entry.category, className: 'bg-[var(--bg-elevated)] text-[var(--text-secondary)]' },
        ]}
      />

      <DetailStatGrid columns={4}>
        <DetailStat label="命中次数" value={entry.hits} tone={entry.hits > 100 ? 'success' : 'info'} />
        <DetailStat label="状态" value={status.label} tone={entry.status === 'published' ? 'success' : entry.status === 'draft' ? 'warn' : 'danger'} />
        <DetailStat label="团队" value={entry.team} tone="brand" />
        <DetailStat label="引用方式" value="RAG 检索" tone="info" />
      </DetailStatGrid>

      <DetailSection title="知识摘要" icon={Layers}>
        <p className="text-sm leading-7 text-[var(--text-secondary)]">{entry.summary}</p>
      </DetailSection>

      <DetailSection title="归档与归属" icon={User}>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <DetailField icon={Hash} label="知识 ID"><code className="text-xs">{entry.id}</code></DetailField>
          <DetailField icon={User} label="贡献者">{entry.contributor}</DetailField>
          <DetailField icon={Layers} label="分类">{entry.category}</DetailField>
          <DetailField icon={Calendar} label="更新时间">{entry.updatedAt}</DetailField>
        </div>
      </DetailSection>

      <DetailSection title="相关知识" icon={Layers}>
        <p className="text-xs text-[var(--text-muted)]">
          该条目由团队 <span className="font-semibold text-[var(--text-secondary)]">{entry.team}</span> 共享,所有智能体可经 RAG 检索到。
          <Link to="/admin/memory" className="ml-2 text-[var(--brand)] hover:underline">返回 L3 列表查看其他条目 →</Link>
        </p>
      </DetailSection>
    </DetailShell>
  );
}