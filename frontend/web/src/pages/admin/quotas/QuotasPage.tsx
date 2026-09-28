import {
  AlertCircle, AlertTriangle, ArrowDown, ArrowUp, CheckCircle2, ClipboardList, Download,
  Power, Plus, Search, Send, TrendingDown, TrendingUp, UsersRound, Wallet,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { NoticeBanner } from '@/components/feedback/NoticeBanner';
import { useAuthStore } from '@/stores/authStore';
import {
  useQuotasAlerts, useQuotasBudgets, useQuotasDepartments, useQuotasUsage,
  useCreateBudget, useCreateAlert, useToggleAlert, useUpdateBudget,
} from '@/api/admin/quotas';
import type { EnterpriseBudget, AlertRule, ExchangeFormat } from '@/api/admin/quotas/schema';
import { BatchToolbar } from './components/BatchToolbar';
import { BudgetCard } from './components/BudgetCard';
import { BudgetDetailDrawer } from './components/DrawerPanels';
import { CreateAlertModal } from './components/CreateAlertModal';
import { CreateBudgetModal } from './components/CreateBudgetModal';
import { ExportBudgetModal, ImportBudgetModal } from './components/ImportExportModals';
import { BUDGET_BADGE, CATEGORY_META, PERIOD_LABEL, SCOPE_LABEL, SEVERITY_BADGE, TABS, downloadBlob } from './components/constants';
import { ProgressBar, Sparkline } from './components/Primitives';

export default function QuotasPage() {
  const me = useAuthStore((s) => s.user);
  const adminName = me?.name ?? me?.email ?? '管理员';
  void adminName;

  const { data: budgets = [] } = useQuotasBudgets();
  const { data: depts = [] } = useQuotasDepartments();
  const { data: usage = [] } = useQuotasUsage();
  const { data: alerts = [] } = useQuotasAlerts();

  const createBudget = useCreateBudget();
  const updateBudget = useUpdateBudget();
  const createAlert = useCreateAlert();
  const toggleAlert = useToggleAlert();

  const [tab, setTab] = useState<typeof TABS[number]['id']>('overview');
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [detail, setDetail] = useState<EnterpriseBudget | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createAlertOpen, setCreateAlertOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [notice, setNotice] = useState('');

  const totals = useMemo(() => {
    const cap = budgets.reduce((s, b) => s + b.totalCap, 0);
    const used = budgets.reduce((s, b) => s + b.used, 0);
    const forecast = budgets.reduce((s, b) => s + b.forecast, 0);
    return { cap, used, forecast };
  }, [budgets]);

  const tabCounts = useMemo(() => ({
    overview: budgets.length,
    enterprise: budgets.length,
    department: depts.length,
    usage: usage.length,
    alert: alerts.length,
  }), [budgets.length, depts.length, usage.length, alerts.length]);

  const visibleBudgets = useMemo(() => {
    const q = search.trim().toLowerCase();
    return budgets.filter((b) => q.length === 0 || `${b.name} ${b.owner} ${b.description}`.toLowerCase().includes(q));
  }, [budgets, search]);

  const toggleSelect = (id: string) => setSelectedIds((current) => current.includes(id) ? current.filter((x) => x !== id) : [...current, id]);

  const updateBudgetLocal = (id: string, patch: Partial<EnterpriseBudget>) => {
    if (detail && detail.id === id) setDetail({ ...detail, ...patch });
  };

  const handleSaveDetail = () => {
    if (!detail) return;
    updateBudget.mutate({ id: detail.id, patch: detail });
    setNotice(`已保存预算「${detail.name}」的修改。`);
    setDetail(null);
  };

  const handleBatchFreeze = () => {
    selectedIds.forEach((id) => updateBudget.mutate({ id, patch: { status: 'frozen' } }));
    setNotice(`已批量冻结 ${selectedIds.length} 个预算。`);
    setSelectedIds([]);
  };

  const handleBatchExport = () => setNotice(`已批量导出 ${selectedIds.length} 个预算。`);

  const handleCreateBudget = (b: EnterpriseBudget) => {
    const { id: _ignored, ...payload } = b;
    void _ignored;
    createBudget.mutate(payload);
    setNotice(`已创建预算「${b.name}」。`);
    setCreateOpen(false);
    setTab('enterprise');
  };

  const handleCreateAlert = (a: AlertRule) => {
    const { id: _ignored, ...rest } = a;
    void _ignored;
    createAlert.mutate({ ...rest, notify: a.notify.join(',') });
    setNotice(`已创建告警规则「${a.name}」。`);
    setCreateAlertOpen(false);
  };

  const handleImport = (count: number) => {
    setNotice(`已导入 ${count} 个预算。`);
  };

  const handleExport = (format: ExchangeFormat) => {
    const list = selectedIds.length > 0 ? budgets.filter((b) => selectedIds.includes(b.id)) : budgets;
    const data = list.map((b) => ({ id: b.id, name: b.name, period: PERIOD_LABEL[b.period], totalCap: b.totalCap, used: b.used, owner: b.owner }));
    if (format === 'json') {
      downloadBlob(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }), 'budgets.json');
    } else if (format === 'yaml') {
      const yaml = data.map((b) => `- id: "${b.id}"\n  name: "${b.name}"\n  period: "${b.period}"`).join('\n');
      downloadBlob(new Blob([`${yaml}\n`], { type: 'text/yaml' }), 'budgets.yaml');
    } else {
      const header = 'id,name,period,totalCap,used,owner';
      const lines = data.map((b) => [b.id, b.name, b.period, b.totalCap, b.used, b.owner].join(','));
      downloadBlob(new Blob([[header, ...lines].join('\n')], { type: 'text/csv' }), 'budgets.csv');
    }
    setNotice(`已导出 ${list.length} 个预算为 ${format.toUpperCase()} 文件。`);
  };

  const handleAlertToggle = (id: string) => {
    toggleAlert.mutate({ id });
    const a = alerts.find((x) => x.id === id);
    if (a) setNotice(`已${a.enabled ? '停用' : '启用'}规则「${a.name}」`);
  };

  return (
    <div className="quotas-page mx-auto w-full max-w-[1440px] space-y-6 p-5 pb-16 sm:p-8 xl:px-10">
      <section className="relative overflow-hidden rounded-[28px] border border-[var(--border)] bg-[var(--surface-1)] px-6 py-8 shadow-[var(--shadow-sm)] sm:px-8">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden rounded-[28px]">
          <div className="absolute right-0 top-0 h-full w-1/2 bg-[radial-gradient(circle_at_top_right,rgba(34,197,94,0.10),transparent_68%)]" />
        </div>
        <div className="relative flex flex-col justify-between gap-6 xl:flex-row xl:items-end">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-700 dark:text-emerald-300">ADMIN / 额度管理</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">让每一笔用量都心中有数。</h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--text-muted)]">统一管理企业预算、部门分配、实时用量与告警规则。</p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setImportOpen(true)} className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] px-3 text-xs font-semibold text-[var(--text-secondary)] transition hover:border-[var(--brand)] hover:text-[var(--brand)]">
                <Send className="h-3.5 w-3.5" />导入
              </button>
              <button type="button" onClick={() => setExportOpen(true)} className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] px-3 text-xs font-semibold text-[var(--text-secondary)] transition hover:border-[var(--brand)] hover:text-[var(--brand)]">
                <Download className="h-3.5 w-3.5" />导出
              </button>
              <button type="button" onClick={() => setCreateOpen(true)} className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-[var(--brand)] px-4 text-xs font-semibold text-white transition hover:bg-[var(--brand-hover)]">
                <Plus className="h-4 w-4" />新建预算
              </button>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-[var(--text-muted)]">
              <Wallet className="h-3 w-3" />总预算 ¥ {totals.cap.toLocaleString('zh-CN')} · 已用 ¥ {totals.used.toLocaleString('zh-CN')}
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
          <button key={t.id} type="button" onClick={() => setTab(t.id)} aria-pressed={tab === t.id} className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-4 py-2 text-xs font-semibold transition ${tab === t.id ? 'border-[var(--brand)] bg-[var(--brand-light)] text-[var(--brand)]' : 'border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--brand)] hover:text-[var(--brand)]'}`}>
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
              onBatchFreeze={handleBatchFreeze}
              onBatchExport={handleBatchExport}
            />
          )}
          <div className="grid gap-4 lg:grid-cols-3">
            <article className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">预算总览</p>
              <ul className="mt-3 space-y-2 text-xs">
                {(Object.keys(BUDGET_BADGE) as Array<keyof typeof BUDGET_BADGE>).map((s) => {
                  const Icon = s === 'healthy' ? CheckCircle2 : s === 'warning' ? AlertCircle : s === 'exceeded' ? AlertTriangle : Power;
                  const toneCls = s === 'healthy' ? 'bg-emerald-50 text-emerald-700' : s === 'warning' ? 'bg-amber-50 text-amber-700' : s === 'exceeded' ? 'bg-rose-50 text-rose-700' : 'bg-[var(--bg-elevated)] text-[var(--text-secondary)]';
                  return (
                    <li key={s} className="flex items-center gap-2">
                      <span className={`grid h-6 w-6 place-items-center rounded-full ${toneCls}`}><Icon className="h-3 w-3" /></span>
                      <span className="font-semibold">{BUDGET_BADGE[s].label}</span>
                      <span className="ml-auto tabular-nums">{budgets.filter((b) => b.status === s).length}</span>
                    </li>
                  );
                })}
              </ul>
            </article>
            <article className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">本月用量</p>
              <p className="mt-2 text-2xl font-semibold tabular-nums">¥ {totals.used.toLocaleString('zh-CN')}</p>
              <p className="mt-1 inline-flex items-center gap-1 text-[11px] text-amber-700"><TrendingUp className="h-3 w-3" />较上月上升 12.4%</p>
              <div className="mt-3 space-y-1">
                {usage.map((u) => {
                  const meta = CATEGORY_META[u.category];
                  const Icon = meta.icon;
                  return (
                    <div key={u.id} className="flex items-center gap-2 text-[11px]">
                      <Icon className="h-3 w-3 text-[var(--brand)]" />
                      <span className="font-medium">{u.label}</span>
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--bg-elevated)]">
                        <div className="h-full bg-emerald-500" style={{ width: `${Math.min(100, (u.used / u.total) * 100)}%` }} />
                      </div>
                      <span className="tabular-nums text-[var(--text-muted)]">{u.used}/{u.total}{u.unit}</span>
                    </div>
                  );
                })}
              </div>
            </article>
            <article className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">预测结余</p>
              <p className="mt-2 text-2xl font-semibold tabular-nums">¥ {Math.max(0, totals.cap - totals.forecast).toLocaleString('zh-CN')}</p>
              <p className="mt-1 inline-flex items-center gap-1 text-[11px] text-emerald-600"><TrendingDown className="h-3 w-3" />预计节省 {Math.round(Math.max(0, (1 - totals.forecast / totals.cap) * 100))}%</p>
              <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
                <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] p-2"><p className="text-[var(--text-muted)]">告警规则</p><p className="mt-0.5 font-semibold tabular-nums">{alerts.filter((a) => a.enabled).length} 启用</p></div>
                <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] p-2"><p className="text-[var(--text-muted)]">部门数</p><p className="mt-0.5 font-semibold tabular-nums">{depts.length}</p></div>
              </div>
            </article>
          </div>
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-5">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-300">额度总览</p>
                <h3 className="mt-2 text-lg font-semibold">所有预算</h3>
                <p className="mt-1 text-xs text-[var(--text-muted)]">{visibleBudgets.length} 个预算</p>
              </div>
              <div className="relative w-full xl:max-w-xs">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
                <label className="sr-only" htmlFor="qt-search">搜索预算</label>
                <input id="qt-search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="搜索预算名称 / 负责人" className="h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-1)] pl-10 pr-3 text-sm outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--brand)]" />
              </div>
            </div>
            <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {visibleBudgets.map((b) => (
                <BudgetCard key={b.id} budget={b} selected={selectedIds.includes(b.id)} onToggleSelect={toggleSelect} onSelect={setDetail} />
              ))}
            </div>
            {visibleBudgets.length === 0 && (
              <div className="mt-5 rounded-2xl border border-dashed border-[var(--border-strong)] p-12 text-center">
                <Search className="mx-auto h-6 w-6 text-[var(--text-muted)]" />
                <p className="mt-3 text-sm font-semibold">没有匹配的预算</p>
                <p className="mt-1 text-xs text-[var(--text-muted)]">尝试其他关键词。</p>
              </div>
            )}
          </div>
        </>
      )}

      {tab === 'enterprise' && (
        <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-300">企业预算</p>
              <h3 className="mt-2 text-lg font-semibold">所有企业预算</h3>
              <p className="mt-1 text-xs text-[var(--text-muted)]">{visibleBudgets.length} 个预算</p>
            </div>
            <button type="button" onClick={() => setCreateOpen(true)} className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-[var(--brand)] px-3 text-xs font-semibold text-white hover:bg-[var(--brand-hover)]">
              <Plus className="h-3.5 w-3.5" />新建预算
            </button>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {visibleBudgets.map((b) => (
              <BudgetCard key={b.id} budget={b} selected={selectedIds.includes(b.id)} onToggleSelect={toggleSelect} onSelect={setDetail} />
            ))}
          </div>
        </section>
      )}

      {tab === 'department' && (
        <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-300">部门额度</p>
              <h3 className="mt-2 text-lg font-semibold">部门额度使用</h3>
              <p className="mt-1 text-xs text-[var(--text-muted)]">查看每个部门在预算内的额度使用情况。</p>
            </div>
            <button type="button" onClick={() => setNotice('已生成部门额度报告')} className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] px-3 text-xs font-semibold hover:border-[var(--brand)]">
              <ClipboardList className="h-3.5 w-3.5" />生成报告
            </button>
          </div>
          <div className="mt-5 space-y-3">
            {depts.map((d) => {
              const tone = d.pct >= 80 ? 'rose' : d.pct >= 60 ? 'amber' : 'emerald';
              return (
                <article key={d.id} className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-5">
                  <header className="flex flex-wrap items-center gap-2">
                    <span className="grid h-9 w-9 place-items-center rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"><UsersRound className="h-4 w-4" /></span>
                    <h4 className="text-sm font-semibold">{d.name}</h4>
                    <span className="rounded-full bg-[var(--bg-elevated)] px-2 py-0.5 text-[10px] font-medium">{d.members} 人</span>
                    <span className="rounded-full bg-[var(--bg-elevated)] px-2 py-0.5 text-[10px] font-medium">{d.manager}</span>
                    <span className="ml-auto rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-semibold text-violet-700 dark:bg-violet-500/15 dark:text-violet-300">排名 {d.rank}</span>
                  </header>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] sm:grid-cols-4">
                    <div><span className="text-[var(--text-muted)]">分配</span><br /><span className="font-semibold tabular-nums">¥ {d.allocated.toLocaleString('zh-CN')}</span></div>
                    <div><span className="text-[var(--text-muted)]">已用</span><br /><span className="font-semibold tabular-nums">¥ {d.used.toLocaleString('zh-CN')}</span></div>
                    <div><span className="text-[var(--text-muted)]">使用率</span><br /><span className="font-semibold tabular-nums">{d.pct}%</span></div>
                    <div><span className="text-[var(--text-muted)]">最近高峰</span><br /><span className="font-semibold">{d.lastSpikeAt}</span></div>
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <Sparkline data={d.trend} stroke="#22c55e" />
                    <span className="rounded-lg bg-[var(--bg-elevated)] px-2 py-1 text-[10px] font-medium">Top:{d.topChannel}</span>
                  </div>
                  <div className="mt-3">
                    <ProgressBar used={d.used} total={d.allocated} tone={tone} />
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}

      {tab === 'usage' && (
        <section className="space-y-5">
          {usage.map((u) => {
            const meta = CATEGORY_META[u.category];
            const Icon = meta.icon;
            const pct = Math.round((u.used / u.total) * 100);
            return (
              <article key={u.id} className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-5">
                <header className="flex flex-wrap items-center gap-2">
                  <span className={`grid h-9 w-9 place-items-center rounded-lg ${meta.tone}`}><Icon className="h-4 w-4" /></span>
                  <h4 className="text-sm font-semibold">{u.label}</h4>
                  <span className="rounded-full bg-[var(--bg-elevated)] px-2 py-0.5 text-[10px] font-medium">{u.used} / {u.total} {u.unit}</span>
                  <span className={`ml-auto inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${u.delta >= 0 ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'}`}>
                    {u.delta >= 0 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}{Math.abs(u.delta)}%
                  </span>
                </header>
                <div className="mt-3">
                  <ProgressBar used={u.used} total={u.total} tone={pct >= 80 ? 'rose' : pct >= 60 ? 'amber' : 'emerald'} />
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <Sparkline data={u.trend} stroke="#22c55e" />
                  <p className="text-[10px] text-[var(--text-muted)]">过去 12 个月</p>
                </div>
              </article>
            );
          })}
        </section>
      )}

      {tab === 'alert' && (
        <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-300">告警规则</p>
              <h3 className="mt-2 text-lg font-semibold">额度告警规则</h3>
              <p className="mt-1 text-xs text-[var(--text-muted)]">为额度使用配置阈值与通知渠道。</p>
            </div>
            <button type="button" onClick={() => setCreateAlertOpen(true)} className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-[var(--brand)] px-3 text-xs font-semibold text-white hover:bg-[var(--brand-hover)]">
              <Plus className="h-3.5 w-3.5" />新建规则
            </button>
          </div>
          <div className="mt-5 space-y-3">
            {alerts.map((a) => {
              const sev = SEVERITY_BADGE[a.severity];
              return (
                <article key={a.id} className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-5">
                  <header className="flex flex-wrap items-center gap-2">
                    <button type="button" onClick={() => handleAlertToggle(a.id)} aria-pressed={a.enabled} className={`relative inline-flex h-5 w-9 items-center rounded-full transition ${a.enabled ? 'bg-[var(--brand)]' : 'bg-[var(--bg-elevated)]'}`}>
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition ${a.enabled ? 'translate-x-4' : 'translate-x-0.5'}`} />
                    </button>
                    <h4 className="text-sm font-semibold">{a.name}</h4>
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${sev.className}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${sev.dot}`} aria-hidden="true" />{sev.label}
                    </span>
                    <span className="rounded-full bg-[var(--bg-elevated)] px-2 py-0.5 text-[10px] font-medium">{SCOPE_LABEL[a.scope]}</span>
                    <span className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-[var(--bg-elevated)] px-2 py-0.5 text-[10px] font-medium">静默 {a.cooldown}</span>
                  </header>
                  <p className="mt-2 text-[11px] text-[var(--text-muted)]">{a.description}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px]">
                    <span className="rounded-lg bg-[var(--bg-elevated)] px-2 py-1 font-semibold">指标:{a.metric}</span>
                    <span className="rounded-lg bg-[var(--bg-elevated)] px-2 py-1 font-medium">阈值 ≥ {a.threshold}</span>
                    <span className="rounded-lg bg-[var(--bg-elevated)] px-2 py-1 font-medium">通知:{a.notify.join(', ')}</span>
                    <span className="rounded-lg bg-[var(--bg-elevated)] px-2 py-1 font-medium">最近触发:{a.lastTriggered}</span>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}

      <BudgetDetailDrawer
        budget={detail}
        depts={depts}
        onClose={() => setDetail(null)}
        onChange={(patch) => detail && updateBudgetLocal(detail.id, patch)}
        onSave={handleSaveDetail}
      />
      <CreateBudgetModal open={createOpen} onClose={() => setCreateOpen(false)} onCreate={handleCreateBudget} />
      <CreateAlertModal open={createAlertOpen} onClose={() => setCreateAlertOpen(false)} onCreate={handleCreateAlert} />
      <ImportBudgetModal open={importOpen} onClose={() => setImportOpen(false)} onImport={handleImport} />
      <ExportBudgetModal open={exportOpen} onClose={() => setExportOpen(false)} onExport={handleExport} total={budgets.length} selectedCount={selectedIds.length} />
    </div>
  );
}