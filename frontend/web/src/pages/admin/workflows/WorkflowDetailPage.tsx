/**
 * 管理侧「工作流详情」独立页面 — 路由 /admin/workflows/:id
 *
 * 顶部返回按钮回到 /admin/workflows;
 * 头部展示名称 + 触发器 + 关键 KPI;
 * 下方展示工作流全部字段 + 反向引用 agent 列表。
 *
 * ?edit=1 query param 启用编辑器视图(由 WorkflowCreatePage 创建后跳转):
 * - 只读 body 折叠为可关闭横幅
 * - 渲染 FlowEditor + 占位回调(save toast / publish 占位)
 */
import { useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Workflow, Tag, Hash, Clock, Activity, Zap, Users, Calendar, X, Workflow as WorkflowIcon } from 'lucide-react';
import { useWorkflow } from '@/api/admin/workflows/useWorkflows';
import { mockAgents } from '@/mock/admin/agents.fixtures';
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

export default function WorkflowDetailPage() {
  const { id = '' } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const isEditMode = searchParams.get('edit') === '1';
  const { data: flow, isLoading } = useWorkflow(id || null);

  const boundAgents = useMemo(() => {
    if (!flow) return [] as typeof mockAgents;
    return mockAgents.filter((a) => flow.boundAgents.includes(a.id) || flow.boundAgents.includes(a.name));
  }, [flow]);

  if (isLoading) {
    return (
      <div className="mx-auto w-full max-w-[1600px] p-5 pb-16 sm:p-8 xl:px-8">
        <p className="text-sm text-[var(--text-muted)]">加载中…</p>
      </div>
    );
  }

  if (!flow) return <NotFound />;

  const badge = STATUS_BADGE[flow.status];

  if (isEditMode) {
    return (
      <div className="mx-auto w-full max-w-[1600px] space-y-3 p-4 sm:p-6 xl:px-8">
        <EditorModeBody flow={flow} />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1440px] space-y-4 p-5 pb-16 sm:p-8 xl:px-6">
      <button
        type="button"
        onClick={() => { window.location.href = '/admin/workflows'; }}
        className="inline-flex w-fit items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium text-[var(--text-muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--brand)]"
      >
        <ArrowLeft className="h-3.5 w-3.5" />返回工作流管理
      </button>

      <header className="flex flex-wrap items-start justify-between gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] px-5 py-4">
        <div className="flex items-start gap-3">
          <span className="grid h-12 w-12 place-items-center rounded-xl bg-[var(--brand-soft)] text-[var(--brand)]">
            <Workflow className="h-6 w-6" />
          </span>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg font-semibold tracking-tight">{flow.name}</h1>
              <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${badge.className}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${badge.dot}`} />
                {badge.label}
              </span>
              <span className="rounded-md bg-[var(--bg-elevated)] px-2 py-0.5 text-[11px] font-mono text-[var(--text-muted)]">{flow.trigger}</span>
            </div>
            <p className="mt-0.5 text-[11px] text-[var(--text-muted)]">{flow.description}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            if (isEditMode) setSearchParams({});
            else setSearchParams({ edit: '1' });
          }}
          className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] px-3 text-xs font-semibold text-[var(--text-secondary)] transition hover:border-[var(--brand)] hover:text-[var(--brand)]"
        >
          {isEditMode ? <><ArrowLeft className="h-3.5 w-3.5" />查看详情</> : <><WorkflowIcon className="h-3.5 w-3.5" />继续编辑</>}
        </button>
      </header>

      {isEditMode && (
        <EditorModeBody flow={flow} />
      )}

      {!isEditMode && (
        <>
          <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="调用次数" value={flow.callCount} hint={`${flow.outputs} 输出`} />
            <Stat label="入参字段" value={flow.inputs} />
            <Stat label="被 Agent 引用" value={flow.boundAgents.length} />
            <Stat label="版本数" value={flow.versions.length} hint={flow.owner} />
          </section>

          <section className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Field icon={<Hash className="h-3.5 w-3.5" />} label="工作流 ID">
              <code className="text-xs">{flow.id}</code>
            </Field>
            <Field icon={<Tag className="h-3.5 w-3.5" />} label="业务场景">
              {flow.scene}
            </Field>
            <Field icon={<Zap className="h-3.5 w-3.5" />} label="触发方式">
              {flow.trigger}
            </Field>
            <Field icon={<Activity className="h-3.5 w-3.5" />} label="状态">
              {badge.label}
            </Field>
            <Field icon={<Calendar className="h-3.5 w-3.5" />} label="创建时间">
              {flow.createdAt}
            </Field>
            <Field icon={<Clock className="h-3.5 w-3.5" />} label="最近更新">
              {flow.updatedAt}
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
        </>
      )}
    </div>
  );
}

function EditorModeBody({ flow }: { flow: NonNullable<ReturnType<typeof useWorkflow>['data']> }) {
  const [notice, setNotice] = useState('');
  const [localFlows, setLocalFlows] = useState([flow]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  return (
    <>
      {notice && (
        <div className="flex items-center gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-2 text-xs text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
          <span className="flex-1">{notice}</span>
          <button type="button" onClick={() => setNotice('')} aria-label="关闭提示" className="rounded p-0.5 hover:bg-amber-100 dark:hover:bg-amber-500/20"><X className="h-3.5 w-3.5" /></button>
        </div>
      )}
      <FlowEditor
        flow={localFlows[0]}
        selectedNodeId={selectedNodeId}
        setSelectedNodeId={setSelectedNodeId}
        setFlows={setLocalFlows}
        onOpenNodeConfig={() => setNotice('演示版本暂不支持节点配置编辑,请回到列表进行完整编辑。')}
        onPublish={() => setNotice('演示版本暂不支持发布,请回到工作流管理进行完整流程。')}
        onVersions={() => setNotice('演示版本暂不支持版本管理,请回到工作流管理查看历史版本。')}
        onBack={() => { window.location.href = '/admin/workflows'; }}
        setNotice={setNotice}
      />
    </>
  );
}