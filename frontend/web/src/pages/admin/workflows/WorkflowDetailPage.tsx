/**
 * 管理侧「工作流详情」独立页面 — 路由 /admin/workflows/:id
 *
 * 单页融合「查看 / 编辑」两种模式:
 * - 默认(查看):画布始终渲染(readOnly = nodesDraggable/Connectable/Selectable 全 false),
 *   顶部 KPI · 字段 · Agent 引用 三块信息可一键折叠(默认收起)。
 * - 编辑模式:query ?edit=1 或顶部「编辑」按钮触发,画布可拖/可连,字段可编辑。
 *
 * 内部 state:
 * - readOnly (derived from searchParams.edit)
 * - infoOpen(折叠面板)
 * - selectedNodeId / localFlows / notice(供 FlowEditor 内部使用)
 */
import { useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Workflow as WorkflowIcon, Hash, Tag, Clock, Activity, Zap, Users, Calendar, X, ChevronDown, ChevronRight, Pencil } from 'lucide-react';
import { useWorkflow } from '@/api/admin/workflows/useWorkflows';
import { mockAgents } from '@/mock/admin/agents.fixtures';
import type { Flow } from '@/api/admin/workflows/schema';
import { STATUS_BADGE } from '@/pages/admin/workflows/components/constants';
import { FlowEditor } from './components/FlowEditor';

function NotFound() {
  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-6 p-5 pb-16 sm:p-8 xl:px-8">
      <Link to="/admin/workflows" className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--text-muted)] hover:text-[var(--brand)]">
        <ArrowLeft className="h-3.5 w-3.5" />返回工作流管理
      </Link>
      <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface-1)] p-8 text-center">
        <p className="text-sm font-semibold">工作流不存在或已被删除</p>
        <p className="mt-1 text-xs text-[var(--text-muted)]">请返回列表重新选择。</p>
      </div>
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-3">
      <p className="text-[10px] uppercase tracking-wide text-[var(--text-muted)]">{label}</p>
      <p className="mt-1 text-xl font-semibold text-[var(--text)]">{value}</p>
      {hint && <p className="mt-0.5 text-[10px] text-[var(--text-muted)]">{hint}</p>}
    </div>
  );
}

function Field({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface-1)] p-2.5">
      <span className="mt-0.5 grid h-6 w-6 place-items-center rounded-md bg-[var(--bg-elevated)] text-[var(--brand)]">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] uppercase tracking-wide text-[var(--text-muted)]">{label}</p>
        <div className="mt-0.5 text-sm text-[var(--text)]">{children}</div>
      </div>
    </div>
  );
}

