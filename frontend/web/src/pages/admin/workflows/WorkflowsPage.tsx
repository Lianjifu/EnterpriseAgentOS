/**
 * WorkflowsPage — 工作流管理 list hub(纯列表,不再持有内嵌 editor 状态)。
 *
 * 5 tab:总览 / 节点库 / 集成 / 发布 / 版本。
 * 3 入口跳转:
 * - 新建 → /admin/workflows/new(WorkflowCreatePage)
 * - 查看 → /admin/workflows/:id(WorkflowDetailPage 只读)
 * - 编辑 → /admin/workflows/:id?edit=1(WorkflowDetailPage 编辑模式)
 *
 * 列表内 modal:发布为工具 / 版本 / 节点配置(继续可用)。
 */
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Boxes } from 'lucide-react';
import { NoticeBanner } from '@/components/feedback/NoticeBanner';
import { useWorkflows, useWorkflowStats } from '@/api/admin/workflows';
import type {
  Flow, FlowNodeData, WorkflowTabId, NodeKind,
} from '@/api/admin/workflows/schema';
import type { Node } from 'reactflow';
import { TABS, countForTab, uid } from './components/constants';
import { OverviewTab } from './components/tabs/OverviewTab';
import { NodeLibraryTab } from './components/tabs/NodeLibraryTab';
import { IntegrationsTab } from './components/tabs/IntegrationsTab';
import { PublishTab } from './components/tabs/PublishTab';
import { VersionsTab } from './components/tabs/VersionsTab';
import { PublishAsToolModal } from './components/PublishAsToolModal';
import { FlowVersionModal } from './components/FlowVersionModal';
import { NodeConfigModal } from './components/NodeConfigModal';

