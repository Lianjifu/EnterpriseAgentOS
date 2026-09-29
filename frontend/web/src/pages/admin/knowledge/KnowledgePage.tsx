/**
 * AdminKnowledge — 知识管理编排:Hero + 5 子模块 + 卡片列表。
 *
 * 详情/新建都迁到独立页面(/admin/knowledge/kbs/:id、docs/:id、sources/:id、kbs/new、sources/new),
 * 本页只负责列表 + 筛选 + 批量操作。
 */
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Database, FileText, Filter, ListChecks, Plus, RefreshCw, TrendingUp } from 'lucide-react';
import {
  useKnowledgeBases,
  useKnowledgeDocs,
  useKnowledgeSources,
  useKnowledgeTasks,
  useKnowledgeEvalCases,
  useToggleKbStatus,
  useBatchKb,
} from '@/api/admin/knowledge';
import type { Kb, TabId, Tone } from '@/api/admin/knowledge/schema';
import {
  KB_STATUS_BADGE,
  TASK_STATUS_BADGE,
  EVAL_STATUS_BADGE,
  TAB_ICON,
  TONE_CLASS,
  ProgressBar,
} from './components/Primitives';
import {
  TABS,
  RANGES,
  TASK_KIND_LABEL,
  downloadBlob,
} from './components/constants';
import KbCard from './components/KbCard';
import DocCard from './components/DocCard';
import SourceCard from './components/SourceCard';
import QualityChart from './components/QualityChart';

