/**
 * AdminKnowledge — 知识管理编排:Hero + 5 子模块 + 卡片列表。
 *
 * 详情/新建都迁到独立页面(/admin/knowledge/kbs/:id、docs/:id、sources/:id、kbs/new、sources/new),
 * 本页只负责列表 + 筛选 + 批量操作。
 */
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BookOpen, ChevronLeft, ChevronRight, Filter, ListChecks, Plus, RefreshCw, TrendingUp } from 'lucide-react';
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
import QualityChart, { type QualityPoint } from './components/QualityChart';
import { TimeRangeDropdown } from './components/TimeRangeDropdown';

const PAGE_SIZE = 8;

function buildQualityTrend(evalCases: Array<{ status: string; mrr: number; latency: number }>): QualityPoint[] {
  const days = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
  const passRate = evalCases.length === 0
    ? 0.9
    : evalCases.filter((e) => e.status === 'pass').length / evalCases.length;
  const avgMrr = evalCases.length === 0
    ? 0.85
    : evalCases.reduce((s, e) => s + e.mrr, 0) / evalCases.length;
  const seed = evalCases.length * 17;
  return days.map((label, i) => {
    const drift = ((seed + i * 23) % 7 - 3) / 100;
    const hit = Math.max(0.55, Math.min(0.99, passRate + drift));
    const mrr = Math.max(0.55, Math.min(0.99, avgMrr + drift / 2));
    return { label, hit, mrr };
  });
}

function paginate<T>(items: T[], page: number): { slice: T[]; totalPages: number; pageStart: number; pageEnd: number } {
  const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const pageStart = (safePage - 1) * PAGE_SIZE;
  const pageEnd = Math.min(pageStart + items.slice(pageStart, pageStart + PAGE_SIZE).length, items.length);
  return {
    slice: items.slice(pageStart, pageStart + PAGE_SIZE),
    totalPages,
    pageStart: items.length === 0 ? 0 : pageStart + 1,
    pageEnd,
  };
}

