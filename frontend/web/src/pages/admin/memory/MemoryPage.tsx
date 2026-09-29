/**
 * MemoryPage — 5-tab orchestrator + 3 模态 + 乐观更新(useEffect 同步 local↔remote)。
 *
 * Wave 2 Hero:标题 + 3 层入口卡 + 时间范围下拉(TimeRangeDropdown 移至 OverviewTab 趋势区)。
 * 删 KPI 矩阵 — 时间范围与趋势绑定,控件随趋势走。
 * Wave 3 prep:detail modal 保留(将被独立路由替代)。
 */
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Brain, Zap } from 'lucide-react';
import {
  useL1Sessions, useL2Facts, useL3Entries, usePromotions, useRetentionPolicies, useMemoryStats, useMemoryTrend,
} from '@/api/admin/memory';
import type {
  L1Session, L2Category, L2Fact, L3Entry, L3Status, MemoryLayer, MemoryRange, MemoryTabId, RetentionPolicy,
} from '@/api/admin/memory/schema';
import { TimeRangeDropdown } from './components/TimeRangeDropdown';
import { PromoteMemoryModal } from './components/PromoteMemoryModal';
import { RetentionPolicyModal } from './components/RetentionPolicyModal';
import { OverviewTab } from './components/tabs/OverviewTab';
import { L1Tab } from './components/tabs/L1Tab';
import { L2Tab } from './components/tabs/L2Tab';
import { L3Tab } from './components/tabs/L3Tab';
import { PolicyTab } from './components/tabs/PolicyTab';

const PAGE_SIZE = 8;
function paginate<T>(items: T[], page: number) {
  const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const pageStart = (safePage - 1) * PAGE_SIZE;
  const slice = items.slice(pageStart, pageStart + PAGE_SIZE);
  return {
    slice,
    totalPages,
    pageStart: items.length === 0 ? 0 : pageStart + 1,
    pageEnd: Math.min(pageStart + slice.length, items.length),
  };
}