export default function WorkflowsPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<WorkflowTabId>('overview');
  const remoteFlows = useWorkflows().data ?? [];
  const [flows, setFlows] = useState<Flow[]>(remoteFlows);
  const [notice, setNotice] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<Flow['status'] | 'all'>('all');

  const [publishOpen, setPublishOpen] = useState(false);
  const [publishFlow, setPublishFlow] = useState<Flow | null>(null);
  const [toolId, setToolId] = useState('');
  const [toolDesc, setToolDesc] = useState('');
  const [toolInput, setToolInput] = useState('query:string:true');
  const [toolOutput, setToolOutput] = useState('result:string:true');

  const [versionOpen, setVersionOpen] = useState(false);
  const [versionFlow, setVersionFlow] = useState<Flow | null>(null);

  const [nodeConfigOpen, setNodeConfigOpen] = useState(false);
  const [nodeConfigTarget, setNodeConfigTarget] = useState<Node<FlowNodeData> | null>(null);

  // 用 effects 同步远端数据(防止 stale state)
  useEffect(() => {
    setFlows(remoteFlows);
  }, [remoteFlows]);

  const counts = useWorkflowStats(flows);

  const visibleFlows = useMemo(() => flows.filter((f) =>
    (statusFilter === 'all' || f.status === statusFilter) &&
    `${f.name} ${f.description} ${f.owner} ${f.scene}`.toLowerCase().includes(search.trim().toLowerCase()),
  ), [flows, statusFilter, search]);

  // ───────────── 路由入口(3 入口) ─────────────
  const goCreate = () => navigate('/admin/workflows/new');
  const goView = (id: string) => navigate(`/admin/workflows/${id}`);
  const goEdit = (id: string) => navigate(`/admin/workflows/${id}?edit=1`);

  // ───────────── 列表内 modal 行为 ─────────────
  const openPublish = (flow: Flow) => {
    setPublishFlow(flow);
    setToolId(flow.id.replace(/^wf-/, ''));
    setToolDesc(flow.description);
    setToolInput('query:string:true');
    setToolOutput('result:string:true');
    setPublishOpen(true);
  };

  const submitPublish = () => {
    if (!publishFlow) return;
    const v = publishFlow.versions[0]?.v || 'v1.0';
    setFlows((prev) => prev.map((f) => f.id === publishFlow.id ? {
      ...f, status: 'published', updatedAt: '刚刚',
      versions: [{ v: `${v}-已发布`, at: '刚刚', operator: '当前管理员', note: `发布为工具 ${toolId || f.id}` }, ...f.versions],
    } : f));
    setPublishOpen(false);
    setNotice(`「${publishFlow.name}」已发布为可被智能体调用的工具。`);
  };

  const retireFlow = (flow: Flow) => {
    setFlows((prev) => prev.map((f) => f.id === flow.id ? { ...f, status: 'retired', updatedAt: '刚刚' } : f));
    setNotice(`「${flow.name}」已下线,不再可被调用。`);
  };

  const copyFlow = (flow: Flow) => {
    const copyId = uid('wf');
    const copy: Flow = {
      ...flow, id: copyId, name: `${flow.name} · 副本`, status: 'draft',
      callCount: 0, boundAgents: [], updatedAt: '刚刚', createdAt: '刚刚',
      versions: [{ v: 'v0.1-草稿', at: '刚刚', operator: '当前管理员', note: '从副本复制' }],
      initialNodes: flow.initialNodes.map((n) => ({ ...n, id: `${n.id}-${copyId.slice(-3)}` })),
      initialEdges: [],
    };
    setFlows((prev) => [copy, ...prev]);
    setNotice(`已复制为「${flow.name} · 副本」。`);
  };

  // ───────────── 节点库 tab:加入画布 ─────────────
  const addNodeToFlow = (seed: { kind: NodeKind; label: string; subtitle: string; defaults: Record<string, string> }, flow: Flow) => {
    const id = uid('n');
    const node: Node<FlowNodeData> = {
      id, type: 'flowNode',
      position: { x: 200 + Math.random() * 200, y: 80 + Math.random() * 200 },
      data: { label: seed.label, subtitle: seed.subtitle, kind: seed.kind, config: { ...seed.defaults } },
    };
    setFlows((prev) => prev.map((f) => f.id === flow.id ? {
      ...f, initialNodes: [...f.initialNodes, node], updatedAt: '刚刚',
    } : f));
    setNotice(`已将「${seed.label}」节点加入「${flow.name}」画布。`);
  };

  // ───────────── 集成 tab:绑定智能体 ─────────────
  const bindAgentToFlow = (flowId: string, agentId: string) => {
    setFlows((prev) => prev.map((f) => {
      if (f.id !== flowId) return f;
      if (f.boundAgents.includes(agentId)) return f;
      return { ...f, boundAgents: [...f.boundAgents, agentId], updatedAt: '刚刚' };
    }));
    const flow = flows.find((f) => f.id === flowId);
    setNotice(`已绑定智能体到「${flow?.name ?? flowId}」。`);
  };

  return (
    <div className="workflow-page mx-auto w-full max-w-[1440px] space-y-6 p-5 pb-16 sm:p-8 xl:px-10">
      <section className="relative overflow-hidden rounded-[28px] border border-[var(--border)] bg-[var(--surface-1)] px-6 py-7 shadow-[var(--shadow-sm)] sm:px-8">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden rounded-[28px]">
          <div className="absolute right-0 top-0 h-full w-1/2 bg-[radial-gradient(circle_at_top_right,rgba(245,158,11,0.12),transparent_68%)]" />
        </div>
        <div className="relative flex flex-col justify-between gap-6 xl:flex-row xl:items-end">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-amber-700 dark:text-amber-300">ADMIN / 工作流管理</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">把可复用的工作流设计出来。</h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--text-muted)]">
              用画布把触发器、工具调用、条件分支、结束节点串成可执行的工作流;可发布为工具,被任意智能体按需调用。
            </p>
          </div>
          <div className="flex items-center gap-1.5 self-end text-[10px] text-[var(--text-muted)]">
            <Boxes className="h-3 w-3" />{flows.length} 个工作流 · 已发布 {counts.published}
          </div>
        </div>
      </section>

      {notice && (
        <NoticeBanner tone="amber" onClose={() => setNotice('')}>
          {notice}
        </NoticeBanner>
      )}

      <section aria-label="子模块导航" className="flex flex-wrap items-center gap-2 overflow-x-auto pb-1">
        {TABS.map((t) => {
          const count = countForTab(t.id, flows);
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              aria-pressed={tab === t.id}
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-4 py-2 text-xs font-semibold transition ${tab === t.id ? 'border-[var(--brand)] bg-[var(--brand-light)] text-[var(--brand)]' : 'border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--brand)] hover:text-[var(--brand)]'}`}
            >
              {t.label}
              <span className="rounded bg-[var(--bg-elevated)] px-1.5 py-0.5 text-[10px] tabular-nums">{count}</span>
            </button>
          );
        })}
      </section>

      {tab === 'overview' && (
        <OverviewTab
          flows={visibleFlows}
          allFlows={flows}
          search={search}
          setSearch={setSearch}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          onView={goView}
          onEdit={goEdit}
          onCopy={copyFlow}
          onPublish={openPublish}
          onRetire={retireFlow}
          onCreate={goCreate}
          counts={counts}
        />
      )}
      {tab === 'nodes' && <NodeLibraryTab flows={flows} onAddToFlow={addNodeToFlow} />}
      {tab === 'integrations' && <IntegrationsTab flows={flows} onBindAgent={bindAgentToFlow} />}
      {tab === 'publish' && (
        <PublishTab flows={flows} onVersions={(f) => { setVersionFlow(f); setVersionOpen(true); }} onPublish={openPublish} />
      )}
      {tab === 'versions' && <VersionsTab flows={flows} />}

      <PublishAsToolModal
        open={publishOpen}
        onClose={() => setPublishOpen(false)}
        flow={publishFlow}
        toolId={toolId} setToolId={setToolId}
        toolDesc={toolDesc} setToolDesc={setToolDesc}
        toolInput={toolInput} setToolInput={setToolInput}
        toolOutput={toolOutput} setToolOutput={setToolOutput}
        onSubmit={submitPublish}
      />

      <FlowVersionModal
        open={versionOpen}
        onClose={() => setVersionOpen(false)}
        flow={versionFlow}
      />

      <NodeConfigModal
        open={nodeConfigOpen}
        onClose={() => setNodeConfigOpen(false)}
        node={nodeConfigTarget}
        onSave={(updated) => {
          setFlows((prev) => prev.map((f) => {
            const hasNode = f.initialNodes.some((n) => n.id === updated.id);
            if (!hasNode) return f;
            return {
              ...f, initialNodes: f.initialNodes.map((n) => n.id === updated.id ? updated : n),
              updatedAt: '刚刚',
            };
          }));
          setNotice(`已保存节点「${updated.data.label}」的配置。`);
        }}
      />
    </div>
  );
}