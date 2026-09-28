import { useMemo, useState } from 'react';
import {
  AlertCircle, AlertTriangle, Bot, CheckCircle2, CircleAlert, CircleDot,
  KeyRound, LineChart, Plus, RefreshCw, Search, Send, ShieldCheck, TrendingDown, Trash2,
} from 'lucide-react';
import { NoticeBanner } from '@/components/feedback/NoticeBanner';
import {
  useModelsList, useProviders, useRouteRules, useHealthEvents,
  useCreateModel, useUpdateModel, useDeleteModel, useToggleStar,
  useCreateRoute, useToggleRoute, useDeleteRoute, useBatchSetStatus,
} from '@/api/admin/models';
import type { Model, ModelFilters, ExchangeFormat } from '@/api/admin/models/schema';
import { TABS, STATUS_FILTER, TIER_FILTER, STATUS_BADGE, PROVIDER_BADGE, STRATEGY_META, TASK_LABEL, downloadBlob } from './components/constants';
import { ModelCard } from './components/ModelCard';
import { ModelDetailDrawer } from './components/DrawerPanels';
import { CreateModelModal } from './components/CreateModelModal';
import { CreateRouteModal } from './components/CreateRouteModal';
import { ImportModelModal, ExportModelModal, DeleteModelModal } from './components/ImportExportModals';
import { BatchToolbar } from './components/BatchToolbar';

