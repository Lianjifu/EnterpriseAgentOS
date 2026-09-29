/**
 * 管理侧「智能体工作台」主面板 — Hero + Tab + 筛选 + 卡片网格(分页)+ 批量工具栏 + 向导/导入/导出/删除。
 *
 * 详情查看已迁移到独立路由 /admin/agents/:id (AgentDetailPage),
 * 这里只负责列表 + 批量操作,不再内嵌 Drawer。
 */
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, AlertTriangle, ChevronDown, ChevronLeft, ChevronRight, Filter, Plus, Search, Star, Upload } from 'lucide-react';
import type {
  AgentEntry, AgentFilters, ImportExtension, ImportRow, ExportField, ExportFormat, ExportScope, SortKey, TabId,
} from '@/api/admin/agents/schema';
import type { DeletePayload } from './components/DeleteConfirmModal';
import {
  useAgentsList, useBatchSetStatus, useCreateAgent, useDeleteAgents, useExportAgents, useImportAgents, useToggleStar, useUpdateAgent,
} from '@/api/admin/agents';
import {
  buildPrompts, mockAgents, SAMPLE_IMPORT, SAMPLE_IMPORT_ZIP, toolsFromNames,
} from '@/mock/admin/agents.fixtures';
import { AgentCard } from './components/AgentCard';
import { BatchToolbar } from './components/DrawerSidebar';
import { DeleteConfirmModal } from './components/DeleteConfirmModal';
import { ExportDialog, ImportDialog } from './components/ImportExportModals';
import { SCENES, SORT_OPTIONS, TABS, DEFAULT_EXPORT_FIELDS } from './components/constants';

const PAGE_SIZE = 4;

