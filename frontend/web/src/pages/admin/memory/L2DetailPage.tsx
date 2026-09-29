/**
 * L2 长期事实详情 — 路由 /admin/memory/l2/:id
 */
import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Activity, Calendar, Hash, Link as LinkIcon, User } from 'lucide-react';
import { useL2Fact } from '@/api/admin/memory';
import {
  DetailShell, DetailHeader, DetailStatGrid, DetailStat,
  DetailSection, DetailField, DetailNotFound, DetailSkeleton,
} from '@/pages/admin/knowledge/components/DetailLayout';
import { L2_CATEGORY_LABEL, L2_STATUS_BADGE, LAYER_META } from './components/constants';

export default function L2DetailPage() {
  const { id = '' } = useParams<{ id: string }>();
  const decoded = useMemo(() => decodeURIComponent(id), [id]);
  const { data: fact, isLoading } = useL2Fact(decoded || null);
  const meta = LAYER_META.l2;
  const Icon = meta.icon;

  if (isLoading) {
    return (
      <DetailShell backTo="/admin/memory" backLabel="返回记忆管理">
        <DetailSkeleton rows={3} />
      </DetailShell>
    );
  }
  if (!fact) {
    return (
      <DetailShell backTo="/admin/memory" backLabel="返回记忆管理">
        <DetailNotFound subject="长期事实不存在或已被删除" />
      </DetailShell>
    );
  }

  const status = L2_STATUS_BADGE[fact.status];
  const confPct = Math.round(fact.confidence * 100);
  const confTone = confPct >= 85 ? 'success' : confPct >= 70 ? 'warn' : 'danger';
  const catLabel = L2_CATEGORY_LABEL[fact.category];

  return (
    <DetailShell backTo="/admin/memory" backLabel="返回记忆管理">
      <DetailHeader
        eyebrow="长期记忆 · 事实"
        title={fact.key}
        icon={Icon}
        iconClass="bg-violet-50 text-violet-600 dark:bg-violet-500/15 dark:text-violet-300"
        subtitle={`归属 ${fact.userName} · 置信度 ${confPct}% · 来源 sess-${fact.sourceSession.split('-')[1]?.padStart(3, '0') ?? '000'}`}
        badges={[
          { label: status.label, className: status.className },
          { label: catLabel, className: 'bg-[var(--bg-elevated)] text-[var(--text-secondary)]' },
        ]}
      />

      <DetailStatGrid columns={4}>
        <DetailStat label="置信度" value={`${confPct}%`} tone={confTone} hint={`类别 · ${catLabel}`} />
        <DetailStat label="最后使用" value={fact.lastUsed} />
        <DetailStat label="已晋升 L3" value={fact.promotedToL3 ? '是' : '否'} tone={fact.promotedToL3 ? 'brand' : undefined} />
        <DetailStat label="状态" value={status.label} tone={fact.status === 'pending' ? 'warn' : fact.status === 'retired' ? 'danger' : 'success'} />
      </DetailStatGrid>

      <DetailSection title="事实内容" icon={Activity}>
        <p className="text-sm leading-7 text-[var(--text-secondary)]">{fact.value}</p>
      </DetailSection>

      <DetailSection title="溯源与归档" icon={LinkIcon}>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <DetailField icon={Hash} label="事实 ID"><code className="text-xs">{fact.id}</code></DetailField>
          <DetailField icon={User} label="归属用户">{fact.userName}</DetailField>
          <DetailField icon={LinkIcon} label="来源会话">
            <Link to={`/admin/memory/l1/${fact.sourceSession}`} className="text-[var(--brand)] hover:underline">
              sess-{fact.sourceSession.split('-')[1]?.padStart(3, '0') ?? '000'}
            </Link>
          </DetailField>
          <DetailField icon={Calendar} label="归档时间">{fact.promotedAt}</DetailField>
        </div>
      </DetailSection>
    </DetailShell>
  );
}