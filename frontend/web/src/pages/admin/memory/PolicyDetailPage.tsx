/**
 * 管理侧「记忆策略详情」独立页面 — 路由 /admin/memory/policies/:id
 *
 * id 即策略 label(URL 编码)。
 * 顶部返回按钮回到 /admin/memory;
 * 头部展示名称 + 层级 + 关键参数;
 * 下方展示策略全部字段 + 反向引用 agent 列表。
 */
import { useMemo } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Brain, Layers, Clock, Hash, HardDrive, Percent, Users, Trash2 } from 'lucide-react';
import { useRetentionPolicy } from '@/api/admin/memory/useMemory';
import { mockAgents } from '@/mock/admin/agents.fixtures';

function NotFound() {
  return (
    <div className="mx-auto w-full max-w-[1440px] space-y-6 p-5 pb-16 sm:p-8 xl:px-6">
      <Link to="/admin/memory" className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--text-muted)] hover:text-[var(--brand)]">
        <ArrowLeft className="h-3.5 w-3.5" />返回记忆管理
      </Link>
      <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface-1)] p-8 text-center">
        <p className="text-sm font-semibold">策略不存在或已被删除</p>
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

const LAYER_LABEL: Record<string, { label: string; className: string }> = {
  L1: { label: '短期会话', className: 'bg-[var(--info-soft)] text-[var(--info)]' },
  L2: { label: '事实经验', className: 'bg-[var(--purple-soft)] text-[var(--purple)]' },
  L3: { label: '长期知识', className: 'bg-[var(--brand-soft)] text-[var(--brand)]' },
};

export default function PolicyDetailPage() {
  const { id = '' } = useParams<{ id: string }>();
  const decoded = useMemo(() => decodeURIComponent(id), [id]);
  const { data: policy, isLoading } = useRetentionPolicy(decoded || null);
  const navigate = useNavigate();

  const boundAgents = useMemo(() => {
    if (!policy) return [] as typeof mockAgents;
    return mockAgents.filter((a) => a.memoryPolicy.enabled && a.category === policy.layer);
  }, [policy]);

  if (isLoading) {
    return (
      <div className="mx-auto w-full max-w-[1440px] p-5 pb-16 sm:p-8 xl:px-6">
        <p className="text-sm text-[var(--text-muted)]">加载中…</p>
      </div>
    );
  }

  if (!policy) return <NotFound />;

  const layerBadge = LAYER_LABEL[policy.layer] ?? LAYER_LABEL.L2;

  return (
    <div className="mx-auto w-full max-w-[1440px] space-y-4 p-5 pb-16 sm:p-8 xl:px-6">
      <button
        type="button"
        onClick={() => { navigate('/admin/memory'); }}
        className="inline-flex w-fit items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium text-[var(--text-muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--brand)]"
      >
        <ArrowLeft className="h-3.5 w-3.5" />返回记忆管理
      </button>

      <header className="flex flex-wrap items-start justify-between gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] px-5 py-4">
        <div className="flex items-start gap-3">
          <span className="grid h-12 w-12 place-items-center rounded-xl bg-[var(--brand-soft)] text-[var(--brand)]">
            <Brain className="h-6 w-6" />
          </span>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg font-semibold tracking-tight">{policy.label}</h1>
              <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${layerBadge.className}`}>
                {policy.layer} · {layerBadge.label}
              </span>
            </div>
            <p className="mt-0.5 text-[11px] text-[var(--text-muted)]">{policy.description}</p>
          </div>
        </div>
      </header>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="TTL" value={`${policy.ttlMinutes}m`} />
        <Stat label="最大条目" value={policy.maxItems} />
        <Stat label="存储上限" value={`${policy.storageMb}MB`} />
        <Stat label="命中率" value={`${(policy.hitRate * 100).toFixed(0)}%`} hint={`淘汰 ${policy.eviction}`} />
      </section>

      <section className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <Field icon={<Layers className="h-3.5 w-3.5" />} label="记忆层级">
          {policy.layer} · {layerBadge.label}
        </Field>
        <Field icon={<Clock className="h-3.5 w-3.5" />} label="存活时间">
          {policy.ttlMinutes} 分钟
        </Field>
        <Field icon={<Hash className="h-3.5 w-3.5" />} label="最大条目">
          {policy.maxItems}
        </Field>
        <Field icon={<HardDrive className="h-3.5 w-3.5" />} label="存储上限">
          {policy.storageMb} MB
        </Field>
        <Field icon={<Trash2 className="h-3.5 w-3.5" />} label="淘汰策略">
          {policy.eviction}
        </Field>
        <Field icon={<Percent className="h-3.5 w-3.5" />} label="命中率">
          {(policy.hitRate * 100).toFixed(1)}%
        </Field>
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