export default function KnowledgePage() {
  const [tab, setTab] = useState<TabId>('kb');
  const [range, setRange] = useState<'7d' | '30d' | '90d'>('7d');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sourceStatusFilter, setSourceStatusFilter] = useState('all');
  const [notice, setNotice] = useState<string | null>(null);
  const [selectedKbIds, setSelectedKbIds] = useState<string[]>([]);
  const [kbPage, setKbPage] = useState(1);
  const [docPage, setDocPage] = useState(1);
  const [sourcePage, setSourcePage] = useState(1);
  const [taskPage, setTaskPage] = useState(1);
  const [evalPage, setEvalPage] = useState(1);

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

  const visibleSources = useMemo(() => {
    const q = search.trim().toLowerCase();
    return sources.filter((s) => {
      if (sourceStatusFilter !== 'all' && s.status !== sourceStatusFilter) return false;
      if (q && !s.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [sources, search, sourceStatusFilter]);

  const qualityTrend = useMemo(() => buildQualityTrend(evalCases), [evalCases]);

  const kbEvalStats = useMemo(() => {
    const stats = new Map<string, { total: number; pass: number; mrrSum: number; latSum: number }>();
    evalCases.forEach((e) => {
      [e.actualKb, e.expectedKb].forEach((kid) => {
        const cur = stats.get(kid) ?? { total: 0, pass: 0, mrrSum: 0, latSum: 0 };
        cur.total += 1;
        if (e.status === 'pass') cur.pass += 1;
        cur.mrrSum += e.mrr;
        cur.latSum += e.latency;
        stats.set(kid, cur);
      });
    });
    return kbs
      .filter((kb) => (stats.get(kb.id)?.total ?? 0) > 0)
      .map((kb) => {
        const s = stats.get(kb.id)!;
        return {
          kb,
          cases: s.total,
          passRate: s.pass / s.total,
          avgMrr: s.mrrSum / s.total,
          avgLat: s.latSum / s.total,
        };
      })
      .sort((a, b) => b.passRate - a.passRate);
  }, [evalCases, kbs]);

  const kbById = useMemo(() => new Map(kbs.map((k) => [k.id, k])), [kbs]);

  const kbPageItems = useMemo(() => paginate(visibleKbs, kbPage), [visibleKbs, kbPage]);
  const docPageItems = useMemo(() => paginate(visibleDocs, docPage), [visibleDocs, docPage]);
  const sourcePageItems = useMemo(() => paginate(visibleSources, sourcePage), [visibleSources, sourcePage]);
  const taskPageItems = useMemo(() => paginate(tasks, taskPage), [tasks, taskPage]);
  const evalPageItems = useMemo(() => paginate(evalCases, evalPage), [evalCases, evalPage]);

  const flash = (text: string) => {
    setNotice(text);
    window.setTimeout(() => setNotice(null), 2400);
  };

  useEffect(() => { setKbPage(1); }, [search, statusFilter]);
  useEffect(() => { setDocPage(1); }, [search, statusFilter]);
  useEffect(() => { setSourcePage(1); }, [search, sourceStatusFilter]);
  useEffect(() => { setTaskPage(1); }, [statusFilter]);

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
        <div className="relative">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--brand)]">ADMIN / 知识管理</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">把企业知识资产管起来。</h2>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--text-muted)]">{kbs.length} 个知识库 · {docs.length.toLocaleString()} 篇文档 · {sources.length} 个数据源 · 覆盖索引、检索、评测全链路。</p>
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
        <div className="ml-auto flex items-center gap-2 pb-1.5">
          <TimeRangeDropdown value={range} onChange={setRange} />
        </div>
      </nav>

      {notice && (
        <div className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          <RefreshCw className="h-4 w-4" />
          {notice}
        </div>
      )}

      {tab === 'kb' && (
        <>
          <section className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface-1)]">
            <div className="flex flex-wrap items-end justify-between gap-3 border-b border-[var(--border)] p-5 sm:p-7">
              <div className="flex flex-1 items-center gap-2">
                <input
                  className="w-56 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] px-3 py-2 text-sm focus:border-[var(--brand)] focus:outline-none"
                  placeholder="搜索名称 / 标签…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-2">
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
                <button
                  type="button"
                  onClick={() => navigate('/admin/knowledge/kbs/new')}
                  className="inline-flex h-10 items-center gap-2 rounded-xl bg-[var(--brand)] px-4 text-xs font-semibold text-white hover:bg-[var(--brand-hover)]"
                >
                  <Plus className="h-4 w-4" />
                  新建知识库
                </button>
              </div>
            </div>
            {selectedKbIds.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 border-b border-[var(--border)] bg-[var(--bg-elevated)] px-5 py-2.5 text-xs sm:px-7">
                <span className="font-semibold text-[var(--text-secondary)]">已选 {selectedKbIds.length} 个</span>
                <button type="button" onClick={() => handleBatch('rebuild')} className="rounded-md border border-[var(--border)] px-2.5 py-1 hover:border-[var(--brand)] hover:text-[var(--brand)]">批量重建</button>
                <button type="button" onClick={() => handleBatch('pause')} className="rounded-md border border-[var(--border)] px-2.5 py-1 hover:border-[var(--brand)] hover:text-[var(--brand)]">批量暂停</button>
                <button type="button" onClick={() => handleBatch('export')} className="rounded-md border border-[var(--border)] px-2.5 py-1 hover:border-[var(--brand)] hover:text-[var(--brand)]">批量导出</button>
                <button type="button" onClick={() => setSelectedKbIds([])} className="rounded-md border border-[var(--border)] px-2.5 py-1 hover:border-[var(--brand)] hover:text-[var(--brand)]">清空选择</button>
              </div>
            )}
            <div className="grid gap-4 p-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 sm:p-7">
              {kbPageItems.slice.map((kb) => (
                <KbCard
                  key={kb.id}
                  kb={kb}
                  selected={selectedKbIds.includes(kb.id)}
                  onToggleSelect={toggleSelectKb}
                  onOpen={(k) => navigate(`/admin/knowledge/kbs/${k.id}`)}
                  onTogglePause={handleTogglePause}
                />
              ))}
            </div>
            <PaginationBar
              page={kbPage}
              totalPages={kbPageItems.totalPages}
              total={visibleKbs.length}
              pageStart={kbPageItems.pageStart}
              pageEnd={kbPageItems.pageEnd}
              onPageChange={setKbPage}
            />
          </section>
        </>
      )}

      {tab === 'docs' && (
        <>
          <section className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface-1)]">
            <div className="flex flex-wrap items-end justify-between gap-3 border-b border-[var(--border)] p-5 sm:p-7">
              <div className="flex flex-1 items-center gap-2">
                <input
                  className="w-56 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] px-3 py-2 text-sm focus:border-[var(--brand)] focus:outline-none"
                  placeholder="搜索文档…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-2">
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
                <button type="button" className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border)] px-2.5 py-2 text-xs font-semibold text-[var(--text-secondary)] hover:border-[var(--brand)] hover:text-[var(--brand)]">
                  <Filter className="h-3.5 w-3.5" />
                  筛选
                </button>
                <button
                  type="button"
                  onClick={() => flash('请到知识库详情页上传文档')}
                  className="inline-flex h-10 items-center gap-2 rounded-xl bg-[var(--brand)] px-4 text-xs font-semibold text-white hover:bg-[var(--brand-hover)]"
                >
                  <Plus className="h-4 w-4" />
                  新建文档
                </button>
              </div>
            </div>
            <div className="grid gap-4 p-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 sm:p-7">
              {docPageItems.slice.map((doc) => (
                <DocCard key={doc.id} doc={doc} onOpen={(d) => navigate(`/admin/knowledge/docs/${d.id}`)} />
              ))}
            </div>
            <PaginationBar
              page={docPage}
              totalPages={docPageItems.totalPages}
              total={visibleDocs.length}
              pageStart={docPageItems.pageStart}
              pageEnd={docPageItems.pageEnd}
              onPageChange={setDocPage}
            />
          </section>
        </>
      )}

      {tab === 'sources' && (
        <>
          <section className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface-1)]">
            <div className="flex flex-wrap items-end justify-between gap-3 border-b border-[var(--border)] p-5 sm:p-7">
              <div className="flex flex-1 items-center gap-2">
                <input
                  className="w-56 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] px-3 py-2 text-sm focus:border-[var(--brand)] focus:outline-none"
                  placeholder="搜索数据源…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                <select
                  value={sourceStatusFilter}
                  onChange={(e) => setSourceStatusFilter(e.target.value)}
                  className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] px-3 py-2 text-sm focus:border-[var(--brand)] focus:outline-none"
                >
                  <option value="all">全部状态</option>
                  <option value="online">在线</option>
                  <option value="syncing">同步中</option>
                  <option value="error">异常</option>
                  <option value="paused">已暂停</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <button type="button" className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--border)] px-2.5 py-2 text-xs font-semibold text-[var(--text-secondary)] hover:border-[var(--brand)] hover:text-[var(--brand)]">
                  <Filter className="h-3.5 w-3.5" />
                  筛选
                </button>
                <button type="button" onClick={() => navigate('/admin/knowledge/sources/new')} className="inline-flex items-center gap-2 rounded-xl bg-[var(--brand)] px-4 py-2 text-xs font-semibold text-white hover:bg-[var(--brand-hover)]">
                  <Plus className="h-4 w-4" />
                  新增数据源
                </button>
              </div>
            </div>
            <div className="grid gap-4 p-5 sm:grid-cols-2 xl:grid-cols-3 sm:p-7">
              {sourcePageItems.slice.map((s) => (
                <SourceCard
                  key={s.id}
                  source={s}
                  onOpen={(src) => navigate(`/admin/knowledge/sources/${src.id}`)}
                  onSync={() => flash(`已触发 ${s.name} 同步`)}
                  onConfig={(src) => flash(`配置 ${src.name}(占位)`)}
                />
              ))}
            </div>
            <PaginationBar
              page={sourcePage}
              totalPages={sourcePageItems.totalPages}
              total={visibleSources.length}
              pageStart={sourcePageItems.pageStart}
              pageEnd={sourcePageItems.pageEnd}
              onPageChange={setSourcePage}
            />
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
                    <th className="px-4 py-2.5 text-left">目标 KB</th>
                    <th className="px-4 py-2.5 text-left">进度</th>
                    <th className="px-4 py-2.5 text-left">状态</th>
                    <th className="px-4 py-2.5 text-left">开始</th>
                    <th className="px-4 py-2.5 text-left">耗时</th>
                    <th className="px-4 py-2.5 text-left">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {taskPageItems.slice.map((t) => {
                    const badge = TASK_STATUS_BADGE[t.status];
                    const targetKb = kbById.get(t.kbId);
                    return (
                      <tr key={t.id} className="transition hover:bg-[var(--bg-hover)]" title={t.failureReason}>
                        <td className="px-4 py-3 font-medium">{t.name}</td>
                        <td className="px-4 py-3 text-[var(--text-secondary)]">{TASK_KIND_LABEL[t.kind]}</td>
                        <td className="px-4 py-3">
                          {targetKb ? (
                            <Link to={`/admin/knowledge/kbs/${targetKb.id}`} className="font-medium text-[var(--brand)] hover:underline">
                              {targetKb.name}
                            </Link>
                          ) : (
                            <span className="text-[var(--text-muted)]">{t.kbId}</span>
                          )}
                        </td>
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
            <PaginationBar
              page={taskPage}
              totalPages={taskPageItems.totalPages}
              total={tasks.length}
              pageStart={taskPageItems.pageStart}
              pageEnd={taskPageItems.pageEnd}
              onPageChange={setTaskPage}
            />
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
            <p className="mt-1 text-xs text-[var(--text-muted)]">7 天窗口 · 实线为命中率,虚线为平均 MRR · 数据由当前评测用例派生</p>
            <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(280px,1fr)]">
              <QualityChart data={qualityTrend} />
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
                  {evalPageItems.slice.map((e) => {
                    const badge = EVAL_STATUS_BADGE[e.status];
                    const expected = kbs.find((k) => k.id === e.expectedKb);
                    const actual = kbs.find((k) => k.id === e.actualKb);
                    return (
                      <tr key={e.id} className="transition hover:bg-[var(--bg-hover)]">
                        <td className="px-4 py-3 font-medium">{e.name}</td>
                        <td className="px-4 py-3 text-[var(--text-muted)]">{e.query}</td>
                        <td className="px-4 py-3">
                          {expected ? (
                            <Link to={`/admin/knowledge/kbs/${expected.id}`} className="font-medium text-[var(--brand)] hover:underline">
                              {expected.name}
                            </Link>
                          ) : (
                            <span className="text-[var(--text-muted)]">{e.expectedKb}</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {actual ? (
                            <Link to={`/admin/knowledge/kbs/${actual.id}`} className="font-medium text-[var(--brand)] hover:underline">
                              {actual.name}
                            </Link>
                          ) : (
                            <span className="text-[var(--text-muted)]">{e.actualKb}</span>
                          )}
                        </td>
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
            <PaginationBar
              page={evalPage}
              totalPages={evalPageItems.totalPages}
              total={evalCases.length}
              pageStart={evalPageItems.pageStart}
              pageEnd={evalPageItems.pageEnd}
              onPageChange={setEvalPage}
            />
          </section>
          <section className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface-1)]">
            <div className="flex items-center gap-2 border-b border-[var(--border)] px-5 py-4">
              <TrendingUp className="h-5 w-5 text-[var(--brand)]" />
              <div>
                <h3 className="text-base font-semibold">知识库命中率分布 ({kbEvalStats.length})</h3>
                <p className="text-xs text-[var(--text-muted)]">按通过率倒序 · 命中行可跳到 KB 详情</p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-[var(--bg-elevated)] text-[10px] uppercase tracking-wide text-[var(--text-muted)]">
                  <tr>
                    <th className="px-4 py-2.5 text-left">知识库</th>
                    <th className="px-4 py-2.5 text-left">用例数</th>
                    <th className="px-4 py-2.5 text-left">通过率</th>
                    <th className="px-4 py-2.5 text-left">平均 MRR</th>
                    <th className="px-4 py-2.5 text-left">平均延迟</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {kbEvalStats.map(({ kb, cases, passRate, avgMrr, avgLat }) => (
                    <tr key={kb.id} className="transition hover:bg-[var(--bg-hover)]">
                      <td className="px-4 py-3">
                        <Link to={`/admin/knowledge/kbs/${kb.id}`} className="font-medium text-[var(--brand)] hover:underline">
                          {kb.name}
                        </Link>
                      </td>
                      <td className="px-4 py-3 tabular-nums">{cases}</td>
                      <td className="px-4 py-3 tabular-nums">{(passRate * 100).toFixed(0)}%</td>
                      <td className="px-4 py-3 tabular-nums">{(avgMrr * 100).toFixed(0)}%</td>
                      <td className="px-4 py-3 tabular-nums">{avgLat.toFixed(2)}s</td>
                    </tr>
                  ))}
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

function PaginationBar({ page, totalPages, total, pageStart, pageEnd, onPageChange }: {
  page: number;
  totalPages: number;
  total: number;
  pageStart: number;
  pageEnd: number;
  onPageChange: (next: number) => void;
}) {
  if (totalPages <= 1) return null;
  const safePage = Math.min(page, totalPages);
  const pageNumbers = Array.from({ length: totalPages }, (_, i) => i + 1);
  return (
    <nav aria-label="分页" className="flex items-center justify-between border-t border-[var(--border)] px-5 py-3 text-xs">
      <p className="text-[var(--text-muted)]">
        第 <span className="font-semibold tabular-nums text-[var(--text-secondary)]">{pageStart}-{pageEnd}</span> 个 / 共 <span className="font-semibold tabular-nums text-[var(--text-secondary)]">{total}</span> 个
      </p>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onPageChange(Math.max(1, safePage - 1))}
          disabled={safePage <= 1}
          aria-label="上一页"
          className="inline-flex items-center gap-1 rounded-lg border border-[var(--border)] px-2.5 py-1 text-[11px] font-semibold text-[var(--text-secondary)] hover:border-[var(--brand)] hover:text-[var(--brand)] disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronLeft className="h-3 w-3" />上一页
        </button>
        {pageNumbers.map((n) => {
          const active = n === safePage;
          return (
            <button
              key={n}
              type="button"
              onClick={() => onPageChange(n)}
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
          onClick={() => onPageChange(Math.min(totalPages, safePage + 1))}
          disabled={safePage >= totalPages}
          aria-label="下一页"
          className="inline-flex items-center gap-1 rounded-lg border border-[var(--border)] px-2.5 py-1 text-[11px] font-semibold text-[var(--text-secondary)] hover:border-[var(--brand)] hover:text-[var(--brand)] disabled:cursor-not-allowed disabled:opacity-40"
        >
          下一页<ChevronRight className="h-3 w-3" />
        </button>
      </div>
    </nav>
  );
}