export default function ModelsPage() {
  const [filters, setFilters] = useState<ModelFilters>({ search: '', status: 'all', tier: 'all' });
  const [tab, setTab] = useState<'overview' | 'model' | 'provider' | 'route' | 'health'>('overview');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [detail, setDetail] = useState<Model | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Model | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createRouteOpen, setCreateRouteOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [notice, setNotice] = useState('');

  const modelsQ = useModelsList(filters);
  const providersQ = useProviders();
  const routesQ = useRouteRules();
  const healthQ = useHealthEvents();

  const models = useMemo(() => modelsQ.data ?? [], [modelsQ.data]);
  const providers = useMemo(() => providersQ.data ?? [], [providersQ.data]);
  const routes = useMemo(() => routesQ.data ?? [], [routesQ.data]);
  const health = useMemo(() => healthQ.data ?? [], [healthQ.data]);

  const createModel = useCreateModel();
  const updateModel = useUpdateModel();
  const deleteModel = useDeleteModel();
  const toggleStar = useToggleStar();
  const createRoute = useCreateRoute();
  const toggleRoute = useToggleRoute();
  const deleteRoute = useDeleteRoute();
  const batchStatus = useBatchSetStatus();

  const counts = useMemo(() => {
    const total = models.length;
    const active = models.filter((m) => m.status === 'active').length;
    const graying = models.filter((m) => m.status === 'graying').length;
    const calls = models.reduce((s, m) => s + m.calls, 0);
    return { total, active, graying, calls };
  }, [models]);

  const tabCounts = useMemo(() => ({
    overview: counts.total,
    model: counts.total,
    provider: providers.length,
    route: routes.length,
    health: health.length,
  }), [counts.total, providers.length, routes.length, health.length]);

  const visibleModels = useMemo(() => {
    const q = (filters.search ?? '').trim().toLowerCase();
    return models.filter((m) =>
      (filters.status === undefined || filters.status === 'all' || m.status === filters.status) &&
      (filters.tier === undefined || filters.tier === 'all' || m.tier === filters.tier) &&
      (q.length === 0 || `${m.name} ${m.providerName} ${m.description} ${m.tags.join(' ')}`.toLowerCase().includes(q)),
    );
  }, [models, filters]);

  const toggleSelect = (id: string) =>
    setSelectedIds((cur) => cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]);

  const updateLocal = (id: string, patch: Partial<Model>) => {
    setDetail((cur) => cur && cur.id === id ? { ...cur, ...patch } : cur);
    updateModel.mutate({ id, patch });
  };

  const handleSaveDetail = () => {
    if (!detail) return;
    const { id: _id, ...patch } = detail;
    updateModel.mutate({ id: _id, patch });
    setNotice(`已保存模型「${detail.name}」的修改。`);
    setDetail(null);
  };

  const handleDelete = (m: Model) => {
    deleteModel.mutate({ id: m.id });
    setNotice(`已删除模型「${m.name}」。`);
    setDeleteTarget(null);
  };

  const handleToggleStar = (id: string) => {
    const m = models.find((x) => x.id === id);
    if (!m) return;
    toggleStar.mutate({ id, starred: !m.starred });
  };

  const handleBatchEnable = () => {
    batchStatus.mutate({ ids: selectedIds, status: 'active' });
    setNotice(`已批量启用 ${selectedIds.length} 个模型。`);
    setSelectedIds([]);
  };
  const handleBatchDisable = () => {
    batchStatus.mutate({ ids: selectedIds, status: 'retired' });
    setNotice(`已批量下线 ${selectedIds.length} 个模型。`);
    setSelectedIds([]);
  };
  const handleBatchExport = () => setNotice(`已批量导出 ${selectedIds.length} 个模型。`);

  const handleCreateModel = (m: Model) => {
    const { id: _id, trend: _t, ...rest } = m;
    void _id; void _t;
    createModel.mutate(rest as unknown as Parameters<typeof createModel.mutate>[0]);
    setNotice(`已创建模型「${m.name}」。`);
    setCreateOpen(false);
    setTab('model');
  };

  const handleCreateRoute = (r: Model extends never ? never : typeof routes[number]) => {
    const { id: _id, ...rest } = r;
    void _id;
    createRoute.mutate(rest as unknown as Parameters<typeof createRoute.mutate>[0]);
    setNotice(`已创建路由规则「${r.name}」。`);
    setCreateRouteOpen(false);
  };

  const handleImport = (count: number) => {
    setNotice(`已导入 ${count} 个模型。`);
  };

  const handleExport = (format: ExchangeFormat) => {
    const list = selectedIds.length > 0 ? models.filter((m) => selectedIds.includes(m.id)) : models;
    const payload = list.map((m) => ({ id: m.id, name: m.name, provider: m.providerName, status: m.status, priceIn: m.priceIn, priceOut: m.priceOut }));
    if (format === 'json') {
      downloadBlob(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }), 'models.json');
    } else {
      const yaml = payload.map((m) => `- id: "${m.id}"\n  name: "${m.name}"\n  status: "${m.status}"`).join('\n');
      downloadBlob(new Blob([`${yaml}\n`], { type: 'text/yaml' }), 'models.yaml');
    }
    setNotice(`已导出 ${list.length} 个模型为 ${format.toUpperCase()} 文件。`);
  };

  const handleRouteToggle = (id: string) => {
    toggleRoute.mutate({ id });
    const r = routes.find((x) => x.id === id);
    if (r) setNotice(`已${r.enabled ? '停用' : '启用'}规则「${r.name}」`);
  };

  const handleRouteDelete = (id: string) => {
    const r = routes.find((x) => x.id === id);
    deleteRoute.mutate({ id });
    if (r) setNotice(`已删除规则「${r.name}」`);
  };

  const findModel = (id: string) => models.find((m) => m.id === id);

  const modelByProvider = useMemo(() => {
    const map = new Map<string, Model[]>();
    models.forEach((m) => {
      const arr = map.get(m.providerId) || [];
      arr.push(m);
      map.set(m.providerId, arr);
    });
    return map;
  }, [models]);

  return (
    <div className="models-page mx-auto w-full max-w-[1440px] space-y-6 p-5 pb-16 sm:p-8 xl:px-10">
      <section className="relative overflow-hidden rounded-[28px] border border-[var(--border)] bg-[var(--surface-1)] px-6 py-8 shadow-[var(--shadow-sm)] sm:px-8">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden rounded-[28px]">
          <div className="absolute right-0 top-0 h-full w-1/2 bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,0.10),transparent_68%)]" />
        </div>
        <div className="relative flex flex-col justify-between gap-6 xl:flex-row xl:items-end">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-indigo-700 dark:text-indigo-300">ADMIN / 模型配置</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">让模型成为可观测、可路由的能力。</h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--text-muted)]">统一接入多家模型服务,按任务策略路由,实时监控健康与成本水位。</p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setImportOpen(true)} className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] px-3 text-xs font-semibold text-[var(--text-secondary)] transition hover:border-[var(--brand)] hover:text-[var(--brand)]">
                <Send className="h-3.5 w-3.5" />导入
              </button>
              <button type="button" onClick={() => setExportOpen(true)} className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] px-3 text-xs font-semibold text-[var(--text-secondary)] transition hover:border-[var(--brand)] hover:text-[var(--brand)]">
                <LineChart className="h-3.5 w-3.5" />导出
              </button>
              <button type="button" onClick={() => setCreateOpen(true)} className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-[var(--brand)] px-4 text-xs font-semibold text-white transition hover:bg-[var(--brand-hover)]">
                <Plus className="h-4 w-4" />新建模型
              </button>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-[var(--text-muted)]">
              <Bot className="h-3 w-3" />{counts.total} 个模型 · {counts.active} 启用 · 本月调用 {counts.calls.toLocaleString('zh-CN')}
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
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            aria-pressed={tab === t.id}
            className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-4 py-2 text-xs font-semibold transition ${tab === t.id ? 'border-[var(--brand)] bg-[var(--brand-light)] text-[var(--brand)]' : 'border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--brand)] hover:text-[var(--brand)]'}`}
          >
            {t.label}
            <span className="rounded bg-[var(--bg-elevated)] px-1.5 py-0.5 text-[10px] tabular-nums">{tabCounts[t.id]}</span>
          </button>
        ))}
      </section>

      {tab === 'overview' && (
        <>
          {selectedIds.length > 0 && (
            <BatchToolbar
              count={selectedIds.length}
              onClear={() => setSelectedIds([])}
              onBatchEnable={handleBatchEnable}
              onBatchDisable={handleBatchDisable}
              onBatchExport={handleBatchExport}
            />
          )}
          <div className="grid gap-4 lg:grid-cols-3">
            <article className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">模型概览</p>
              <ul className="mt-3 space-y-2 text-xs">
                <li className="flex items-center gap-2"><span className="grid h-6 w-6 place-items-center rounded-full bg-emerald-50 text-emerald-700"><CheckCircle2 className="h-3 w-3" /></span><span className="font-semibold">已启用</span><span className="ml-auto tabular-nums">{counts.active}</span></li>
                <li className="flex items-center gap-2"><span className="grid h-6 w-6 place-items-center rounded-full bg-amber-50 text-amber-700"><AlertCircle className="h-3 w-3" /></span><span className="font-semibold">灰度中</span><span className="ml-auto tabular-nums">{counts.graying}</span></li>
                <li className="flex items-center gap-2"><span className="grid h-6 w-6 place-items-center rounded-full bg-[var(--bg-elevated)] text-[var(--text-secondary)]"><CircleDot className="h-3 w-3" /></span><span className="font-semibold">草稿 / 已下线</span><span className="ml-auto tabular-nums">{counts.total - counts.active - counts.graying}</span></li>
              </ul>
            </article>
            <article className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">本月成本</p>
              <p className="mt-2 text-2xl font-semibold tabular-nums">¥ 12,840</p>
              <p className="mt-1 text-[11px] text-emerald-600 inline-flex items-center gap-1"><TrendingDown className="h-3 w-3" />较预算节省 8.2%</p>
              <div className="mt-3 space-y-1">
                {(['input', 'output'] as const).map((kind) => (
                  <div key={kind} className="flex items-center gap-2 text-[11px]">
                    <span className="font-medium">{kind === 'input' ? '输入' : '输出'}</span>
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--bg-elevated)]">
                      <div className={`h-full ${kind === 'input' ? 'bg-sky-500' : 'bg-violet-500'}`} style={{ width: kind === 'input' ? '42%' : '68%' }} />
                    </div>
                    <span className="tabular-nums text-[var(--text-muted)]">{kind === 'input' ? '¥4,200' : '¥8,640'}</span>
                  </div>
                ))}
              </div>
            </article>
            <article className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">提供商状态</p>
              <ul className="mt-3 space-y-2 text-xs">
                {(['healthy', 'degraded', 'down'] as const).map((s) => {
                  const badge = PROVIDER_BADGE[s];
                  const c = providers.filter((p) => p.status === s).length;
                  return (
                    <li key={s} className="flex items-center gap-2">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${badge.className}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${badge.dot}`} aria-hidden="true" />{badge.label}
                      </span>
                      <span className="ml-auto tabular-nums">{c}</span>
                    </li>
                  );
                })}
              </ul>
            </article>
          </div>
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-5">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-indigo-700 dark:text-indigo-300">模型总览</p>
                <h3 className="mt-2 text-lg font-semibold">所有模型</h3>
                <p className="mt-1 text-xs text-[var(--text-muted)]">{visibleModels.length} 个模型 · {visibleModels.filter((m) => m.starred).length} 个收藏</p>
              </div>
              <div className="relative w-full xl:max-w-xs">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
                <label className="sr-only" htmlFor="md-search">搜索模型</label>
                <input
                  id="md-search"
                  value={filters.search ?? ''}
                  onChange={(e) => setFilters((cur) => ({ ...cur, search: e.target.value }))}
                  placeholder="搜索模型 / 提供商"
                  className="h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-1)] pl-10 pr-3 text-sm outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--brand)]"
                />
              </div>
            </div>
            <div className="mt-5 flex flex-wrap items-center gap-2">
              <label className="sr-only" htmlFor="md-status">按状态筛选</label>
              <select
                id="md-status"
                value={filters.status ?? 'all'}
                onChange={(e) => setFilters((cur) => ({ ...cur, status: e.target.value as ModelFilters['status'] }))}
                className="h-9 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] px-3 text-xs font-medium outline-none"
              >
                {STATUS_FILTER.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
              </select>
              <label className="sr-only" htmlFor="md-tier">按层级筛选</label>
              <select
                id="md-tier"
                value={filters.tier ?? 'all'}
                onChange={(e) => setFilters((cur) => ({ ...cur, tier: e.target.value as ModelFilters['tier'] }))}
                className="h-9 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] px-3 text-xs font-medium outline-none"
              >
                {TIER_FILTER.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
              </select>
            </div>
            <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {visibleModels.map((m) => (
                <ModelCard
                  key={m.id}
                  model={m}
                  selected={selectedIds.includes(m.id)}
                  onToggleSelect={toggleSelect}
                  onSelect={setDetail}
                  onToggleStar={handleToggleStar}
                />
              ))}
            </div>
            {visibleModels.length === 0 && (
              <div className="mt-5 rounded-2xl border border-dashed border-[var(--border-strong)] p-12 text-center">
                <Search className="mx-auto h-6 w-6 text-[var(--text-muted)]" />
                <p className="mt-3 text-sm font-semibold">没有匹配的模型</p>
                <p className="mt-1 text-xs text-[var(--text-muted)]">尝试其他关键词或清除筛选。</p>
              </div>
            )}
          </div>
        </>
      )}

      {tab === 'model' && (
        <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-indigo-700 dark:text-indigo-300">模型列表</p>
              <h3 className="mt-2 text-lg font-semibold">所有模型</h3>
              <p className="mt-1 text-xs text-[var(--text-muted)]">{visibleModels.length} 个结果</p>
            </div>
            <button type="button" onClick={() => setCreateOpen(true)} className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-[var(--brand)] px-3 text-xs font-semibold text-white hover:bg-[var(--brand-hover)]">
              <Plus className="h-3.5 w-3.5" />新建模型
            </button>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {visibleModels.map((m) => (
              <ModelCard
                key={m.id}
                model={m}
                selected={selectedIds.includes(m.id)}
                onToggleSelect={toggleSelect}
                onSelect={setDetail}
                onToggleStar={handleToggleStar}
              />
            ))}
          </div>
        </section>
      )}

      {tab === 'provider' && (
        <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-indigo-700 dark:text-indigo-300">提供商</p>
          <h3 className="mt-2 text-lg font-semibold">模型服务接入</h3>
          <p className="mt-1 text-xs text-[var(--text-muted)]">统一管理多家模型服务的接入点、密钥与运行状态。</p>
          <div className="mt-5 space-y-3">
            {providers.map((p) => {
              const badge = PROVIDER_BADGE[p.status];
              const ms = modelByProvider.get(p.id) || [];
              return (
                <article key={p.id} className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-5">
                  <header className="flex flex-wrap items-center gap-2">
                    <h4 className="text-sm font-semibold">{p.name}</h4>
                    <span className="rounded-full bg-[var(--bg-elevated)] px-2 py-0.5 text-[10px] font-medium">{p.region}</span>
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold ${badge.className}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${badge.dot}`} aria-hidden="true" />{badge.label}
                    </span>
                    <button type="button" onClick={() => setNotice(`已触发 ${p.name} 的健康检查`)} className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-2.5 py-1 text-[10px] font-semibold hover:border-[var(--brand)]">
                      <RefreshCw className="h-3 w-3" />健康检查
                    </button>
                  </header>
                  <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px]">
                    <span className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--bg-elevated)] px-2 py-1 font-mono">{p.baseUrl}</span>
                    <span className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--bg-elevated)] px-2 py-1 font-mono"><KeyRound className="h-3 w-3" />{p.apiKeyMasked}</span>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] sm:grid-cols-4">
                    <div><span className="text-[var(--text-muted)]">接入模型</span><br /><span className="font-semibold tabular-nums">{ms.length}</span></div>
                    <div><span className="text-[var(--text-muted)]">错误率</span><br /><span className={`font-semibold tabular-nums ${p.errorRate > 1 ? 'text-rose-600' : ''}`}>{p.errorRate}%</span></div>
                    <div><span className="text-[var(--text-muted)]">平均延迟</span><br /><span className="font-semibold tabular-nums">{p.avgLatencyMs || '—'}ms</span></div>
                    <div><span className="text-[var(--text-muted)]">当前 QPS</span><br /><span className="font-semibold tabular-nums">{p.qps}</span></div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}

      {tab === 'route' && (
        <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-indigo-700 dark:text-indigo-300">路由策略</p>
              <h3 className="mt-2 text-lg font-semibold">任务级路由规则</h3>
              <p className="mt-1 text-xs text-[var(--text-muted)]">根据任务类型选择主模型 + 降级链,支持灰度发布。</p>
            </div>
            <button type="button" onClick={() => setCreateRouteOpen(true)} className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-[var(--brand)] px-3 text-xs font-semibold text-white hover:bg-[var(--brand-hover)]">
              <Plus className="h-3.5 w-3.5" />新建路由
            </button>
          </div>
          <div className="mt-5 space-y-3">
            {routes.map((r) => {
              const sm = STRATEGY_META[r.strategy];
              const StrIcon = sm.icon;
              const primary = findModel(r.primaryModelId);
              return (
                <article key={r.id} className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-5">
                  <header className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleRouteToggle(r.id)}
                      aria-pressed={r.enabled}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition ${r.enabled ? 'bg-[var(--brand)]' : 'bg-[var(--bg-elevated)]'}`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition ${r.enabled ? 'translate-x-4' : 'translate-x-0.5'}`} />
                    </button>
                    <h4 className="text-sm font-semibold">{r.name}</h4>
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${sm.tone}`}>
                      <StrIcon className="h-3 w-3" />{sm.label}
                    </span>
                    <span className="rounded-full bg-[var(--bg-elevated)] px-2 py-0.5 text-[10px] font-medium">{TASK_LABEL[r.task]}</span>
                    <span className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-[var(--bg-elevated)] px-2 py-0.5 text-[10px] font-medium">优先级 {r.priority}</span>
                    <button type="button" onClick={() => handleRouteDelete(r.id)} aria-label="删除规则" className="grid h-7 w-7 place-items-center rounded-lg text-[var(--text-muted)] hover:bg-rose-50 hover:text-rose-600">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </header>
                  <p className="mt-2 text-[11px] text-[var(--text-muted)]">{r.description}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px]">
                    <span className="rounded-lg bg-[var(--bg-elevated)] px-2 py-1 font-semibold">主:{primary?.name ?? '未匹配'}</span>
                    {r.fallbackModelIds.map((id) => {
                      const m = findModel(id);
                      return <span key={id} className="rounded-lg bg-[var(--bg-elevated)] px-2 py-1 font-medium">降级:{m?.name || id}</span>;
                    })}
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}

      {tab === 'health' && (
        <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-indigo-700 dark:text-indigo-300">健康监控</p>
          <h3 className="mt-2 text-lg font-semibold">最近事件</h3>
          <p className="mt-1 text-xs text-[var(--text-muted)]">提供商故障、延迟、限流与恢复事件。</p>
          <ol className="relative mt-5 space-y-4 border-l border-[var(--border)] pl-5">
            {health.map((e) => {
              const sevBadge = e.type === 'incident'
                ? { label: '故障', className: 'bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300' }
                : e.type === 'latency'
                  ? { label: '延迟', className: 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300' }
                  : e.type === 'quota'
                    ? { label: '配额', className: 'bg-violet-50 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300' }
                    : { label: '恢复', className: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300' };
              const Icon = e.type === 'incident'
                ? AlertTriangle
                : e.type === 'latency'
                  ? LineChart
                  : e.type === 'quota'
                    ? CircleAlert
                    : ShieldCheck;
              return (
                <li key={e.id} className="relative">
                  <span className="absolute -left-[26px] top-1 grid h-5 w-5 place-items-center rounded-full bg-[var(--surface-1)] ring-2 ring-[var(--brand)]">
                    <Icon className="h-3 w-3 text-[var(--brand)]" />
                  </span>
                  <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${sevBadge.className}`}>{sevBadge.label}</span>
                      <span className="text-xs font-semibold">{e.providerName}</span>
                      <span className="ml-auto text-[11px] text-[var(--text-muted)]">{e.occurredAt}</span>
                    </div>
                    <p className="mt-2 text-[11px] leading-5 text-[var(--text-muted)]">{e.message}</p>
                  </div>
                </li>
              );
            })}
          </ol>
        </section>
      )}

      <ModelDetailDrawer
        model={detail}
        routes={routes}
        onClose={() => setDetail(null)}
        onChange={(patch) => detail && updateLocal(detail.id, patch)}
        onSave={handleSaveDetail}
      />
      <CreateModelModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreate={handleCreateModel}
        providers={providers}
      />
      <CreateRouteModal
        open={createRouteOpen}
        onClose={() => setCreateRouteOpen(false)}
        onCreate={handleCreateRoute as never}
        models={models}
      />
      <DeleteModelModal
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && handleDelete(deleteTarget)}
        model={deleteTarget}
      />
      <ImportModelModal open={importOpen} onClose={() => setImportOpen(false)} onImport={handleImport} />
      <ExportModelModal
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        onExport={handleExport}
        total={models.length}
        selectedCount={selectedIds.length}
      />
    </div>
  );
}