export default function WorkflowDetailPage() {
  const { id = '' } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const isEditMode = searchParams.get('edit') === '1';
  const { data: flow, isLoading } = useWorkflow(id || null);
  const [infoOpen, setInfoOpen] = useState(false);
  const [notice, setNotice] = useState('');
  const [localFlows, setLocalFlows] = useState<Flow[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  const boundAgents = useMemo(() => {
    if (!flow) return [] as typeof mockAgents;
    return mockAgents.filter((a) => flow.boundAgents.includes(a.id) || flow.boundAgents.includes(a.name));
  }, [flow]);

  useEffect(() => {
    if (flow && (localFlows.length === 0 || localFlows[0]?.id !== flow.id)) {
      setLocalFlows([flow]);
    }
  }, [flow, localFlows]);

  if (isLoading) {
    return (
      <div className="mx-auto w-full max-w-[1600px] p-5 pb-16 sm:p-8 xl:px-8">
        <p className="text-sm text-[var(--text-muted)]">加载中…</p>
      </div>
    );
  }

  if (!flow) return <NotFound />;

  const badge = STATUS_BADGE[flow.status];
  const editorFlow = localFlows[0] ?? flow;
  const readOnly = !isEditMode;

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-3 p-4 pb-8 sm:p-6 xl:px-8">
      <button
        type="button"
        onClick={() => { window.location.href = '/admin/workflows'; }}
        className="inline-flex w-fit items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium text-[var(--text-muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--brand)]"
      >
        <ArrowLeft className="h-3.5 w-3.5" />返回工作流管理
      </button>

      <header className="flex flex-wrap items-start justify-between gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] px-4 py-3">
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--brand-soft)] text-[var(--brand)]">
            <WorkflowIcon className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-base font-semibold tracking-tight">{flow.name}</h1>
              <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${badge.className}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${badge.dot}`} />
                {badge.label}
              </span>
              <span className="rounded-md bg-[var(--bg-elevated)] px-2 py-0.5 text-[10px] font-mono text-[var(--text-muted)]">{flow.trigger}</span>
            </div>
            <p className="mt-0.5 text-[11px] text-[var(--text-muted)]">{flow.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setInfoOpen((v) => !v)}
            aria-pressed={infoOpen}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface-1)] px-2.5 text-xs font-semibold text-[var(--text-secondary)] hover:border-[var(--brand)] hover:text-[var(--brand)]"
          >
            {infoOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
            元信息
          </button>
          <button
            type="button"
            onClick={() => {
              if (isEditMode) setSearchParams({});
              else setSearchParams({ edit: '1' });
            }}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[var(--brand)] bg-[var(--brand)] px-3 text-xs font-semibold text-white hover:bg-[var(--brand-hover)]"
          >
            <Pencil className="h-3.5 w-3.5" />
            {isEditMode ? '退出编辑' : '编辑'}
          </button>
        </div>
      </header>

      {infoOpen && (
        <section className="space-y-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-4">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Stat label="调用次数" value={flow.callCount} hint={`${flow.outputs} 输出`} />
            <Stat label="入参字段" value={flow.inputs} />
            <Stat label="被 Agent 引用" value={flow.boundAgents.length} />
            <Stat label="版本数" value={flow.versions.length} hint={flow.owner} />
          </div>

          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
            <Field icon={<Hash className="h-3 w-3" />} label="工作流 ID">
              <code className="text-xs">{flow.id}</code>
            </Field>
            <Field icon={<Tag className="h-3 w-3" />} label="业务场景">
              {flow.scene}
            </Field>
            <Field icon={<Zap className="h-3 w-3" />} label="触发方式">
              {flow.trigger}
            </Field>
            <Field icon={<Activity className="h-3 w-3" />} label="状态">
              {badge.label}
            </Field>
            <Field icon={<Calendar className="h-3 w-3" />} label="创建时间">
              {flow.createdAt}
            </Field>
            <Field icon={<Clock className="h-3 w-3" />} label="最近更新">
              {flow.updatedAt}
            </Field>
          </div>

          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-3">
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
          </div>
        </section>
      )}

      {notice && (
        <div className="flex items-center gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-2 text-xs text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
          <span className="flex-1">{notice}</span>
          <button type="button" onClick={() => setNotice('')} aria-label="关闭提示" className="rounded p-0.5 hover:bg-amber-100 dark:hover:bg-amber-500/20"><X className="h-3.5 w-3.5" /></button>
        </div>
      )}

      <FlowEditor
        flow={editorFlow}
        selectedNodeId={selectedNodeId}
        setSelectedNodeId={setSelectedNodeId}
        setFlows={setLocalFlows}
        onOpenNodeConfig={() => setNotice('演示版本暂不支持节点配置编辑,请回到列表进行完整编辑。')}
        onPublish={() => setNotice('演示版本暂不支持发布,请回到工作流管理进行完整流程。')}
        onVersions={() => setNotice('演示版本暂不支持版本管理,请回到工作流管理查看历史版本。')}
        onBack={() => { window.location.href = '/admin/workflows'; }}
        setNotice={setNotice}
        readOnly={readOnly}
      />
    </div>
  );
}