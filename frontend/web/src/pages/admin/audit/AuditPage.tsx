/**
 * AdminToolAudit 编排 — 5 tab + Hero + NoticeBanner + 3 modal + 详情抽屉 + 批量工具栏。
 */
import { useEffect, useMemo, useState } from 'react';
import { Download, Plus, ShieldQuestion } from 'lucide-react';
import { NoticeBanner } from '@/components/feedback/NoticeBanner';
import {
  useAuditEntries, useAuditRisks, useAuditRules, useAuditStats, usePermissionScopes,
} from '@/api/admin/audit';
import type {
  AuditEntry, AuditRule, AuditTabId, PermissionScope, RiskEvent,
} from '@/api/admin/audit/schema';
import { TABS } from './components/constants';
import { EntryDetailDrawer } from './components/EntryDetailDrawer';
import { CreateRuleModal } from './components/CreateRuleModal';
import { ExportAuditModal, type ExportFormat } from './components/ExportAuditModal';
import { OverviewTab } from './components/tabs/OverviewTab';
import { RecordTab } from './components/tabs/RecordTab';
import { RiskTab } from './components/tabs/RiskTab';
import { PermissionTab } from './components/tabs/PermissionTab';
import { RuleTab } from './components/tabs/RuleTab';

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

export default function AuditPage() {
  const entriesQuery = useAuditEntries();
  const risksQuery = useAuditRisks();
  const rulesQuery = useAuditRules();
  const scopesQuery = usePermissionScopes();

  const baseEntries = entriesQuery.data ?? [];
  const baseRisks = risksQuery.data ?? [];
  const baseRules = rulesQuery.data ?? [];
  const baseScopes = scopesQuery.data ?? [];

  const [entries, setEntries] = useState<AuditEntry[]>(baseEntries);
  const [risks, setRisks] = useState<RiskEvent[]>(baseRisks);
  const [rules, setRules] = useState<AuditRule[]>(baseRules);
  const [tab, setTab] = useState<AuditTabId>('overview');
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [detail, setDetail] = useState<AuditEntry | null>(null);
  const [createRuleOpen, setCreateRuleOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    if (entries.length === 0 && baseEntries.length > 0) setEntries(baseEntries);
  }, [baseEntries, entries.length]);
  useEffect(() => {
    if (risks.length === 0 && baseRisks.length > 0) setRisks(baseRisks);
  }, [baseRisks, risks.length]);
  useEffect(() => {
    if (rules.length === 0 && baseRules.length > 0) setRules(baseRules);
  }, [baseRules, rules.length]);

  const stats = useAuditStats(entries);
  const unresolvedRisks = risks.filter((r) => !r.resolved).length;

  const tabCounts = useMemo(
    () => ({
      overview: entries.length,
      record: entries.length,
      risk: risks.length,
      permission: baseScopes.length,
      rule: rules.length,
    }),
    [entries.length, risks.length, baseScopes.length, rules.length],
  );

  const toggleSelect = (id: string) =>
    setSelectedIds((current) => (current.includes(id) ? current.filter((x) => x !== id) : [...current, id]));

  const toggleStar = (id: string) =>
    setEntries((current) => current.map((e) => (e.id === id ? { ...e, starred: !e.starred } : e)));

  const handleBatchExport = () => setNotice(`已批量导出 ${selectedIds.length} 条审计记录。`);
  const handleBatchResolve = () => {
    setRisks((current) => current.map((r) => (selectedIds.includes(r.id) ? { ...r, resolved: true } : r)));
    setNotice(`已批量标记 ${selectedIds.length} 个事件为已解决。`);
    setSelectedIds([]);
  };

  const handleExport = (format: ExportFormat) => {
    const list = selectedIds.length > 0 ? entries.filter((s) => selectedIds.includes(s.id)) : entries;
    if (format === 'json') {
      downloadBlob(new Blob([JSON.stringify(list, null, 2)], { type: 'application/json' }), 'audit.json');
    } else {
      const csv = [
        'id,category,tool,actor,severity,outcome,score,time',
        ...list.map((e) => `${e.id},${e.category},${e.toolName},${e.actor},${e.severity},${e.outcome},${e.riskScore},${e.occurredAt}`),
      ].join('\n');
      downloadBlob(new Blob([csv], { type: 'text/csv' }), 'audit.csv');
    }
    setNotice(`已导出 ${list.length} 条审计为 ${format.toUpperCase()} 文件。`);
  };

  const handleCreateRule = (r: AuditRule) => {
    setRules((current) => [r, ...current]);
    setNotice(`已创建审计规则「${r.name}」。`);
  };

  const handleResolveRisk = (id: string) =>
    setRisks((current) => current.map((r) => (r.id === id ? { ...r, resolved: !r.resolved } : r)));

  const handleToggleRule = (id: string) =>
    setRules((current) => current.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r)));

  const handleReReview = (role: string) => setNotice(`已重新审查 ${role}`);
  const handleResolve = (message: string) => setNotice(message);

  return (
    <div className="tool-audit-page mx-auto w-full max-w-[1440px] space-y-6 p-5 pb-16 sm:p-8 xl:px-10">
      <section className="relative overflow-hidden rounded-[28px] border border-[var(--border)] bg-[var(--surface-1)] px-6 py-8 shadow-[var(--shadow-sm)] sm:px-8">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden rounded-[28px]">
          <div className="absolute right-0 top-0 h-full w-1/2 bg-[radial-gradient(circle_at_top_right,rgba(244,63,94,0.10),transparent_68%)]" />
        </div>
        <div className="relative flex flex-col justify-between gap-6 xl:flex-row xl:items-end">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-rose-700 dark:text-rose-300">
              ADMIN / 工具审计
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
              让每一次工具调用都有据可查、有规则可循。
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--text-muted)]">
              追踪工具调用 / 权限越界 / 异常敏感操作,落地规则、归因、处置全流程,让风险可见可处置。
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setExportOpen(true)}
                className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] px-3 text-xs font-semibold text-[var(--text-secondary)] transition hover:border-[var(--brand)] hover:text-[var(--brand)]"
              >
                <Download className="h-3.5 w-3.5" />
                导出
              </button>
              <button
                type="button"
                onClick={() => setNotice('已下发紧急核查任务')}
                className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] px-3 text-xs font-semibold text-[var(--text-secondary)] transition hover:border-rose-500 hover:text-rose-600"
              >
                <ShieldQuestion className="h-3.5 w-3.5" />
                紧急核查
              </button>
              <button
                type="button"
                onClick={() => setCreateRuleOpen(true)}
                className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-rose-600 px-4 text-xs font-semibold text-white transition hover:bg-rose-700"
              >
                <Plus className="h-4 w-4" />
                新建规则
              </button>
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
            className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-4 py-2 text-xs font-semibold transition ${tab === t.id ? 'border-rose-500 bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300' : 'border-[var(--border)] text-[var(--text-secondary)] hover:border-rose-500 hover:text-rose-600'}`}
          >
            {t.label}
            <span className="rounded bg-[var(--bg-elevated)] px-1.5 py-0.5 text-[10px] tabular-nums">{tabCounts[t.id]}</span>
          </button>
        ))}
      </section>

      {tab === 'overview' && (
        <OverviewTab
          entries={entries}
          stats={stats}
          unresolved={unresolvedRisks}
          selectedIds={selectedIds}
          search={search}
          setSearch={setSearch}
          onToggleSelect={toggleSelect}
          onToggleStar={toggleStar}
          onSelect={setDetail}
          onBatchExport={handleBatchExport}
          onBatchResolve={handleBatchResolve}
          onClearSelection={() => setSelectedIds([])}
        />
      )}

      {tab === 'record' && (
        <RecordTab
          entries={entries}
          selectedIds={selectedIds}
          onToggleSelect={toggleSelect}
          onToggleStar={toggleStar}
          onSelect={setDetail}
        />
      )}

      {tab === 'risk' && <RiskTab risks={risks} onToggleResolve={handleResolveRisk} />}

      {tab === 'permission' && <PermissionTab scopes={baseScopes} onReReview={handleReReview} />}

      {tab === 'rule' && (
        <RuleTab rules={rules} onToggleRule={handleToggleRule} onCreateRule={() => setCreateRuleOpen(true)} />
      )}

      <EntryDetailDrawer
        entry={detail}
        rules={rules}
        onClose={() => setDetail(null)}
        onResolve={handleResolve}
      />
      <CreateRuleModal open={createRuleOpen} onClose={() => setCreateRuleOpen(false)} onCreate={handleCreateRule} />
      <ExportAuditModal
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        onExport={handleExport}
        total={entries.length}
        selectedCount={selectedIds.length}
      />
    </div>
  );
}