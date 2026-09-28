/**
 * 管理侧「智能体工作台」主面板 — Hero + Tab + 筛选 + 卡片网格 + 批量工具栏 + Drawer + 向导/导入/导出/删除/对比/沉浸式工作区。
 */
import { useMemo, useState } from 'react';
import { Activity, AlertTriangle, Bot, ChevronDown, Filter, GitBranch, Maximize2, Plus, Search, Sparkles, Star, TrendingUp, Upload, X } from 'lucide-react';
import type {
  AgentEntry, AgentFilters, DrawerPanel, EvalCase, ImportExtension, ImportRow, ExportField, ExportFormat, ExportScope, PromptKey, Status, SortKey, TabId, VisibleScope, WizardDraft,
} from '@/api/admin/agents/schema';
import type { DeletePayload } from './components/DeleteConfirmModal';
import {
  useAgentsList, useAgentVersions, useBatchSetStatus, useCreateAgent, useDeleteAgents, useDiffVersions, useExportAgents,
  useImportAgents, useRunEval, useToggleStar, useUpdateAgent,
} from '@/api/admin/agents';
import {
  buildPrompts, getLifecycleMetrics, mockAgents, SAMPLE_IMPORT, SAMPLE_IMPORT_ZIP,
} from '@/mock/admin/agents.fixtures';
import { AgentCard } from './components/AgentCard';
import { BatchToolbar } from './components/DrawerSidebar';
import { DeleteConfirmModal } from './components/DeleteConfirmModal';
import { DiffDialog, type DiffPair } from './components/DiffDialog';
import { DrawerPanelBasic, DrawerPanelEvaluation, DrawerPanelFlow, DrawerPanelKnowledge, DrawerPanelMemory, DrawerPanelPermission, DrawerPanelPrompt, DrawerPanelSkills, DrawerPanelVersions } from './components/DrawerPanels';
import { DrawerSidebar } from './components/DrawerSidebar';
import { ExportDialog, ImportDialog } from './components/ImportExportModals';
import { FullscreenWorkspace } from './components/FullscreenWorkspace';
import { EvalProgress } from './components/Primitives';
import { INITIAL_WIZARD_DRAFT, SCENES, SORT_OPTIONS, TABS, statusBadge, toneClass } from './components/constants';
import { DEFAULT_EXPORT_FIELDS } from './components/constants';
import { WizardModal } from './components/WizardModal';

