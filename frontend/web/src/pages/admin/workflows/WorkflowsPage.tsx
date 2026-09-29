/**
 * WorkflowsPage — 工作流管理 list hub(纯列表,不再持有内嵌 editor 状态)。
 *
 * 4 tab(状态过滤器):全部 / 草稿 / 已发布 / 已下线。
 * 3 入口跳转:
 * - 新建 → /admin/workflows/new(WorkflowCreatePage)
 * - 查看 → /admin/workflows/:id(WorkflowDetailPage 只读)
 * - 编辑 → /admin/workflows/:id?edit=1(WorkflowDetailPage 编辑模式)
 *
 * 列表内 modal:发布为工具(FlowCard 「发布为工具」触发)。
 */
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search } from 'lucide-react';
import { NoticeBanner } from '@/components/feedback/NoticeBanner';
import { useWorkflows } from '@/api/admin/workflows';
import type { Flow, FlowNodeData, NodeKind, WorkflowTabId } from '@/api/admin/workflows/schema';
import type { Node } from 'reactflow';
import { TABS, countForTab, uid, NODE_TEMPLATES } from './components/constants';
import { OverviewTab } from './components/tabs/OverviewTab';
import { PublishAsToolModal } from './components/PublishAsToolModal';

export default function WorkflowsPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<WorkflowTabId>('all');
  const remoteFlows = useWorkflows().data ?? [];
  const [flows, setFlows] = useState<Flow[]>(remoteFlows);
  const [notice, setNotice] = useState('');
  const [search, setSearch] = useState('');

  const [publishOpen, setPublishOpen] = useState(false);
  const [publishFlow, setPublishFlow] = useState<Flow | null>(null);
  const [toolId, setToolId] = useState('');
  const [toolDesc, setToolDesc] = useState('');
  const [toolInput, setToolInput] = useState('query:string:true');
  const [toolOutput, setToolOutput] = useState('result:string:true');

  // 用 effects 同步远端数据(防止 stale state)
  useEffect(() => {
    setFlows(remoteFlows);
  }, [remoteFlows]);

  const visibleFlows = useMemo(() => {
    const base = tab === 'all' ? flows : flows.filter((f) => f.status === tab);
    if (!search.trim()) return base;
    const q = search.trim().toLowerCase();
    return base.filter((f) => `${f.name} ${f.description} ${f.owner} ${f.scene}`.toLowerCase().includes(q));
  }, [flows, tab, search]);

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

  // ───────────── 列表侧添加节点(FlowCard 「+ 添加节点」) ─────────────
  const addNodeToFlow = (flow: Flow, kind: NodeKind) => {
    const template = NODE_TEMPLATES.find((t) => t.kind === kind);
    if (!template) return;
    const id = uid('n');
    const node: Node<FlowNodeData> = {
      id, type: 'flowNode',
      position: { x: 200 + Math.random() * 200, y: 80 + Math.random() * 200 },
      data: { label: template.label, subtitle: template.subtitle, kind: template.kind, config: { ...template.defaults } },
    };
    setFlows((prev) => prev.map((f) => f.id === flow.id ? {
      ...f, initialNodes: [...f.initialNodes, node], updatedAt: '刚刚',
    } : f));
    setNotice(`已将「${template.label}」节点加入「${flow.name}」画布,可在「编辑」中调整位置。`);
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
        </div>
      </section>

      {notice && (
        <NoticeBanner tone="amber" onClose={() => setNotice('')}>
          {notice}
        </NoticeBanner>
      )}

      <nav aria-label="子模块导航" className="flex flex-wrap items-center gap-1 border-b border-[var(--border)]">
        {TABS.map((t) => {
          const count = countForTab(t.id, flows);
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              aria-pressed={active}
              className={`inline-flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2.5 text-xs font-semibold transition ${active ? 'border-[var(--brand)] text-[var(--brand)]' : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--brand)]'}`}
            >
              {t.label}
              <span className={`rounded px-1.5 py-0.5 text-[10px] tabular-nums ${active ? 'bg-[var(--brand-light)] text-[var(--brand)]' : 'bg-[var(--bg-elevated)] text-[var(--text-muted)]'}`}>{count}</span>
            </button>
          );
        })}
        <div className="ml-auto flex flex-wrap items-center gap-2 pb-1.5">
          <div className="relative w-full sm:w-64">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="搜索工作流名 / 团队 / 场景"
              className="h-9 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-1)] pl-10 pr-3 text-xs outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--brand)]"
            />
          </div>
          <button
            type="button"
            onClick={goCreate}
            className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-xl bg-[var(--brand)] px-4 text-xs font-semibold text-white hover:bg-[var(--brand-hover)]"
          >
            <Plus className="h-4 w-4" />
            新建工作流
          </button>
        </div>
      </nav>

      <OverviewTab
        flows={visibleFlows}
        statusTab={tab}
        onView={goView}
        onEdit={goEdit}
        onCopy={copyFlow}
        onPublish={openPublish}
        onRetire={retireFlow}
        onAddNode={addNodeToFlow}
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
    </div>
  );
}