export default function AgentsPage() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState<AgentFilters>({ tab: 'all', sortKey: 'calls', search: '', scene: '全部场景' });
  const { data: list = mockAgents, isLoading } = useAgentsList(filters);
  const createAgent = useCreateAgent();
  const updateAgent = useUpdateAgent();
  const deleteAgents = useDeleteAgents();
  const batchStatus = useBatchSetStatus();
  const toggleStar = useToggleStar();
  const importAgents = useImportAgents();
  const exportAgents = useExportAgents();

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [menuOpenFor, setMenuOpenFor] = useState<string | null>(null);

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

  const [page, setPage] = useState(1);

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

  const totalPages = Math.max(1, Math.ceil(filteredList.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pagedList = useMemo(
    () => filteredList.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE),
    [filteredList, safePage],
  );
  const pageStart = filteredList.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1;
  const pageEnd = Math.min(safePage * PAGE_SIZE, filteredList.length);

  useEffect(() => {
    setPage(1);
  }, [filters]);

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };
  const handleClearSelection = () => setSelectedIds([]);

  const handleBatchPublish = () => batchStatus.mutate({ ids: selectedIds, status: 'published' });
  const handleBatchRetire = () => batchStatus.mutate({ ids: selectedIds, status: 'retired' });
  const handleBatchDelete = () => setDeletePayload({ kind: 'bulk', agentNames: selectedIds.map((id) => list.find((a) => a.id === id)?.name ?? id) });

  const handleToggleStar = (id: string) => {
    const agent = list.find((a) => a.id === id);
    if (!agent) return;
    toggleStar.mutate({ id, starred: !agent.starred });
  };

  const handleOpenDetail = (agent: AgentEntry) => {
    navigate(`/admin/agents/${agent.id}`);
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

  const handleOpenCreate = () => navigate('/admin/agents/new');

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

  const countsForExport = { all: list.length, tab: filteredList.length, selected: selectedIds.length };

  return (
    <div className="mx-auto w-full max-w-[1440px] space-y-6 p-5 pb-16 sm:p-8 xl:px-6">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl border border-[var(--border)] bg-gradient-to-br from-[var(--brand-light)] via-white to-white p-6 shadow-[var(--shadow-sm)] dark:from-[var(--brand)]/10 dark:via-[var(--surface-1)] dark:to-[var(--surface-1)] sm:p-8">
        <div className="relative z-10">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--brand)]">智能体工作台</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">让智能体成为可治理、可观测的能力。</h1>
          <p className="mt-2 max-w-2xl text-sm text-[var(--text-secondary)]">统一管理 Prompt、技能、知识、工作流与权限;支持版本对比、批量发布、灰度评估与全量导入导出。</p>
          <div className="mt-5 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleOpenCreate}
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
      <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-3">
        <nav aria-label="状态过滤" className="flex flex-wrap items-center gap-1 border-b border-[var(--border)] pb-1">
          {TABS.map((tab: { id: TabId; label: string }) => {
            const active = (filters.tab ?? 'all') === tab.id;
            const count = tab.id === 'all' ? list.length : list.filter((a) => a.status === tab.id).length;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilters((f) => ({ ...f, tab: tab.id }))}
                aria-pressed={active}
                className={`inline-flex items-center gap-1.5 border-b-2 px-3 py-2 text-xs font-semibold transition ${active ? 'border-[var(--brand)] text-[var(--brand)]' : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--brand)]'}`}
              >
                {tab.label}
                <span className={`rounded px-1.5 py-0.5 text-[10px] tabular-nums ${active ? 'bg-[var(--brand-light)] text-[var(--brand)]' : 'bg-[var(--bg-elevated)] text-[var(--text-muted)]'}`}>{count}</span>
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

      {/* Cards Grid + Pagination */}
      <section aria-label="智能体列表" className="space-y-3">
        <header className="flex items-center justify-between">
          <p className="text-xs text-[var(--text-muted)]">
            {isLoading ? '加载中...' : <>共 <span className="font-semibold tabular-nums text-[var(--text)]">{filteredList.length}</span> 个智能体 · 已选 <span className="font-semibold tabular-nums text-[var(--brand)]">{selectedIds.length}</span></>}
          </p>
          <div className="flex items-center gap-1 text-[11px] text-[var(--text-muted)]">
            <Activity className="h-3 w-3" />实时同步 5s 前
          </div>
        </header>

        {pagedList.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {pagedList.map((agent) => (
              <AgentCard
                key={agent.id}
                agent={agent}
                onSelect={handleOpenDetail}
                onToggleStar={handleToggleStar}
                selected={selectedIds.includes(agent.id)}
                onToggleSelect={handleToggleSelect}
                menuOpen={menuOpenFor === agent.id}
                onToggleMenu={setMenuOpenFor}
                onEdit={handleOpenDetail}
                onDuplicate={handleDuplicate}
                onExportOne={handleExportOne}
                onRequestDelete={handleRequestDelete}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface-1)] p-8 text-center">
            <AlertTriangle className="mx-auto h-6 w-6 text-[var(--warning)]" />
            <p className="mt-3 text-sm font-semibold">没有匹配的智能体</p>
            <p className="mt-1 text-xs text-[var(--text-muted)]">尝试切换 Tab、清空筛选,或新建一个智能体。</p>
          </div>
        )}

        {totalPages > 1 && (
          <nav aria-label="分页" className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] px-4 py-2.5 text-xs">
            <span className="text-[var(--text-muted)]">
              第 <span className="font-semibold tabular-nums text-[var(--text)]">{pageStart}-{pageEnd}</span> 个 / 共 <span className="font-semibold tabular-nums text-[var(--text)]">{filteredList.length}</span> 个
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={safePage <= 1}
                aria-label="上一页"
                className="inline-flex items-center gap-1 rounded-lg border border-[var(--border)] px-2.5 py-1 text-[11px] font-semibold text-[var(--text-secondary)] hover:border-[var(--brand)] hover:text-[var(--brand)] disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronLeft className="h-3 w-3" />上一页
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => {
                const active = n === safePage;
                return (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setPage(n)}
                    aria-current={active ? 'page' : undefined}
                    aria-label={`第 ${n} 页`}
                    className={`grid h-7 w-7 place-items-center rounded-lg text-[11px] font-semibold transition ${active ? 'bg-[var(--brand)] text-white' : 'border border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--brand)] hover:text-[var(--brand)]'}`}
                  >
                    {n}
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={safePage >= totalPages}
                aria-label="下一页"
                className="inline-flex items-center gap-1 rounded-lg border border-[var(--border)] px-2.5 py-1 text-[11px] font-semibold text-[var(--text-secondary)] hover:border-[var(--brand)] hover:text-[var(--brand)] disabled:cursor-not-allowed disabled:opacity-40"
              >
                下一页<ChevronRight className="h-3 w-3" />
              </button>
            </div>
          </nav>
        )}
      </section>

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
    </div>
  );
}

export { Star };