export default function KnowledgePage() {
  const [tab, setTab] = useState<TabId>('kb');
  const [range, setRange] = useState<'7d' | '30d' | '90d'>('7d');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [notice, setNotice] = useState<string | null>(null);
  const [selectedKbIds, setSelectedKbIds] = useState<string[]>([]);

  const navigate = useNavigate();

  const kbsQuery = useKnowledgeBases();
  const docsQuery = useKnowledgeDocs();
  const sourcesQuery = useKnowledgeSources();
  const tasksQuery = useKnowledgeTasks();
  const evalQuery = useKnowledgeEvalCases();

  const kbs = kbsQuery.data ?? [];
  const docs = docsQuery.data ?? [];
  const sources = sourcesQuery.data ?? [];
  const tasks = tasksQuery.data ?? [];
  const evalCases = evalQuery.data ?? [];

  const toggleKbStatus = useToggleKbStatus();
  const batchKb = useBatchKb();

  const visibleKbs = useMemo(() => {
    const q = search.trim().toLowerCase();
    return kbs.filter((k) => {
      if (statusFilter !== 'all' && k.status !== statusFilter) return false;
      if (q && !k.name.toLowerCase().includes(q) && !k.tags.some((t) => t.toLowerCase().includes(q))) return false;
      return true;
    });
  }, [kbs, search, statusFilter]);

  const visibleDocs = useMemo(() => {
    const q = search.trim().toLowerCase();
    return docs.filter((d) => {
      if (statusFilter !== 'all' && d.status !== statusFilter) return false;
      if (q && !d.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [docs, search, statusFilter]);

  const flash = (text: string) => {
    setNotice(text);
    window.setTimeout(() => setNotice(null), 2400);
  };

  const refreshAll = () => {
    kbsQuery.refetch();
    docsQuery.refetch();
    sourcesQuery.refetch();
    tasksQuery.refetch();
    evalQuery.refetch();
    flash('已刷新数据');
  };

  const toggleSelectKb = (id: string) =>
    setSelectedKbIds((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]));

  const handleTogglePause = (kb: Kb) => {
    toggleKbStatus.mutate(
      { id: kb.id },
      {
        onSuccess: (data) => flash(`已切换状态:${KB_STATUS_BADGE[data.status].label}`),
        onError: () => flash('切换失败'),
      },
    );
  };

  const handleBatch = (action: 'rebuild' | 'pause' | 'export') => {
    if (selectedKbIds.length === 0) {
      flash('请先选择知识库');
      return;
    }
    if (action === 'export') {
      const items = kbs.filter((k) => selectedKbIds.includes(k.id));
      downloadBlob(`kb-export-${Date.now()}.json`, JSON.stringify(items, null, 2));
      flash(`已导出 ${items.length} 个知识库`);
      return;
    }
    batchKb.mutate(
      { ids: selectedKbIds, action },
      {
        onSuccess: () => flash(`${action === 'rebuild' ? '重建' : '暂停'} ${selectedKbIds.length} 个知识库`),
        onError: () => flash('操作失败'),
      },
    );
  };

  return (
    <div className="mx-auto w-full max-w-[1440px] space-y-6 p-5 pb-16 sm:p-8 xl:px-10">
      <section className="relative overflow-hidden rounded-[28px] border border-[var(--border)] bg-[var(--surface-1)] px-6 py-8 shadow-[var(--shadow-sm)] sm:px-8">
        <div aria-hidden="true" className="pointer-events-none absolute right-0 top-0 h-full w-1/2 bg-[radial-gradient(circle_at_top_right,var(--brand-light),transparent_68%)]" />
        <div className="relative flex flex-col justify-between gap-6 xl:flex-row xl:items-end">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--brand)]">ADMIN / 知识管理</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">把企业知识资产管起来。</h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--text-muted)]">{kbs.length} 个知识库 · {docs.length.toLocaleString()} 篇文档 · {sources.length} 个数据源 · 覆盖索引、检索、评测全链路。</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-1">
              {RANGES.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setRange(r.id)}
                  aria-pressed={range === r.id}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${range === r.id ? 'bg-[var(--brand-light)] text-[var(--brand)]' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'}`}
                >
                  {r.label}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={refreshAll}
              className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] px-3 py-2 text-xs font-semibold text-[var(--text-secondary)] hover:border-[var(--brand)] hover:text-[var(--brand)]"
            >
              <RefreshCw className="h-4 w-4" />
              刷新
            </button>
            <button
              type="button"
              onClick={() => navigate('/admin/knowledge/kbs/new')}
              className="inline-flex items-center gap-2 rounded-xl bg-[var(--brand)] px-4 py-2 text-xs font-semibold text-white hover:bg-[var(--brand-hover)]"
            >
              <Plus className="h-4 w-4" />
              新建知识库
            </button>
          </div>
        </div>
      </section>

      <nav className="flex flex-wrap items-center gap-1 border-b border-[var(--border)]">
        {TABS.map((t) => {
          const Icon = TAB_ICON[t.id] ?? BookOpen;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              aria-pressed={tab === t.id}
              className={`inline-flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-xs font-semibold transition ${tab === t.id ? 'border-[var(--brand)] text-[var(--brand)]' : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--brand)]'}`}
            >
              <Icon className="h-4 w-4" />
              {t.label}
            </button>
          );
        })}
        <span className="ml-auto pb-2 text-[11px] text-[var(--text-muted)]">{range} 窗口</span>
      </nav>

      {notice && (
        <div className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          <RefreshCw className="h-4 w-4" />
          {notice}
        </div>
      )}

      {tab === 'kb' && (
        <>
          <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-5 sm:p-7">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-[var(--brand)]" />
                  <h3 className="text-base font-semibold">知识库</h3>
                </div>
                <p className="mt-1 text-xs text-[var(--text-muted)]">按可见范围 / 标签筛选 · 批量重建、暂停、导出</p>
              </div>
              <div className="flex flex-1 items-center gap-2 sm:max-w-md">
                <input
                  className="flex-1 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] px-3 py-2 text-sm focus:border-[var(--brand)] focus:outline-none"
                  placeholder="搜索名称 / 标签…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] px-3 py-2 text-sm focus:border-[var(--brand)] focus:outline-none"
                >
                  <option value="all">全部状态</option>
                  <option value="indexed">已索引</option>
                  <option value="indexing">索引中</option>
                  <option value="paused">已暂停</option>
                  <option value="failed">失败</option>
                </select>
                <button type="button" className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border)] px-2.5 py-2 text-xs font-semibold text-[var(--text-secondary)] hover:border-[var(--brand)] hover:text-[var(--brand)]">
                  <Filter className="h-3.5 w-3.5" />
                  筛选
                </button>
              </div>
            </div>
            {selectedKbIds.length > 0 && (
              <div className="mt-4 flex flex-wrap items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] px-4 py-2.5 text-xs">
                <span className="font-semibold text-[var(--text-secondary)]">已选 {selectedKbIds.length} 个</span>
                <button type="button" onClick={() => handleBatch('rebuild')} className="rounded-md border border-[var(--border)] px-2.5 py-1 hover:border-[var(--brand)] hover:text-[var(--brand)]">批量重建</button>
                <button type="button" onClick={() => handleBatch('pause')} className="rounded-md border border-[var(--border)] px-2.5 py-1 hover:border-[var(--brand)] hover:text-[var(--brand)]">批量暂停</button>
                <button type="button" onClick={() => handleBatch('export')} className="rounded-md border border-[var(--border)] px-2.5 py-1 hover:border-[var(--brand)] hover:text-[var(--brand)]">批量导出</button>
                <button type="button" onClick={() => setSelectedKbIds([])} className="rounded-md border border-[var(--border)] px-2.5 py-1 hover:border-[var(--brand)] hover:text-[var(--brand)]">清空选择</button>
              </div>
            )}
          </section>
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {visibleKbs.map((kb) => (
              <KbCard
                key={kb.id}
                kb={kb}
                selected={selectedKbIds.includes(kb.id)}
                onToggleSelect={toggleSelectKb}
                onOpen={(k) => navigate(`/admin/knowledge/kbs/${k.id}`)}
                onTogglePause={handleTogglePause}
              />
            ))}
          </section>
        </>
      )}

      {tab === 'docs' && (
        <>
          <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-5 sm:p-7">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-[var(--brand)]" />
                  <h3 className="text-base font-semibold">文档</h3>
                </div>
                <p className="mt-1 text-xs text-[var(--text-muted)]">{docs.length} 篇文档 · 按状态 / 名称筛选</p>
              </div>
              <div className="flex flex-1 items-center gap-2 sm:max-w-md">
                <input
                  className="flex-1 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] px-3 py-2 text-sm focus:border-[var(--brand)] focus:outline-none"
                  placeholder="搜索文档…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] px-3 py-2 text-sm focus:border-[var(--brand)] focus:outline-none"
                >
                  <option value="all">全部状态</option>
                  <option value="parsed">已解析</option>
                  <option value="parsing">解析中</option>
                  <option value="pending">待处理</option>
                  <option value="failed">失败</option>
                </select>
              </div>
            </div>
          </section>
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {visibleDocs.map((doc) => (
              <DocCard key={doc.id} doc={doc} onOpen={(d) => navigate(`/admin/knowledge/docs/${d.id}`)} />
            ))}
          </section>
        </>
      )}

      {tab === 'sources' && (
        <>
          <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-5 sm:p-7">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <Database className="h-5 w-5 text-[var(--brand)]" />
                  <h3 className="text-base font-semibold">数据源</h3>
                </div>
                <p className="mt-1 text-xs text-[var(--text-muted)]">{sources.length} 个数据源 · 同步频率 / 状态监控</p>
              </div>
              <button type="button" onClick={() => navigate('/admin/knowledge/sources/new')} className="inline-flex items-center gap-2 rounded-xl bg-[var(--brand)] px-4 py-2 text-xs font-semibold text-white hover:bg-[var(--brand-hover)]">
                <Plus className="h-4 w-4" />
                新增数据源
              </button>
            </div>
          </section>
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {sources.map((s) => (
              <SourceCard
                key={s.id}
                source={s}
                onOpen={(src) => navigate(`/admin/knowledge/sources/${src.id}`)}
                onSync={() => flash(`已触发 ${s.name} 同步`)}
                onConfig={(src) => flash(`配置 ${src.name}(占位)`)}
              />
            ))}
          </section>
        </>
      )}

      {tab === 'tasks' && (
        <>
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <KpiBlock label="已完成" value={tasks.filter((t) => t.status === 'success').length} tone="success" />
            <KpiBlock label="进行中" value={tasks.filter((t) => t.status === 'running').length} tone="info" />
            <KpiBlock label="排队" value={tasks.filter((t) => t.status === 'pending').length} tone="warn" />
            <KpiBlock label="失败" value={tasks.filter((t) => t.status === 'failed').length} tone="danger" />
          </section>
          <section className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface-1)]">
            <div className="flex items-center gap-2 border-b border-[var(--border)] px-5 py-4">
              <ListChecks className="h-5 w-5 text-[var(--brand)]" />
              <div>
                <h3 className="text-base font-semibold">任务列表</h3>
                <p className="text-xs text-[var(--text-muted)]">索引 / 增量 / 重建任务的实时进度</p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-[var(--bg-elevated)] text-[10px] uppercase tracking-wide text-[var(--text-muted)]">
                  <tr>
                    <th className="px-4 py-2.5 text-left">任务</th>
                    <th className="px-4 py-2.5 text-left">类型</th>
                    <th className="px-4 py-2.5 text-left">进度</th>
                    <th className="px-4 py-2.5 text-left">状态</th>
                    <th className="px-4 py-2.5 text-left">开始</th>
                    <th className="px-4 py-2.5 text-left">耗时</th>
                    <th className="px-4 py-2.5 text-left">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {tasks.map((t) => {
                    const badge = TASK_STATUS_BADGE[t.status];
                    return (
                      <tr key={t.id} className="transition hover:bg-[var(--bg-hover)]">
                        <td className="px-4 py-3 font-medium">{t.name}</td>
                        <td className="px-4 py-3 text-[var(--text-secondary)]">{TASK_KIND_LABEL[t.kind]}</td>
                        <td className="px-4 py-3">
                          <ProgressBar
                            value={t.progress}
                            tone={t.status === 'failed' ? 'danger' : t.status === 'success' ? 'success' : 'brand'}
                          />
                          <span className="mt-1 block text-[11px] text-[var(--text-muted)]">{t.progress}% · {t.items} 项</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${badge.className}`}>{badge.label}</span>
                        </td>
                        <td className="px-4 py-3 text-[var(--text-secondary)]">{t.startedAt}</td>
                        <td className="px-4 py-3 text-[var(--text-secondary)]">{t.duration}</td>
                        <td className="px-4 py-3">
                          {t.status === 'failed' && (
                            <button type="button" onClick={() => flash(`已重试 ${t.name}`)} className="inline-flex items-center rounded-lg border border-[var(--border)] px-2.5 py-1 text-[11px] font-semibold hover:border-[var(--brand)] hover:text-[var(--brand)]">
                              重试
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      {tab === 'eval' && (
        <>
          <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-5 sm:p-7">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-[var(--brand)]" />
              <h3 className="text-base font-semibold">命中率 · MRR · 延迟趋势</h3>
            </div>
            <p className="mt-1 text-xs text-[var(--text-muted)]">7 天窗口 · 实线为命中率,虚线为平均 MRR</p>
            <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(280px,1fr)]">
              <QualityChart />
              <div className="grid grid-cols-2 gap-3">
                <KpiBlock
                  label="通过率"
                  value={`${((evalCases.filter((e) => e.status === 'pass').length / Math.max(evalCases.length, 1)) * 100).toFixed(0)}%`}
                  tone="success"
                  small
                />
                <KpiBlock
                  label="平均 MRR"
                  value={`${((evalCases.reduce((s, e) => s + e.mrr, 0) / Math.max(evalCases.length, 1)) * 100).toFixed(0)}%`}
                  tone="info"
                  small
                />
                <KpiBlock
                  label="平均延迟"
                  value={`${(evalCases.reduce((s, e) => s + e.latency, 0) / Math.max(evalCases.length, 1)).toFixed(2)}s`}
                  tone="warn"
                  small
                />
                <KpiBlock label="未命中" value={evalCases.filter((e) => e.status === 'fail').length} tone="danger" small />
              </div>
            </div>
          </section>
          <section className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface-1)]">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-[var(--bg-elevated)] text-[10px] uppercase tracking-wide text-[var(--text-muted)]">
                  <tr>
                    <th className="px-4 py-2.5 text-left">用例</th>
                    <th className="px-4 py-2.5 text-left">查询</th>
                    <th className="px-4 py-2.5 text-left">预期</th>
                    <th className="px-4 py-2.5 text-left">实际</th>
                    <th className="px-4 py-2.5 text-left">结果</th>
                    <th className="px-4 py-2.5 text-left">MRR</th>
                    <th className="px-4 py-2.5 text-left">延迟</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {evalCases.map((e) => {
                    const badge = EVAL_STATUS_BADGE[e.status];
                    const expected = kbs.find((k) => k.id === e.expectedKb)?.name ?? e.expectedKb;
                    const actual = kbs.find((k) => k.id === e.actualKb)?.name ?? e.actualKb;
                    return (
                      <tr key={e.id} className="transition hover:bg-[var(--bg-hover)]">
                        <td className="px-4 py-3 font-medium">{e.name}</td>
                        <td className="px-4 py-3 text-[var(--text-muted)]">{e.query}</td>
                        <td className="px-4 py-3 text-[var(--text-secondary)]">{expected}</td>
                        <td className="px-4 py-3 text-[var(--text-secondary)]">{actual}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${badge.className}`}>{badge.label}</span>
                        </td>
                        <td className="px-4 py-3 tabular-nums">{(e.mrr * 100).toFixed(0)}%</td>
                        <td className="px-4 py-3 tabular-nums">{e.latency.toFixed(2)}s</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      <p className="text-center text-xs text-[var(--text-muted)]">本页为前端演示数据,生产环境将接入 EOS 知识中台。</p>
    </div>
  );
}

function KpiBlock({ label, value, tone, small }: { label: string; value: string | number; tone: Tone; small?: boolean }) {
  return (
    <div className={`flex flex-col gap-1 rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] ${TONE_CLASS[tone]} ${small ? 'px-4 py-3' : 'px-5 py-4'}`}>
      <span className="text-[10px] uppercase tracking-wide opacity-70">{label}</span>
      <span className={`font-semibold tabular-nums ${small ? 'text-xl' : 'text-2xl'}`}>{value}</span>
    </div>
  );
}