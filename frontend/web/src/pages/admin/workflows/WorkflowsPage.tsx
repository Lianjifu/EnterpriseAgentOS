/**
 * WorkflowsPage — 流程管理 orchestrator(list + editor 视图, 5 tab + 4 modal + 1 drawer)。
 */
import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Boxes, CirclePlay, Plus } from 'lucide-react';
import { NoticeBanner } from '@/components/feedback/NoticeBanner';
import { useWorkflows, useWorkflowStats } from '@/api/admin/workflows';
import type {
  Flow, NodeTemplate, TriggerType, WorkflowTabId, WorkflowViewMode,
} from '@/api/admin/workflows/schema';
import type { Node } from 'reactflow';
import type { FlowNodeData } from '@/api/admin/workflows/schema';
import { TABS, countForTab, uid } from './components/constants';
import { OverviewTab } from './components/tabs/OverviewTab';
import { NodeTypeTab } from './components/tabs/NodeTypeTab';
import { PublishTab } from './components/tabs/PublishTab';
import { FlowEditor } from './components/FlowEditor';
import { FlowDetailDrawer } from './components/FlowDetailDrawer';
import { CreateFlowWizard } from './components/CreateFlowWizard';
import { PublishAsToolModal } from './components/PublishAsToolModal';
import { FlowVersionModal } from './components/FlowVersionModal';
import { NodeConfigModal } from './components/NodeConfigModal';