export default function AgentsPage() {
  const [filters, setFilters] = useState<AgentFilters>({ tab: 'all', sortKey: 'calls', search: '', scene: '全部场景' });
  const { data: list = mockAgents, isLoading } = useAgentsList(filters);
  const createAgent = useCreateAgent();
  const updateAgent = useUpdateAgent();
  const deleteAgents = useDeleteAgents();
  const batchStatus = useBatchSetStatus();
  const toggleStar = useToggleStar();
  const runEval = useRunEval();
  const diffVersions = useDiffVersions();
  const importAgents = useImportAgents();
  const exportAgents = useExportAgents();

  const metrics = useMemo(() => getLifecycleMetrics(list), [list]);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [menuOpenFor, setMenuOpenFor] = useState<string | null>(null);

  const [drawerAgent, setDrawerAgent] = useState<AgentEntry | null>(null);
  const [drawerPanel, setDrawerPanel] = useState<DrawerPanel>('basic');
  const [drawerPromptDoc, setDrawerPromptDoc] = useState<PromptKey>('prompt');

  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3 | 4>(1);
  const [wizardDraft, setWizardDraft] = useState<WizardDraft>(INITIAL_WIZARD_DRAFT);

  const [importOpen, setImportOpen] = useState(false);
  const [importStep, setImportStep] = useState<1 | 2 | 3>(1);
  const [importFileName, setImportFileName] = useState('');
  const [importExtension, setImportExtension] = useState<ImportExtension>('json');
  const [importPreview, setImportPreview] = useState<ImportRow[]>([]);

  const [exportOpen, setExportOpen] = useState(false);
  const [exportScope, setExportScope] = useState<ExportScope>('all');
  const [exportFormat, setExportFormat] = useState<ExportFormat>('json');
  const [exportFields, setExportFields] = useState<Record<ExportField, boolean>>(DEFAULT_EXPORT_FIELDS);

  const [deletePayload, setDeletePayload] = useState<DeletePayload | null>(null);

  const [diffOpen, setDiffOpen] = useState(false);
  const [diffPair, setDiffPair] = useState<DiffPair>({ base: { id: 'v3.1', label: 'v3.1' }, target: { id: 'v3.2', label: 'v3.2' } });
  const [diffBase, setDiffBase] = useState<Record<PromptKey, string>>({} as Record<PromptKey, string>);
  const [diffTarget, setDiffTarget] = useState<Record<PromptKey, string>>({} as Record<PromptKey, string>);

  const [fullscreenAgent, setFullscreenAgent] = useState<AgentEntry | null>(null);

  const [evalRunning, setEvalRunning] = useState<{ id: string; progress: number } | null>(null);
  const [lastEvalResult, setLastEvalResult] = useState<{ id: string; cases: EvalCase[] } | null>(null);

  const filteredList = useMemo(() => {
    const search = (filters.search ?? '').trim().toLowerCase();
    const scene = filters.scene ?? '全部场景';
    const tab = filters.tab ?? 'all';
    return list.filter((agent) => {
      if (tab !== 'all' && agent.status !== tab) return false;
      if (scene !== '全部场景' && !agent.category.startsWith(scene)) return false;
      if (search.length > 0 && !`${agent.name}${agent.description}${agent.category}${agent.owner}`.toLowerCase().includes(search)) return false;
      return true;
    }).sort((a, b) => {
      const sortKey: SortKey = filters.sortKey ?? 'calls';
      switch (sortKey) {
        case 'calls': return b.calls - a.calls;
        case 'rating': return b.rating - a.rating;
        case 'name': return a.name.localeCompare(b.name, 'zh-Hans-CN');
        case 'updated':
        default: return 0;
      }
    });
  }, [list, filters]);

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };
  const handleClearSelection = () => setSelectedIds([]);

  const handleBatchPublish = () => batchStatus.mutate({ ids: selectedIds, status: 'published' });
  const handleBatchRetire = () => batchStatus.mutate({ ids: selectedIds, status: 'retired' });
  const handleBatchDelete = () => setDeletePayload({ kind: 'bulk', agentNames: selectedIds.map((id) => list.find((a) => a.id === id)?.name ?? id) });
  const handleBatchExport = () => {
    setExportScope('selected');
    setExportOpen(true);
  };

  const handleToggleStar = (id: string) => {
    const agent = list.find((a) => a.id === id);
    if (!agent) return;
    toggleStar.mutate({ id, starred: !agent.starred });
  };

  const handleEdit = (agent: AgentEntry) => {
    setDrawerAgent(agent);
    setDrawerPanel('basic');
  };
  const handleDuplicate = (agent: AgentEntry) => {
    createAgent.mutate({
      ...agent,
      id: `${agent.id}-copy`,
      name: `${agent.name} · 副本`,
      status: 'draft',
      calls: 0,
      versions: [{ version: 'v0.1', publisher: '我', releasedAt: new Date().toISOString().slice(0, 10), current: true }],
    });
  };
  const handleExportOne = (agent: AgentEntry) => {
    setSelectedIds([agent.id]);
    setExportScope('selected');
    setExportOpen(true);
  };
  const handleRequestDelete = (agent: AgentEntry) => setDeletePayload({ kind: 'single', agentName: agent.name });

  const handleSelectCard = (agent: AgentEntry) => {
    setDrawerAgent(agent);
    setDrawerPanel('basic');
  };

  const handleCreateAgent = () => {
    createAgent.mutate({
      id: `a-${Date.now()}`,
      name: wizardDraft.name,
      description: wizardDraft.description,
      category: wizardDraft.category,
      owner: wizardDraft.owner,
      tone: 'info',
      status: 'draft',
      version: 'v0.1',
      tools: wizardDraft.defaultSkills,
      visibleScope: [wizardDraft.visibleScope] as VisibleScope[],
      dataAccess: '基础数据',
      prompts: buildPrompts(wizardDraft.name, wizardDraft.category, wizardDraft.owner),
      knowledgeRefs: [],
      memoryPolicy: { enabled: false, retentionDays: 30, scope: 'user', autoSummarize: false },
      flowRefs: [],
    });
    setWizardOpen(false);
    setWizardStep(1);
    setWizardDraft(INITIAL_WIZARD_DRAFT);
  };

  const handleOpenDiff = async (agent: AgentEntry) => {
    const { data: versionsResp } = useAgentVersions(agent.id);
    const versions = versionsResp?.versions ?? agent.versions;
    if (versions.length < 2) return;
    const previous = versions.find((v) => !v.current) ?? versions[versions.length - 1];
    const current = versions.find((v) => v.current) ?? versions[0];
    const resp = await diffVersions.mutateAsync({
      agentId: agent.id,
      leftVersion: previous.version,
      rightVersion: current.version,
    });
    setDiffPair({ base: { id: previous.version, label: previous.version }, target: { id: current.version, label: current.version } });
    setDiffBase(resp.leftPrompts);
    setDiffTarget(resp.rightPrompts);
    setDiffOpen(true);
  };

  const handleRunEval = async (agent: AgentEntry) => {
    setEvalRunning({ id: agent.id, progress: 0 });
    const timer = window.setInterval(() => {
      setEvalRunning((prev) => prev ? { ...prev, progress: Math.min(prev.progress + 12, 96) } : null);
    }, 220);
    const resp = await runEval.mutateAsync({ id: agent.id });
    window.clearInterval(timer);
    setEvalRunning(null);
    setLastEvalResult({ id: agent.id, cases: resp.cases });
  };

  const handleConfirmDelete = () => {
    if (!deletePayload) return;
    const ids = deletePayload.kind === 'single'
      ? list.filter((a) => a.name === deletePayload.agentName).map((a) => a.id)
      : selectedIds;
    deleteAgents.mutate({ ids });
    setDeletePayload(null);
    setSelectedIds([]);
  };

  const handleImportFile = (file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase() as ImportExtension ?? 'json';
    setImportFileName(file.name);
    setImportExtension(ext);
    setImportPreview(SAMPLE_IMPORT);
    setImportStep(2);
  };
  const handleLoadSample = (ext: ImportExtension) => {
    setImportExtension(ext);
    setImportFileName(`agents-sample.${ext}`);
    setImportPreview(ext === 'zip' ? SAMPLE_IMPORT_ZIP : SAMPLE_IMPORT);
    setImportStep(2);
  };
  const handleConfirmImport = (force: boolean) => {
    importAgents.mutate({ rows: importPreview, force });
    setImportOpen(false);
    setImportStep(1);
    setImportPreview([]);
    setImportFileName('');
  };

  const handleConfirmExport = () => {
    const enabledFields = (Object.keys(exportFields) as ExportField[]).filter((k) => exportFields[k]);
    exportAgents.mutate({
      scope: exportScope,
      format: exportFormat,
      fields: enabledFields,
      ids: exportScope === 'selected' ? selectedIds : undefined,
    });
    setExportOpen(false);
  };

  const handleOpenFullscreen = (agent: AgentEntry) => {
    setFullscreenAgent(agent);
    setDrawerPanel('basic');
  };

  const countsForExport = { all: list.length, tab: filteredList.length, selected: selectedIds.length };

  return (
    <div className="mx-auto w-full max-w-[1440px] space-y-6 p-5 pb-16 sm:p-8 xl:px-10">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl border border-[var(--border)] bg-gradient-to-br from-[var(--brand-light)] via-white to-white p-6 shadow-[var(--shadow-sm)] dark:from-[var(--brand)]/10 dark:via-[var(--surface-1)] dark:to-[var(--surface-1)] sm:p-8">
        <div className="relative z-10 grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--brand)]">智能体工作台</p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">让智能体成为可治理、可观测的能力。</h1>
            <p className="mt-2 max-w-2xl text-sm text-[var(--text-secondary)]">统一管理 Prompt、技能、知识、流程与权限;支持版本对比、批量发布、灰度评估与全量导入导出。</p>
            <div className="mt-5 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setWizardOpen(true)}
                className="inline-flex items-center gap-2 rounded-xl bg-[var(--brand)] px-4 py-2 text-xs font-semibold text-white shadow-[var(--shadow-sm)] hover:bg-[var(--brand-hover)]"
              >
                <Plus className="h-3.5 w-3.5" />新建智能体
              </button>
              <button
                type="button"
                onClick={() => { setImportOpen(true); setImportStep(1); setImportPreview([]); setImportFileName(''); }}
                className="inline-flex items-center gap-2 rounded-xl border border-[var(--brand)] bg-white px-4 py-2 text-xs font-semibold text-[var(--brand)] hover:bg-[var(--brand-light)] dark:bg-[var(--surface-1)]"
              >
                <Upload className="h-3.5 w-3.5" />批量导入
              </button>
              <button
                type="button"
                onClick={() => setExportOpen(true)}
                className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] bg-white px-4 py-2 text-xs font-semibold text-[var(--text-secondary)] hover:border-[var(--brand)] hover:text-[var(--brand)] dark:bg-[var(--surface-1)]"
              >
                导出全部
              </button>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3 sm:gap-4">
            <div className="rounded-2xl border border-[var(--border)] bg-white/80 px-4 py-3 text-center backdrop-blur dark:bg-[var(--surface-1)]">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">已发布</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums text-[var(--success)]">{metrics.published}</p>
            </div>
            <div className="rounded-2xl border border-[var(--border)] bg-white/80 px-4 py-3 text-center backdrop-blur dark:bg-[var(--surface-1)]">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">灰度中</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums text-[var(--info)]">{metrics.graying}</p>
            </div>
            <div className="rounded-2xl border border-[var(--border)] bg-white/80 px-4 py-3 text-center backdrop-blur dark:bg-[var(--surface-1)]">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">总调用</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums">{metrics.totalCalls >= 10000 ? `${(metrics.totalCalls / 10000).toFixed(1)}万` : metrics.totalCalls}</p>
            </div>
          </div>
        </div>
        <div className="absolute -right-12 -top-12 h-48 w-48 rounded-full bg-[var(--brand)]/10 blur-3xl" />
      </section>

      {/* Batch Toolbar */}
      {selectedIds.length > 0 && (
        <BatchToolbar
          count={selectedIds.length}
          onClear={handleClearSelection}
          onBatchPublish={handleBatchPublish}
          onBatchRetire={handleBatchRetire}
          onBatchDelete={handleBatchDelete}
          onBatchExport={() => { setExportScope('selected'); setExportOpen(true); }}
        />
      )}

      {/* Tab + Filter Bar */}
      <section className="flex flex-wrap items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-3">
        <nav aria-label="状态过滤" className="flex flex-wrap gap-1">
          {TABS.map((tab: { id: TabId; label: string }) => {
            const active = (filters.tab ?? 'all') === tab.id;
            const count = tab.id === 'all' ? list.length : list.filter((a) => a.status === tab.id).length;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilters((f) => ({ ...f, tab: tab.id }))}
                aria-pressed={active}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${active ? 'bg-[var(--brand-light)] text-[var(--brand)]' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'}`}
              >
                {tab.label}
                <span className="rounded bg-[var(--bg-elevated)] px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-[var(--text-muted)]">{count}</span>
              </button>
            );
          })}
        </nav>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              type="text"
              placeholder="搜索名称、描述、负责人"
              value={filters.search ?? ''}
              onChange={(event) => setFilters((f) => ({ ...f, search: event.target.value }))}
              className="h-9 w-56 rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] pl-8 pr-3 text-xs outline-none focus:border-[var(--brand)]"
            />
          </div>

          <label className="flex items-center gap-1 rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] px-2.5 py-1.5 text-xs">
            <Filter className="h-3.5 w-3.5 text-[var(--text-muted)]" />
            <select
              value={filters.scene ?? '全部场景'}
              onChange={(event) => setFilters((f: AgentFilters) => ({ ...f, scene: event.target.value }))}
              className="bg-transparent text-xs font-medium outline-none"
            >
              {SCENES.map((scene: string) => <option key={scene} value={scene}>{scene}</option>)}
            </select>
            <ChevronDown className="h-3 w-3 text-[var(--text-muted)]" />
          </label>

          <label className="flex items-center gap-1 rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] px-2.5 py-1.5 text-xs">
            <span className="text-[var(--text-muted)]">排序</span>
            <select
              value={filters.sortKey ?? 'calls'}
              onChange={(event) => setFilters((f: AgentFilters) => ({ ...f, sortKey: event.target.value as SortKey }))}
              className="bg-transparent text-xs font-medium outline-none"
            >
              {SORT_OPTIONS.map((opt: { id: SortKey; label: string }) => <option key={opt.id} value={opt.id}>{opt.label}</option>)}
            </select>
            <ChevronDown className="h-3 w-3 text-[var(--text-muted)]" />
          </label>
        </div>
      </section>

      {/* Cards Grid */}
      <section aria-label="智能体列表" className="space-y-3">
        <header className="flex items-center justify-between">
          <p className="text-xs text-[var(--text-muted)]">
            {isLoading ? '加载中...' : <>共 <span className="font-semibold tabular-nums text-[var(--text)]">{filteredList.length}</span> 个智能体 · 已选 <span className="font-semibold tabular-nums text-[var(--brand)]">{selectedIds.length}</span></>}
          </p>
          <div className="flex items-center gap-1 text-[11px] text-[var(--text-muted)]">
            <Activity className="h-3 w-3" />实时同步 5s 前
          </div>
        </header>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filteredList.map((agent) => (
            <AgentCard
              key={agent.id}
              agent={agent}
              onSelect={handleSelectCard}
              onToggleStar={handleToggleStar}
              selected={selectedIds.includes(agent.id)}
              onToggleSelect={handleToggleSelect}
              menuOpen={menuOpenFor === agent.id}
              onToggleMenu={setMenuOpenFor}
              onEdit={handleEdit}
              onDuplicate={handleDuplicate}
              onExportOne={handleExportOne}
              onRequestDelete={handleRequestDelete}
            />
          ))}
        </div>
      </section>

      {/* Drawer */}
      {drawerAgent && (
        <div role="dialog" aria-modal="true" aria-label={`${drawerAgent.name} 详情`} className="fixed inset-0 z-40 flex">
          <button type="button" aria-label="关闭 Drawer" className="flex-1 bg-black/40 backdrop-blur-sm" onClick={() => setDrawerAgent(null)} />
          <aside className="flex h-full w-full max-w-3xl flex-col bg-[var(--surface-1)] shadow-2xl">
            <header className="flex shrink-0 items-start justify-between border-b border-[var(--border)] px-5 py-4">
              <div className="flex items-start gap-3">
                <span className={`grid h-12 w-12 place-items-center rounded-xl ${toneClass[drawerAgent.tone]}`}>
                  <Bot className="h-6 w-6" />
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-semibold tracking-tight">{drawerAgent.name}</h2>
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${statusBadge[drawerAgent.status].className}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${statusBadge[drawerAgent.status].dot}`} />
                      {statusBadge[drawerAgent.status].label}
                    </span>
                  </div>
                  <p className="mt-0.5 text-[11px] text-[var(--text-muted)]">{drawerAgent.category} · {drawerAgent.owner} · {drawerAgent.version}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => { setDrawerAgent(null); handleOpenFullscreen(drawerAgent); }}
                  className="inline-flex items-center gap-1 rounded-lg border border-[var(--border)] px-2.5 py-1.5 text-[11px] font-semibold hover:border-[var(--brand)]"
                >
                  <Maximize2 className="h-3 w-3" />沉浸式
                </button>
                <button
                  type="button"
                  aria-label="关闭"
                  onClick={() => setDrawerAgent(null)}
                  className="grid h-8 w-8 place-items-center rounded-lg text-[var(--text-muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--text)]"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </header>

            <div className="flex min-h-0 flex-1">
              <DrawerSidebar panel={drawerPanel} setPanel={setDrawerPanel} />
              <main className="min-w-0 flex-1 overflow-auto bg-[var(--bg-app)] p-5">
                {drawerPanel === 'basic' && <DrawerPanelBasic draft={drawerAgent} onChange={(patch: Partial<AgentEntry>) => updateAgent.mutate({ id: drawerAgent.id, patch })} />}
                {drawerPanel === 'prompt' && <DrawerPanelPrompt draft={drawerAgent} promptDoc={drawerPromptDoc} setPromptDoc={setDrawerPromptDoc} onChange={(patch: Partial<import('@/api/admin/agents/schema').PromptDocs>) => updateAgent.mutate({ id: drawerAgent.id, patch: { prompts: { ...drawerAgent.prompts, ...patch } } })} />}
                {drawerPanel === 'skills' && <DrawerPanelSkills draft={drawerAgent} />}
                {drawerPanel === 'knowledge' && <DrawerPanelKnowledge draft={drawerAgent} onChange={(refs: import('@/api/admin/agents/schema').KnowledgeRef[]) => updateAgent.mutate({ id: drawerAgent.id, patch: { knowledgeRefs: refs } })} />}
                {drawerPanel === 'memory' && <DrawerPanelMemory draft={drawerAgent} onChange={(memoryPolicy: import('@/api/admin/agents/schema').MemoryPolicy) => updateAgent.mutate({ id: drawerAgent.id, patch: { memoryPolicy } })} />}
                {drawerPanel === 'flow' && <DrawerPanelFlow draft={drawerAgent} onChange={(flowRefs: import('@/api/admin/agents/schema').FlowRef[]) => updateAgent.mutate({ id: drawerAgent.id, patch: { flowRefs } })} />}
                {drawerPanel === 'versions' && <DrawerPanelVersions draft={drawerAgent} onOpenDiff={() => handleOpenDiff(drawerAgent)} />}
                {drawerPanel === 'evaluation' && (
                  <DrawerPanelEvaluation
                    draft={drawerAgent}
                    isRunning={evalRunning?.id === drawerAgent.id}
                    progress={evalRunning?.id === drawerAgent.id ? evalRunning.progress : undefined}
                    lastResult={lastEvalResult?.id === drawerAgent.id ? lastEvalResult.cases : undefined}
                    onRunEval={() => handleRunEval(drawerAgent)}
                  />
                )}
                {drawerPanel === 'permission' && <DrawerPanelPermission draft={drawerAgent} />}
              </main>
            </div>

            <footer className="flex shrink-0 items-center justify-between border-t border-[var(--border)] bg-[var(--surface-1)] px-5 py-2.5 text-[11px] text-[var(--text-muted)]">
              <span>变更后自动暂存,可在「版本」面板提交审核。</span>
              <span>{drawerAgent.versions.length} 个版本 · 最近更新 {drawerAgent.lastUpdate}</span>
            </footer>
          </aside>
        </div>
      )}

      {/* Wizard */}
      <WizardModal
        open={wizardOpen}
        onClose={() => setWizardOpen(false)}
        step={wizardStep}
        setStep={setWizardStep}
        draft={wizardDraft}
        setDraft={setWizardDraft}
        onCreate={handleCreateAgent}
      />

      {/* Import Dialog */}
      <ImportDialog
        open={importOpen}
        onClose={() => setImportOpen(false)}
        step={importStep}
        setStep={setImportStep}
        fileName={importFileName}
        preview={importPreview}
        extension={importExtension}
        onLoadSample={handleLoadSample}
        onImportFile={handleImportFile}
        onConfirm={handleConfirmImport}
      />

      {/* Export Dialog */}
      <ExportDialog
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        scope={exportScope}
        setScope={setExportScope}
        format={exportFormat}
        setFormat={setExportFormat}
        fields={exportFields}
        setFields={setExportFields}
        counts={countsForExport}
        onConfirm={handleConfirmExport}
      />

      {/* Delete Confirm */}
      <DeleteConfirmModal
        open={deletePayload !== null}
        payload={deletePayload}
        onClose={() => setDeletePayload(null)}
        onConfirm={handleConfirmDelete}
      />

      {/* Diff Dialog */}
      <DiffDialog
        open={diffOpen}
        onClose={() => setDiffOpen(false)}
        pair={diffPair}
        baseContent={diffBase}
        targetContent={diffTarget}
        onChangePair={setDiffPair}
      />

      {/* Fullscreen Workspace */}
      {fullscreenAgent && (
        <FullscreenWorkspace
          agent={fullscreenAgent}
          panel={drawerPanel}
          setPanel={setDrawerPanel}
          onExit={() => setFullscreenAgent(null)}
        />
      )}

      {/* Eval Progress overlay */}
      {evalRunning && (
        <div className="fixed bottom-6 right-6 z-40 w-72 rounded-2xl border border-[var(--brand)] bg-[var(--surface-1)] p-4 shadow-lg">
          <div className="flex items-center gap-2 text-xs font-semibold text-[var(--brand)]">
            <Sparkles className="h-3.5 w-3.5" />正在评测 {list.find((a) => a.id === evalRunning.id)?.name}
          </div>
          <EvalProgress progress={evalRunning.progress} />
        </div>
      )}

      {/* Empty / callout */}
      {!isLoading && filteredList.length === 0 && (
        <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface-1)] p-8 text-center">
          <AlertTriangle className="mx-auto h-6 w-6 text-[var(--warning)]" />
          <p className="mt-3 text-sm font-semibold">没有匹配的智能体</p>
          <p className="mt-1 text-xs text-[var(--text-muted)]">尝试切换 Tab、清空筛选,或新建一个智能体。</p>
        </div>
      )}
    </div>
  );
}

export { Star, GitBranch, TrendingUp };