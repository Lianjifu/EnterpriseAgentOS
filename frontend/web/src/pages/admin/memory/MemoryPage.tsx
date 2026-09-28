/**
 * MemoryPage — 5-tab orchestrator + 4 模态 + 乐观更新(useEffect 同步 local↔remote)。
 */
import { useEffect, useMemo, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import {
  useL1Sessions, useL2Facts, useL3Entries, usePromotions, useRetentionPolicies, useMemoryStats,
} from '@/api/admin/memory';
import type {
  L1Session, L2Fact, L3Entry, MemoryLayer, MemoryRange, MemoryTabId, RetentionPolicy,
} from '@/api/admin/memory/schema';
import { TABS } from './components/constants';
import { TimeRangeDropdown } from './components/TimeRangeDropdown';
import { MemoryDetailModal, type DetailEntry } from './components/MemoryDetailModal';
import { PromoteMemoryModal } from './components/PromoteMemoryModal';
import { RetentionPolicyModal } from './components/RetentionPolicyModal';
import { OverviewTab } from './components/tabs/OverviewTab';
import { L1Tab } from './components/tabs/L1Tab';
import { L2Tab } from './components/tabs/L2Tab';
import { L3Tab } from './components/tabs/L3Tab';
import { PolicyTab } from './components/tabs/PolicyTab';

export default function MemoryPage() {
  const [tab, setTab] = useState<MemoryTabId>('overview');
  const [range, setRange] = useState<MemoryRange>('7d');
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState('刚刚');

  const [l1Query, setL1Query] = useState('');
  const [l1StatusFilter, setL1StatusFilter] = useState<'all' | L1Session['status']>('all');

  const [selectedL2Ids, setSelectedL2Ids] = useState<string[]>([]);
  const [detailEntry, setDetailEntry] = useState<DetailEntry | null>(null);
  const [promoteOpen, setPromoteOpen] = useState(false);
  const [promoteIds, setPromoteIds] = useState<string[]>([]);
  const [policyOpen, setPolicyOpen] = useState(false);
  const [policyTarget, setPolicyTarget] = useState<RetentionPolicy | null>(null);

  const remoteL1 = useL1Sessions().data ?? [];
  const remoteL2 = useL2Facts().data ?? [];
  const remoteL3 = useL3Entries().data ?? [];
  const remotePromotions = usePromotions().data ?? [];
  const remotePolicies = useRetentionPolicies().data ?? [];

  const [l1, setL1] = useState<L1Session[]>(remoteL1);
  const [l2, setL2] = useState<L2Fact[]>(remoteL2);
  const [l3, setL3] = useState<L3Entry[]>(remoteL3);
  const [policies, setPolicies] = useState<RetentionPolicy[]>(remotePolicies);
  useEffect(() => setL1(remoteL1), [remoteL1]);
  useEffect(() => setL2(remoteL2), [remoteL2]);
  useEffect(() => setL3(remoteL3), [remoteL3]);
  useEffect(() => setPolicies(remotePolicies), [remotePolicies]);

  const stats = useMemoryStats(l1, l2, l3, remotePromotions);
  const counts = useMemo(() => ({ l1: stats.l1Active, l2: stats.l2Confirmed, l3: stats.l3Published, events: stats.events }), [stats]);
  const pendingCount = useMemo(() => l2.filter((f) => f.status === 'pending').length, [l2]);
  const allUsers = useMemo(() => Array.from(new Set(l2.map((f) => f.userName))).sort(), [l2]);
  const allTeams = useMemo(() => Array.from(new Set(l3.map((k) => k.team))).sort(), [l3]);

  const filteredL1 = useMemo(() => {
    const text = l1Query.trim().toLowerCase();
    return l1.filter((s) => {
      if (l1StatusFilter !== 'all' && s.status !== l1StatusFilter) return false;
      if (text && !`${s.userName} ${s.agentName}`.toLowerCase().includes(text)) return false;
      return true;
    });
  }, [l1, l1Query, l1StatusFilter]);

  const flushSession = (id: string) => setL1((prev) => prev.map((s) => s.id === id ? { ...s, status: 'expired', ttlRemainMin: 0 } : s));
  const flushAll = () => setL1((prev) => prev.map((s) => s.status === 'active' ? { ...s, status: 'expired', ttlRemainMin: 0 } : s));
  const confirmFact = (id: string) => setL2((prev) => prev.map((f) => f.id === id ? { ...f, status: 'confirmed' } : f));
  const retireEntry = (id: string) => setL3((prev) => prev.map((k) => k.id === id ? { ...k, status: 'retired' } : k));
  const publishEntry = (id: string) => setL3((prev) => prev.map((k) => k.id === id ? { ...k, status: 'published' } : k));
  const toggleSelectL2 = (id: string) => setSelectedL2Ids((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  const openPromote = (ids: string[]) => {
    if (ids.length === 0) return;
    setPromoteIds(ids);
    setPromoteOpen(true);
  };
  const submitPromote = (team: string, title: string, summary: string) => {
    const id = `k-${Date.now()}`;
    setL3((prev) => [{ id, team, title, summary, category: '综合', hits: 0, updatedAt: '刚刚', contributor: '管理员', status: 'draft' }, ...prev]);
    setL2((prev) => prev.map((f) => promoteIds.includes(f.id) ? { ...f, promotedToL3: true } : f));
    setSelectedL2Ids([]);
    setPromoteOpen(false);
  };
  const openPolicy = (layer: MemoryLayer) => {
    setPolicyTarget(policies.find((p) => p.layer === layer) ?? null);
    setPolicyOpen(true);
  };
  const savePolicy = (next: RetentionPolicy) => {
    setPolicies((prev) => prev.map((p) => p.layer === next.layer ? next : p));
    setPolicyOpen(false);
  };
  const exportLayer = (layer: MemoryLayer) => {
    const data = layer === 'l1' ? l1 : layer === 'l2' ? l2 : l3;
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${layer}-memory-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };
  const refreshAll = () => {
    if (refreshing) return;
    setRefreshing(true);
    setL1Query(''); setL1StatusFilter('all'); setSelectedL2Ids([]);
    window.setTimeout(() => { setRefreshing(false); setLastRefresh('刚刚'); }, 600);
  };

  return (
    <div className="mx-auto w-full max-w-[1440px] space-y-6 p-5 pb-16 sm:p-8 xl:px-10">
      <section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white px-6 py-8 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:px-8">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden rounded-3xl">
          <div className="absolute right-0 top-0 h-full w-1/2 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.08),transparent_68%)]" />
        </div>
        <div className="relative flex flex-col justify-between gap-6 xl:flex-row xl:items-end">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--brand)]">ADMIN / 记忆管理</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">把企业记忆资产管起来。</h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-500 dark:text-slate-400">按会话上下文、用户长期偏好、团队共享知识三层组织,各有独立的保留策略与命中率。</p>
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <div className="flex items-center gap-2">
              <TimeRangeDropdown value={range} onChange={setRange} />
              <button type="button" onClick={refreshAll} disabled={refreshing} aria-label="刷新全部筛选" className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition hover:border-blue-400 hover:text-blue-700 disabled:cursor-progress disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
                <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              </button>
            </div>
            <p className="text-[10px] text-slate-500 dark:text-slate-400">最后刷新 · {lastRefresh}</p>
          </div>
        </div>
      </section>

      <section aria-label="子模块导航" className="flex flex-wrap items-center gap-2 overflow-x-auto pb-1">
        {TABS.map((item) => {
          const Icon = item.icon;
          const count = item.id === 'overview' ? counts.l1 + counts.l2 + counts.l3 : item.id === 'l1' ? counts.l1 : item.id === 'l2' ? counts.l2 : item.id === 'l3' ? counts.l3 : policies.length;
          return (
            <button key={item.id} type="button" onClick={() => setTab(item.id)} aria-pressed={tab === item.id} className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-4 py-2 text-xs font-semibold transition ${tab === item.id ? 'border-[var(--brand)] bg-[var(--brand-light)] text-[var(--brand)]' : 'border-slate-200 text-slate-700 hover:border-blue-400 hover:text-blue-700 dark:border-slate-700 dark:text-slate-200'}`}>
              <Icon className="h-3.5 w-3.5" />{item.label}<span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] tabular-nums dark:bg-slate-800">{count}</span>
            </button>
          );
        })}
      </section>

      {tab === 'overview' && (
        <OverviewTab
          promotions={remotePromotions}
          policies={policies}
          counts={counts}
          pendingCount={pendingCount}
          onJump={(layer) => setTab(layer)}
          l2Facts={l2}
          l3Entries={l3}
        />
      )}
      {tab === 'l1' && (
        <L1Tab
          sessions={filteredL1}
          query={l1Query}
          onQuery={setL1Query}
          statusFilter={l1StatusFilter}
          onStatusFilter={setL1StatusFilter}
          onFlushAll={flushAll}
          onFlushOne={flushSession}
          onOpen={(s) => setDetailEntry({ kind: 'l1', data: s })}
        />
      )}
      {tab === 'l2' && (
        <L2Tab
          facts={l2}
          users={allUsers}
          selectedIds={selectedL2Ids}
          onToggleSelect={toggleSelectL2}
          onOpen={(f) => setDetailEntry({ kind: 'l2', data: f })}
          onPromote={(id) => openPromote([id])}
          onConfirm={confirmFact}
          onClearSelect={() => setSelectedL2Ids([])}
          onPromoteSelected={() => openPromote(selectedL2Ids)}
        />
      )}
      {tab === 'l3' && (
        <L3Tab
          entries={l3}
          teams={allTeams}
          onOpen={(e) => setDetailEntry({ kind: 'l3', data: e })}
          onRetire={retireEntry}
          onPublish={publishEntry}
        />
      )}
      {tab === 'policy' && (
        <PolicyTab
          policies={policies}
          range={range}
          onExport={exportLayer}
        />
      )}

      {detailEntry && (
        <MemoryDetailModal
          entry={detailEntry}
          onClose={() => setDetailEntry(null)}
          onPromote={detailEntry.kind === 'l2' ? () => openPromote([detailEntry.data.id]) : undefined}
          onConfirm={detailEntry.kind === 'l2' ? () => confirmFact(detailEntry.data.id) : undefined}
          onRetire={detailEntry.kind === 'l3' ? () => retireEntry(detailEntry.data.id) : undefined}
          onPublish={detailEntry.kind === 'l3' ? () => publishEntry(detailEntry.data.id) : undefined}
        />
      )}
      <PromoteMemoryModal open={promoteOpen} factIds={promoteIds} onClose={() => setPromoteOpen(false)} onConfirm={submitPromote} />
      <RetentionPolicyModal open={policyOpen} onClose={() => setPolicyOpen(false)} policy={policyTarget} onSave={savePolicy} />
    </div>
  );
}