/**
 * 管理侧「技能详情」独立页面 — 路由 /admin/tools/:id
 *
 * 顶部返回按钮回到 /admin/tools;
 * 头部展示名称 + 状态 + 关键 KPI;
 * 下方展示技能全部字段 + 反向引用 agent 列表。
 */
import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Boxes, Tag, Hash, Star, Clock3, Activity, AlertTriangle, Users } from 'lucide-react';
import { useAdminSkill } from '@/api/admin/skills/useAdminSkills';
import { mockAgents } from '@/mock/admin/agents.fixtures';
import { STATUS_BADGE } from '@/pages/admin/skills/components/constants';

function NotFound() {
  return (
    <div className="mx-auto w-full max-w-[1440px] space-y-6 p-5 pb-16 sm:p-8 xl:px-6">
      <Link to="/admin/tools" className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--text-muted)] hover:text-[var(--brand)]">
        <ArrowLeft className="h-3.5 w-3.5" />返回技能管理
      </Link>
      <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface-1)] p-8 text-center">
        <p className="text-sm font-semibold">技能不存在或已被删除</p>
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

export default function SkillDetailPage() {
  const { id = '' } = useParams<{ id: string }>();
  const { data: skill, isLoading } = useAdminSkill(id || null);

  const boundAgents = useMemo(() => {
    if (!skill) return [] as typeof mockAgents;
    return mockAgents.filter((a) => skill.usedByAgents.includes(a.name));
  }, [skill]);

  if (isLoading) {
    return (
      <div className="mx-auto w-full max-w-[1440px] p-5 pb-16 sm:p-8 xl:px-6">
        <p className="text-sm text-[var(--text-muted)]">加载中…</p>
      </div>
    );
  }

  if (!skill) return <NotFound />;

  const badge = STATUS_BADGE[skill.status];

  return (
    <div className="mx-auto w-full max-w-[1440px] space-y-4 p-5 pb-16 sm:p-8 xl:px-6">
      <button
        type="button"
        onClick={() => { window.location.href = '/admin/tools'; }}
        className="inline-flex w-fit items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium text-[var(--text-muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--brand)]"
      >
        <ArrowLeft className="h-3.5 w-3.5" />返回技能管理
      </button>

      <header className="flex flex-wrap items-start justify-between gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] px-5 py-4">
        <div className="flex items-start gap-3">
          <span className="grid h-12 w-12 place-items-center rounded-xl bg-[var(--brand-soft)] text-[var(--brand)]">
            <Boxes className="h-6 w-6" />
          </span>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg font-semibold tracking-tight">{skill.name}</h1>
              <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${badge.className}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${badge.dot}`} />
                {badge.label}
              </span>
              <span className="rounded-md bg-[var(--bg-elevated)] px-2 py-0.5 text-[11px] font-mono text-[var(--text-muted)]">{skill.type}</span>
            </div>
            <p className="mt-0.5 text-[11px] text-[var(--text-muted)]">{skill.description}</p>
          </div>
        </div>
      </header>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="调用次数" value={skill.calls} hint={`成功 ${(skill.successRate * 100).toFixed(0)}%`} />
        <Stat label="平均延迟" value={`${skill.avgLatencyMs}ms`} hint={`错误率 ${(skill.errorRate * 100).toFixed(1)}%`} />
        <Stat label="评分" value={skill.rating.toFixed(1)} hint={`${skill.versions.length} 个版本`} />
        <Stat label="被 Agent 引用" value={skill.usedByAgents.length} hint={`风险 ${skill.risk}`} />
      </section>

      <section className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <Field icon={<Hash className="h-3.5 w-3.5" />} label="技能 ID">
          <code className="text-xs">{skill.id}</code>
        </Field>
        <Field icon={<Tag className="h-3.5 w-3.5" />} label="标签">
          <div className="flex flex-wrap gap-1">
            {skill.tags.map((t) => (
              <span key={t} className="rounded-md bg-[var(--bg-elevated)] px-2 py-0.5 text-[11px]">{t}</span>
            ))}
            {skill.tags.length === 0 && <span className="text-[var(--text-muted)]">无标签</span>}
          </div>
        </Field>
        <Field icon={<Star className="h-3.5 w-3.5" />} label="可见范围">
          {skill.visibleScope.join(' · ')}
        </Field>
        <Field icon={<Clock3 className="h-3.5 w-3.5" />} label="最近更新">
          {skill.lastUpdate} · {skill.owner}
        </Field>
        <Field icon={<Activity className="h-3.5 w-3.5" />} label="调用趋势">
          <div className="flex h-8 items-end gap-0.5">
            {skill.trend.map((v, i) => (
              <span key={i} className="w-2 rounded-sm bg-[var(--brand)]" style={{ height: `${Math.max(4, v * 28)}px` }} />
            ))}
          </div>
        </Field>
        <Field icon={<AlertTriangle className="h-3.5 w-3.5" />} label="风险级别">
          <span className={skill.risk === 'high' ? 'text-[var(--danger)]' : skill.risk === 'medium' ? 'text-[var(--warning)]' : ''}>
            {skill.risk.toUpperCase()} {skill.needConfirm ? '· 需确认' : ''}
          </span>
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