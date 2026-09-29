/**
 * AdminEvaluations — 评测中心 orchestrator。
 * 套件/结果走 useApiQuery 拉取;写操作(CRUD/运行/导入导出)走本地乐观更新。
 */
import { Beaker, Download, Plus, Upload } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { NoticeBanner } from '@/components/feedback/NoticeBanner';
import { useEvalResults, useEvalSuites, useEvalSuiteStats } from '@/api/admin/evaluations';
import type { CaseTemplate, EvalResult, EvalSuite, EvalStatus, EvalSuiteType, ExchangeFormat, TabId } from '@/api/admin/evaluations/schema';
import { mockCaseTemplates } from '@/mock/admin/evaluations.fixtures';
import { BatchToolbar } from './components/BatchToolbar';
import { TABS, uid } from './components/constants';
import { CreateSuiteWizard, DeleteSuiteModal, ExportSuiteModal, ImportSuiteModal, RunConfirmModal } from './components/Modals';
import { CaseTab, OverviewTab, ResultTab, SuiteListTab, TemplateTab } from './components/tabs/Tabs';

export default function EvaluationsPage() {
  const navigate = useNavigate();
  const remoteSuites = useEvalSuites();
  const remoteResults = useEvalResults();
  const suitesData = remoteSuites.data ?? [];
  const resultsData = remoteResults.data ?? [];

  const [suites, setSuites] = useState<EvalSuite[]>([]);
  const [tab, setTab] = useState<TabId>('overview');
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | EvalSuiteType>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | EvalStatus>('all');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [runTarget, setRunTarget] = useState<EvalSuite | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<EvalSuite | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [notice, setNotice] = useState('');

  const stats = useEvalSuiteStats(suites);

  useEffect(() => { setSuites(suitesData); }, [suitesData]);

  const visibleSuites = useMemo(() => {
    const q = search.trim().toLowerCase();
    return suites.filter((s) =>
      (typeFilter === 'all' || s.type === typeFilter) &&
      (statusFilter === 'all' || s.status === statusFilter) &&
      (q.length === 0 || `${s.name} ${s.description} ${s.owner} ${s.tags.join(' ')}`.toLowerCase().includes(q)),
    );
  }, [suites, typeFilter, statusFilter, search]);

  const tabCounts = useMemo(() => ({
    overview: suites.length,
    suite: suites.length,
    result: resultsData.length,
    case: suites.reduce((sum, s) => sum + s.casesList.length, 0),
    template: mockCaseTemplates.length,
  }), [suites, resultsData]);

  const toggleSelect = (id: string) => setSelectedIds((current) => current.includes(id) ? current.filter((x) => x !== id) : [...current, id]);
  const toggleStar = (id: string) => setSuites((current) => current.map((s) => s.id === id ? { ...s, starred: !s.starred } : s));

  const handleRun = (suite: EvalSuite) => {
    setSuites((current) => current.map((s) => s.id === suite.id ? { ...s, status: 'running', lastRunAt: '运行中' } : s));
    setNotice(`已加入运行队列:${suite.name}`);
    setRunTarget(null);
  };

  const handleDuplicate = (suite: EvalSuite) => {
    const copy: EvalSuite = { ...suite, id: uid('suite'), name: `${suite.name} 副本`, status: 'queued', cases: 0, passRate: 0, avgScore: 0, lastRunAt: '排队中', starred: false, trend: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], history: [] };
    setSuites((current) => [copy, ...current]);
    setNotice(`已复制套件:${copy.name}`);
  };

  const handleDelete = (suite: EvalSuite) => {
    setSuites((current) => current.filter((s) => s.id !== suite.id));
    setNotice(`已删除「${suite.name}」。`);
    setDeleteTarget(null);
  };

  const handleBatchRun = () => {
    setSuites((current) => current.map((s) => selectedIds.includes(s.id) ? { ...s, status: 'running', lastRunAt: '运行中' } : s));
    setNotice(`已批量运行 ${selectedIds.length} 个套件。`);
    setSelectedIds([]);
  };
  const handleBatchDelete = () => {
    setSuites((current) => current.filter((s) => !selectedIds.includes(s.id)));
    setNotice(`已批量删除 ${selectedIds.length} 个套件。`);
    setSelectedIds([]);
  };

  const handleCreate = (suite: EvalSuite) => {
    setSuites((current) => [suite, ...current]);
    setNotice(`已创建评测套件「${suite.name}」,已加入队列。`);
    setCreateOpen(false);
    setTab('suite');
  };

  const handleImport = (count: number) => {
    for (let i = 0; i < count; i += 1) {
      const newSuite: EvalSuite = {
        id: uid('suite'),
        name: `导入套件 ${i + 1}`,
        description: '从外部文件导入,根据系统提示配置评分标准与用例。',
        type: 'capability',
        owner: '张敏',
        status: 'queued',
        cases: 0,
        passRate: 0,
        avgScore: 0,
        lastRunAt: '排队中',
        schedule: '每周一 09:00',
        target: '待指定',
        starred: false,
        tags: [],
        trend: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        casesList: [],
        criteria: [],
        history: [],
      };
      setSuites((current) => [newSuite, ...current]);
    }
    setNotice(`已导入 ${count} 个套件(以草稿状态进入)。`);
  };

  const handleExport = (format: ExchangeFormat) => {
    const list = selectedIds.length > 0 ? suites.filter((s) => selectedIds.includes(s.id)) : suites;
    const payload = list.map((s) => ({ id: s.id, name: s.name, type: s.type, target: s.target, schedule: s.schedule, criteria: s.criteria }));
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    if (format === 'json') {
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      downloadBlob(blob, 'eval-suites.json');
    } else {
      const yaml = payload.map((p) => `- id: "${p.id}"\n  name: "${p.name}"\n  type: "${p.type}"\n  target: "${p.target}"\n  schedule: "${p.schedule}"`).join('\n');
      const blob = new Blob([`${yaml}\n`], { type: 'text/yaml' });
      downloadBlob(blob, 'eval-suites.yaml');
    }
    setNotice(`已导出 ${list.length} 个套件为 ${format.toUpperCase()} 文件。`);
  };

  const handleAddTemplate = (template: CaseTemplate) => {
    const newSuite: EvalSuite = {
      id: uid('suite'),
      name: `${template.name} 套件`,
      description: template.description,
      type: template.type,
      owner: '张敏',
      status: 'queued',
      cases: 0,
      passRate: 0,
      avgScore: 0,
      lastRunAt: '排队中',
      schedule: '每周一 09:00',
      target: '待指定',
      starred: false,
      tags: [],
      trend: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      casesList: [{ id: uid('case'), name: `${template.name} 示例`, input: template.inputExample, expected: template.expectedExample, status: 'skipped', durationMs: 0, score: 0 }],
      criteria: [...template.criteria],
      history: [],
    };
    setSuites((current) => [newSuite, ...current]);
    setNotice(`已从模板加入:${newSuite.name}`);
    setTab('suite');
  };

  return (
    <div className="evaluations-page mx-auto w-full max-w-[1440px] space-y-6 p-5 pb-16 sm:p-8 xl:px-10">
      <section className="relative overflow-hidden rounded-[28px] border border-[var(--border)] bg-[var(--surface-1)] px-6 py-8 shadow-[var(--shadow-sm)] sm:px-8">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden rounded-[28px]">
          <div className="absolute right-0 top-0 h-full w-1/2 bg-[radial-gradient(circle_at_top_right,rgba(20,184,166,0.10),transparent_68%)]" />
        </div>
        <div className="relative flex flex-col justify-between gap-6 xl:flex-row xl:items-end">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-teal-700 dark:text-teal-300">ADMIN / 评测中心</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">把评测当作质量的尺子。</h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--text-muted)]">为智能体与工作流设置可重复运行的评测套件,持续追踪能力、质量、安全与回归表现。</p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setImportOpen(true)} className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] px-3 text-xs font-semibold text-[var(--text-secondary)] transition hover:border-[var(--brand)] hover:text-[var(--brand)]">
                <Upload className="h-3.5 w-3.5" />导入
              </button>
              <button type="button" onClick={() => setExportOpen(true)} className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] px-3 text-xs font-semibold text-[var(--text-secondary)] transition hover:border-[var(--brand)] hover:text-[var(--brand)]">
                <Download className="h-3.5 w-3.5" />导出
              </button>
              <button type="button" onClick={() => setCreateOpen(true)} className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-[var(--brand)] px-4 text-xs font-semibold text-white transition hover:bg-[var(--brand-hover)]">
                <Plus className="h-4 w-4" />新建套件
              </button>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-[var(--text-muted)]">
              <Beaker className="h-3 w-3" />{suites.length} 个套件 · 本月通过 {stats.passed}
            </div>
          </div>
        </div>
      </section>

      {notice && (
        <NoticeBanner tone="violet" onClose={() => setNotice('')}>
          {notice}
        </NoticeBanner>
      )}

      <section aria-label="子模块导航" className="flex flex-wrap items-center gap-2 overflow-x-auto pb-1">
        {TABS.map((t) => {
          const count = tabCounts[t.id];
          return (
            <button key={t.id} type="button" onClick={() => setTab(t.id)} aria-pressed={tab === t.id} className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-4 py-2 text-xs font-semibold transition ${tab === t.id ? 'border-[var(--brand)] bg-[var(--brand-light)] text-[var(--brand)]' : 'border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--brand)] hover:text-[var(--brand)]'}`}>
              {t.label}
              <span className="rounded bg-[var(--bg-elevated)] px-1.5 py-0.5 text-[10px] tabular-nums">{count}</span>
            </button>
          );
        })}
      </section>

      {tab === 'overview' && (
        <OverviewTab
          visibleSuites={visibleSuites}
          results={resultsData as EvalResult[]}
          suitesCount={suites.length}
          selectedIds={selectedIds}
          setSelectedIds={setSelectedIds}
          openMenuId={openMenuId}
          setOpenMenuId={setOpenMenuId}
          search={search}
          setSearch={setSearch}
          typeFilter={typeFilter}
          setTypeFilter={setTypeFilter}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          onSelect={(s) => navigate('/admin/evaluations/' + s.id)}
          onToggleStar={toggleStar}
          onToggleSelect={toggleSelect}
          onRun={(s) => setRunTarget(s)}
          onDuplicate={handleDuplicate}
          onRequestDelete={setDeleteTarget}
          onBatchRun={handleBatchRun}
          onBatchDelete={handleBatchDelete}
        />
      )}
      {tab === 'suite' && (
        <SuiteListTab
          visibleSuites={visibleSuites}
          selectedIds={selectedIds}
          openMenuId={openMenuId}
          setOpenMenuId={setOpenMenuId}
          onSelect={(s) => navigate('/admin/evaluations/' + s.id)}
          onToggleStar={toggleStar}
          onToggleSelect={toggleSelect}
          onRun={(s) => setRunTarget(s)}
          onDuplicate={handleDuplicate}
          onRequestDelete={setDeleteTarget}
        />
      )}
      {tab === 'result' && <ResultTab results={resultsData as EvalResult[]} />}
      {tab === 'case' && <CaseTab suites={suites} />}
      {tab === 'template' && (
        <TemplateTab
          templates={mockCaseTemplates}
          onAddTemplate={handleAddTemplate}
        />
      )}

      <CreateSuiteWizard
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreate={handleCreate}
      />

      <RunConfirmModal
        open={runTarget !== null}
        onClose={() => setRunTarget(null)}
        onConfirm={() => runTarget && handleRun(runTarget)}
        suite={runTarget}
      />

      <DeleteSuiteModal
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && handleDelete(deleteTarget)}
        suite={deleteTarget}
      />

      <ImportSuiteModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImport={handleImport}
      />

      <ExportSuiteModal
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        onExport={handleExport}
        total={suites.length}
        selectedCount={selectedIds.length}
      />
    </div>
  );
}

function downloadBlob(blob: Blob, filename: string) {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}