export default function MemoryPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<MemoryTabId>('overview');
  const [range, setRange] = useState<MemoryRange>('7d');
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState('刚刚');

  const [l1Query, setL1Query] = useState('');
  const [l1StatusFilter, setL1StatusFilter] = useState<'all' | L1Session['status']>('all');

  const [l2Query, setL2Query] = useState('');
  const [l2Category, setL2Category] = useState<'all' | L2Category>('all');
  const [l2UserFilter, setL2UserFilter] = useState('all');

  const [l3Query, setL3Query] = useState('');
  const [l3TeamFilter, setL3TeamFilter] = useState('all');
  const [l3StatusFilter, setL3StatusFilter] = useState<'all' | L3Status>('all');

  const [selectedL2Ids, setSelectedL2Ids] = useState<string[]>([]);
  const [l1Page, setL1Page] = useState(1);
  const [l2Page, setL2Page] = useState(1);
  const [l3Page, setL3Page] = useState(1);
  useEffect(() => setL1Page(1), [l1Query, l1StatusFilter]);
  useEffect(() => setL2Page(1), [l2Query, l2Category, l2UserFilter]);
  useEffect(() => setL3Page(1), [l3Query, l3TeamFilter, l3StatusFilter]);
  const [promoteOpen, setPromoteOpen] = useState(false);
  const [promoteIds, setPromoteIds] = useState<string[]>([]);
  const [policyOpen, setPolicyOpen] = useState(false);
  const [policyTarget, setPolicyTarget] = useState<RetentionPolicy | null>(null);

  const remoteL1 = useL1Sessions().data ?? [];
  const remoteL2 = useL2Facts().data ?? [];
  const remoteL3 = useL3Entries().data ?? [];
  const remotePromotions = usePromotions().data ?? [];
  const remotePolicies = useRetentionPolicies().data ?? [];
  const { data: trend } = useMemoryTrend(range);

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
  const totalEntries = counts.l1 + counts.l2 + counts.l3;
  const avgHitRate = useMemo(() => policies.length === 0 ? 0 : policies.reduce((s, p) => s + p.hitRate, 0) / policies.length, [policies]);
  const pendingCount = useMemo(() => l2.filter((f) => f.status === 'pending').length, [l2]);
  const pendingFacts = useMemo(() => l2.filter((f) => f.status === 'pending').slice(0, 3), [l2]);
  const pendingL3Drafts = useMemo(() => l3.filter((k) => k.status === 'draft').slice(0, 5), [l3]);
  const pendingTotal = pendingCount + l3.filter((k) => k.status === 'draft').length;
  const todayPromotions = useMemo(() => remotePromotions.filter((e) => e.at.startsWith('今天')).length, [remotePromotions]);
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

  const filteredL2 = useMemo(() => {
    const text = l2Query.trim().toLowerCase();
    return l2.filter((f) => {
      if (l2Category !== 'all' && f.category !== l2Category) return false;
      if (l2UserFilter !== 'all' && f.userName !== l2UserFilter) return false;
      if (text && !`${f.key} ${f.value}`.toLowerCase().includes(text)) return false;
      return true;
    });
  }, [l2, l2Query, l2Category, l2UserFilter]);

  const filteredL3 = useMemo(() => {
    const text = l3Query.trim().toLowerCase();
    return l3.filter((k) => {
      if (l3TeamFilter !== 'all' && k.team !== l3TeamFilter) return false;
      if (l3StatusFilter !== 'all' && k.status !== l3StatusFilter) return false;
      if (text && !`${k.title} ${k.summary} ${k.category}`.toLowerCase().includes(text)) return false;
      return true;
    });
  }, [l3, l3Query, l3TeamFilter, l3StatusFilter]);

  const pagedL1 = useMemo(() => paginate(filteredL1, l1Page), [filteredL1, l1Page]);
  const pagedL2 = useMemo(() => paginate(filteredL2, l2Page), [filteredL2, l2Page]);
  const pagedL3 = useMemo(() => paginate(filteredL3, l3Page), [filteredL3, l3Page]);

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
    setL1Query(''); setL1StatusFilter('all');
    setL2Query(''); setL2Category('all'); setL2UserFilter('all');
    setL3Query(''); setL3TeamFilter('all'); setL3StatusFilter('all');
    setSelectedL2Ids([]);
    window.setTimeout(() => { setRefreshing(false); setLastRefresh('刚刚'); }, 600);
  };

  const openL1 = (s: L1Session) => navigate(`/admin/memory/l1/${encodeURIComponent(s.id)}`);
  const openL2 = (f: L2Fact) => navigate(`/admin/memory/l2/${encodeURIComponent(f.id)}`);
  const openL3 = (e: L3Entry) => navigate(`/admin/memory/l3/${encodeURIComponent(e.id)}`);

  return (
    <div className="mx-auto w-full max-w-[1440px] space-y-6 p-5 pb-16 sm:p-8 xl:px-10">
      <section className="relative overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--surface-1)] px-6 py-8 shadow-sm">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden rounded-3xl">
          <div className="absolute right-0 top-0 h-full w-1/2 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.08),transparent_68%)]" />
        </div>
        <div className="relative flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--brand)]">ADMIN / 记忆管理</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">把企业记忆资产管起来。</h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--text-muted)]">按会话上下文、用户长期偏好、团队共享知识三层组织,各有独立的保留策略与命中率。</p>
          </div>
          <p className="text-[11px] text-[var(--text-muted)]">最后刷新 · {lastRefresh}</p>
        </div>
      </section>

      <section aria-label="子模块导航" className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex items-center gap-1 rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] p-1">
          {(['overview', 'l1', 'l2', 'l3', 'policy'] as MemoryTabId[]).map((id) => {
            const isActive = tab === id;
            const labelMap: Record<MemoryTabId, { label: string; icon: typeof Zap }> = {
              overview: { label: '记忆总览', icon: BookOpen },
              l1: { label: '短期记忆', icon: Zap },
              l2: { label: '长期记忆', icon: Brain },
              l3: { label: '知识记忆', icon: BookOpen },
              policy: { label: '保留策略与评测', icon: Brain },
            };
            const entry = labelMap[id];
            const Icon = entry.icon;
            const count =
              id === 'overview' ? counts.l1 + counts.l2 + counts.l3 :
              id === 'l1' ? counts.l1 :
              id === 'l2' ? counts.l2 :
              id === 'l3' ? counts.l3 :
              policies.length;
            return (
              <button key={id} type="button" onClick={() => setTab(id)} aria-pressed={isActive} className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${isActive ? 'bg-[var(--brand)] text-white shadow-sm' : 'text-[var(--text-secondary)] hover:bg-[var(--surface-1)] hover:text-[var(--brand)]'}`}>
                <Icon className="h-3.5 w-3.5" />{entry.label}<span className={`rounded px-1.5 py-0.5 text-[10px] tabular-nums ${isActive ? 'bg-white/20 text-white' : 'bg-[var(--surface-1)] text-[var(--text-muted)]'}`}>{count}</span>
              </button>
            );
          })}
        </div>
        <TimeRangeDropdown value={range} onChange={setRange} onRefresh={refreshAll} refreshing={refreshing} />
      </section>

      {tab === 'overview' && (
        <OverviewTab
          promotions={remotePromotions}
          policies={policies}
          pendingFacts={pendingFacts}
          pendingL3Drafts={pendingL3Drafts}
          trend={trend ?? { l1Active: [0, 0, 0, 0, 0, 0, 0, 0], l2Hits: [0, 0, 0, 0, 0, 0, 0, 0], l3Hits: [0, 0, 0, 0, 0, 0, 0, 0] }}
          pendingTotal={pendingTotal}
          onConfirm={confirmFact}
          onOpenL2={openL2}
          onOpenL3={openL3}
          onJumpToPolicies={() => setTab('policy')}
        />
      )}
      {tab === 'l1' && (
        <L1Tab
          sessions={pagedL1.slice}
          onFlushAll={flushAll}
          onFlushOne={flushSession}
          onOpen={openL1}
          pagination={{ page: l1Page, totalPages: pagedL1.totalPages, total: filteredL1.length, pageStart: pagedL1.pageStart, pageEnd: pagedL1.pageEnd, onPageChange: setL1Page }}
        />
      )}
      {tab === 'l2' && (
        <L2Tab
          facts={pagedL2.slice}
          users={allUsers}
          selectedIds={selectedL2Ids}
          query={l2Query}
          onQuery={setL2Query}
          category={l2Category}
          onCategory={setL2Category}
          userFilter={l2UserFilter}
          onUserFilter={setL2UserFilter}
          onToggleSelect={toggleSelectL2}
          onOpen={openL2}
          onPromote={(id) => openPromote([id])}
          onConfirm={confirmFact}
          onClearSelect={() => setSelectedL2Ids([])}
          onPromoteSelected={() => openPromote(selectedL2Ids)}
          pagination={{ page: l2Page, totalPages: pagedL2.totalPages, total: filteredL2.length, pageStart: pagedL2.pageStart, pageEnd: pagedL2.pageEnd, onPageChange: setL2Page }}
        />
      )}
      {tab === 'l3' && (
        <L3Tab
          entries={pagedL3.slice}
          teams={allTeams}
          query={l3Query}
          onQuery={setL3Query}
          teamFilter={l3TeamFilter}
          onTeamFilter={setL3TeamFilter}
          statusFilter={l3StatusFilter}
          onStatusFilter={setL3StatusFilter}
          onOpen={openL3}
          onRetire={retireEntry}
          onPublish={publishEntry}
          onCreate={() => window.alert('演示版本未提供新建表单;真实环境会打开向导')}
          pagination={{ page: l3Page, totalPages: pagedL3.totalPages, total: filteredL3.length, pageStart: pagedL3.pageStart, pageEnd: pagedL3.pageEnd, onPageChange: setL3Page }}
        />
      )}
      {tab === 'policy' && (
        <PolicyTab
          policies={policies}
          range={range}
          onExport={exportLayer}
        />
      )}

      <PromoteMemoryModal open={promoteOpen} factIds={promoteIds} onClose={() => setPromoteOpen(false)} onConfirm={submitPromote} />
      <RetentionPolicyModal open={policyOpen} onClose={() => setPolicyOpen(false)} policy={policyTarget} onSave={savePolicy} />
    </div>
  );
}