export default function WorkflowsPage() {
  const [view, setView] = useState<WorkflowViewMode>('list');
  const [tab, setTab] = useState<WorkflowTabId>('overview');
  const remoteFlows = useWorkflows().data ?? [];
  const [flows, setFlows] = useState<Flow[]>(remoteFlows);
  const [activeFlowId, setActiveFlowId] = useState<string | null>(null);
  const [notice, setNotice] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<Flow['status'] | 'all'>('all');

  const [createOpen, setCreateOpen] = useState(false);
  const [createStep, setCreateStep] = useState(1);
  const [draftName, setDraftName] = useState('');
  const [draftDesc, setDraftDesc] = useState('');
  const [draftTrigger, setDraftTrigger] = useState<TriggerType>('消息触发');
  const [draftTemplate, setDraftTemplate] = useState<string>('blank');

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

  const [detailFlow, setDetailFlow] = useState<Flow | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  useEffect(() => setFlows(remoteFlows), [remoteFlows]);

  const activeFlow = useMemo(
    () => flows.find((f) => f.id === activeFlowId) || null,
    [flows, activeFlowId],
  );

  const counts = useWorkflowStats(flows);

  const visibleFlows = useMemo(() => flows.filter((f) =>
    (statusFilter === 'all' || f.status === statusFilter) &&
    `${f.name} ${f.description} ${f.owner} ${f.scene}`.toLowerCase().includes(search.trim().toLowerCase()),
  ), [flows, statusFilter, search]);

  const openCreate = () => {
    setCreateStep(1); setDraftName(''); setDraftDesc(''); setDraftTrigger('消息触发'); setDraftTemplate('blank');
    setCreateOpen(true);
  };

  const submitCreate = () => {
    const id = uid('wf');
    const next: Flow = {
      id, name: draftName.trim() || '未命名流程', description: draftDesc.trim() || '尚未填写描述',
      owner: '当前管理员', scene: '团队协作', trigger: draftTrigger, status: 'draft', callCount: 0,
      inputs: 1, outputs: 1, createdAt: '今天', updatedAt: '刚刚', boundAgents: [],
      versions: [{ v: 'v0.1-草稿', at: '刚刚', operator: '当前管理员', note: '新建流程' }],
      initialNodes: [
        { id: 'n-trigger', type: 'flowNode', position: { x: 40, y: 120 }, data: { label: draftTrigger, subtitle: '流程入口', kind: 'trigger', config: { trigger: draftTrigger } } },
      ],
      initialEdges: [],
    };
    setFlows((prev) => [next, ...prev]);
    setActiveFlowId(id);
    setCreateOpen(false);
    setView('editor');
    setTab('overview');
    setNotice(`已新建流程「${next.name}」,可在画布上继续编排。`);
  };

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

  const enterEditor = (flow: Flow) => {
    setActiveFlowId(flow.id);
    setSelectedNodeId(null);
    setView('editor');
    setTab('overview');
  };

  const backToList = () => {
    setView('list'); setActiveFlowId(null); setSelectedNodeId(null);
  };

  const openNodeConfig = (node: Node<FlowNodeData>) => {
    setNodeConfigTarget(node); setNodeConfigOpen(true);
  };

  const addTemplateNode = (tpl: NodeTemplate) => {
    if (!activeFlow) return;
    const id = uid('n');
    const node: Node<FlowNodeData> = {
      id, type: 'flowNode',
      position: { x: 200 + Math.random() * 200, y: 80 + Math.random() * 200 },
      data: { label: tpl.label, subtitle: tpl.subtitle, kind: tpl.kind, config: { ...tpl.defaults } },
    };
    setFlows((prev) => prev.map((f) => f.id === activeFlow.id ? {
      ...f, initialNodes: [...f.initialNodes, node], updatedAt: '刚刚',
    } : f));
    setSelectedNodeId(id);
    setView('editor');
    setTab('overview');
    setNotice(`已添加${tpl.label}节点到画布。`);
  };

  return (
    <div className="workflow-page mx-auto w-full max-w-[1440px] space-y-6 p-5 pb-16 sm:p-8 xl:px-10">
      <section className="relative overflow-hidden rounded-[28px] border border-[var(--border)] bg-[var(--surface-1)] px-6 py-8 shadow-[var(--shadow-sm)] sm:px-8">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden rounded-[28px]">
          <div className="absolute right-0 top-0 h-full w-1/2 bg-[radial-gradient(circle_at_top_right,rgba(245,158,11,0.12),transparent_68%)]" />
        </div>
        <div className="relative flex flex-col justify-between gap-6 xl:flex-row xl:items-end">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-amber-700 dark:text-amber-300">ADMIN / 流程管理</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">把可复用的工作流设计出来。</h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--text-muted)]">
              用画布把触发器、工具调用、条件分支、结束节点串成可执行的流程;可发布为工具,被任意智能体按需调用。
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => view === 'editor' ? backToList() : null}
                disabled={view !== 'editor'}
                className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] px-3 text-xs font-semibold text-[var(--text-secondary)] transition hover:border-[var(--brand)] hover:text-[var(--brand)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {view === 'editor' ? <><ArrowRight className="h-3.5 w-3.5 rotate-180" />返回列表</> : <><CirclePlay className="h-3.5 w-3.5" />查看流程</>}
              </button>
              <button
                type="button"
                onClick={openCreate}
                className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-[var(--brand)] px-4 text-xs font-semibold text-white transition hover:bg-[var(--brand-hover)]"
              >
                <Plus className="h-4 w-4" />新建流程
              </button>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-[var(--text-muted)]">
              <Boxes className="h-3 w-3" />{flows.length} 个流程 · 已发布 {counts.published}
            </div>
          </div>
        </div>
      </section>

      {notice && (
        <NoticeBanner tone="amber" onClose={() => setNotice('')}>
          {notice}
        </NoticeBanner>
      )}

      {view === 'editor' && activeFlow ? (
        <FlowEditor
          flow={activeFlow}
          selectedNodeId={selectedNodeId}
          setSelectedNodeId={setSelectedNodeId}
          setFlows={setFlows}
          onOpenNodeConfig={openNodeConfig}
          onPublish={() => openPublish(activeFlow)}
          onVersions={() => { setVersionFlow(activeFlow); setVersionOpen(true); }}
          onBack={backToList}
          setNotice={setNotice}
        />
      ) : (
        <>
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
              onEnterEditor={enterEditor}
              onCopy={copyFlow}
              onPublish={openPublish}
              onRetire={retireFlow}
              onView={setDetailFlow}
              onCreate={openCreate}
              counts={counts}
            />
          )}
          {tab === 'trigger' && <NodeTypeTab type="trigger" onAddTemplate={addTemplateNode} />}
          {tab === 'action' && <NodeTypeTab type="action" onAddTemplate={addTemplateNode} />}
          {tab === 'condition' && <NodeTypeTab type="condition" onAddTemplate={addTemplateNode} />}
          {tab === 'publish' && (
            <PublishTab flows={flows} onVersions={(f) => { setVersionFlow(f); setVersionOpen(true); }} onPublish={openPublish} />
          )}
        </>
      )}

      <CreateFlowWizard
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        step={createStep}
        setStep={setCreateStep}
        name={draftName} setName={setDraftName}
        desc={draftDesc} setDesc={setDraftDesc}
        trigger={draftTrigger} setTrigger={setDraftTrigger}
        template={draftTemplate} setTemplate={setDraftTemplate}
        onSubmit={submitCreate}
      />

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
          if (!activeFlow) return;
          setFlows((prev) => prev.map((f) => f.id === activeFlow.id ? {
            ...f, initialNodes: f.initialNodes.map((n) => n.id === updated.id ? updated : n),
            updatedAt: '刚刚',
          } : f));
          setNotice(`已保存节点「${updated.data.label}」的配置。`);
        }}
      />

      <FlowDetailDrawer flow={detailFlow} onClose={() => setDetailFlow(null)} />
    </div>
  );
}