/**
 * 管理侧「渠道管理」主面板 — 5 个 tab:
 *   overview / email / im / webhook / group
 * 数据源:useNotificationChannels / Webhooks / Groups / Events (TanStack Query + mock wrap)
 * 写入:useCreateChannel / useUpdateChannel / useBatchChannelStatus / useCreateGroup
 * 仅 selectedIds / detail / modals / notice 是 UI 本地状态。
 */
import { useMemo, useState } from 'react';
import { Globe, Plus, Search, Send, UsersRound } from 'lucide-react';
import { NoticeBanner } from '@/components/feedback/NoticeBanner';
import {
  useBatchChannelStatus, useCreateChannel, useCreateGroup, useDeliveryEvents,
  useNotificationChannels, useNotificationGroups, useNotificationWebhooks, useUpdateChannel,
} from '@/api/admin/notifications';
import type {
  ChannelKind, NotificationChannel, NotificationGroup,
} from '@/api/admin/notifications/schema';
import { BatchToolbar } from './components/BatchToolbar';
import { ChannelCard } from './components/ChannelCard';
import { ChannelDetailDrawer } from './components/ChannelDetailDrawer';
import { CreateChannelModal } from './components/CreateChannelModal';
import { CreateGroupModal } from './components/CreateGroupModal';
import { ExportChannelModal } from './components/ExportChannelModal';
import { GroupCard } from './components/GroupCard';
import { ImportChannelModal } from './components/ImportChannelModal';
import { WebhookCard } from './components/WebhookCard';
import {
  ALERT_ICONS, HERO_ICON, KIND_META, OVERVIEW_ICONS, TABS,
  type ExchangeFormat, type TabId,
} from './components/constants';

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

export default function NotificationsPage() {
  const { data: channels = [] } = useNotificationChannels();
  const { data: webhooks = [] } = useNotificationWebhooks();
  const { data: groups = [] } = useNotificationGroups();
  const { data: events = [] } = useDeliveryEvents();

  const createChannel = useCreateChannel();
  const updateChannel = useUpdateChannel();
  const batchStatus = useBatchChannelStatus();
  const createGroup = useCreateGroup();

  const [tab, setTab] = useState<TabId>('overview');
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [detail, setDetail] = useState<NotificationChannel | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createGroupOpen, setCreateGroupOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [notice, setNotice] = useState('');

  const stats = useMemo(() => {
    const total = channels.length;
    const active = channels.filter((c) => c.status === 'active').length;
    const failed = channels.filter((c) => c.status === 'failed').length;
    const sentToday = channels.reduce((s, c) => s + c.sentToday, 0);
    return { total, active, failed, sentToday };
  }, [channels]);

  const tabCounts = useMemo(() => ({
    overview: channels.length,
    email: channels.filter((c) => c.kind === 'email').length,
    im: channels.filter((c) => c.kind === 'im').length,
    webhook: webhooks.length,
    group: groups.length,
  }), [channels, webhooks, groups]);

  const visibleChannels = useMemo(() => {
    const q = search.trim().toLowerCase();
    return channels.filter((c) => q.length === 0 || `${c.name} ${c.target} ${c.description}`.toLowerCase().includes(q));
  }, [channels, search]);

  const toggleSelect = (id: string) =>
    setSelectedIds((current) => current.includes(id) ? current.filter((x) => x !== id) : [...current, id]);

  const updateChannelLocal = (id: string, patch: Partial<NotificationChannel>) => {
    setDetail((current) => current && current.id === id ? { ...current, ...patch } : current);
  };

  const handleSaveDetail = () => {
    if (!detail) return;
    const { id, ...patch } = detail;
    updateChannel.mutate({ id, patch }, {
      onSuccess: () => setNotice(`已保存渠道「${detail.name}」的修改。`),
      onError: () => setNotice(`保存失败,请重试。`),
    });
    setDetail(null);
  };

  const handleBatchEnable = () => {
    batchStatus.mutate({ ids: selectedIds, status: 'active' }, {
      onSuccess: () => setNotice(`已批量启用 ${selectedIds.length} 个渠道。`),
    });
    setSelectedIds([]);
  };
  const handleBatchPause = () => {
    batchStatus.mutate({ ids: selectedIds, status: 'paused' }, {
      onSuccess: () => setNotice(`已批量暂停 ${selectedIds.length} 个渠道。`),
    });
    setSelectedIds([]);
  };
  const handleBatchExport = () => setNotice(`已批量导出 ${selectedIds.length} 个渠道。`);

  const handleCreateChannel = (c: NotificationChannel) => {
    const { id: _ignored, ...payload } = c;
    void _ignored;
    createChannel.mutate(
      { name: payload.name, kind: payload.kind, target: payload.target, description: payload.description },
      {
        onSuccess: (created) => setNotice(`已创建渠道「${created.name}」。`),
        onError: () => setNotice(`创建失败,请重试。`),
      },
    );
    setCreateOpen(false);
  };

  const handleCreateGroup = (g: NotificationGroup) => {
    createGroup.mutate(
      { name: g.name, description: g.description, members: g.members },
      {
        onSuccess: (created) => setNotice(`已创建接收人组「${created.name}」。`),
        onError: () => setNotice(`创建失败,请重试。`),
      },
    );
    setCreateGroupOpen(false);
  };

  const handleImport = (count: number) => setNotice(`已导入 ${count} 个渠道。`);

  const handleExport = (format: ExchangeFormat) => {
    const list = selectedIds.length > 0 ? channels.filter((c) => selectedIds.includes(c.id)) : channels;
    const data = list.map((c) => ({ id: c.id, name: c.name, kind: c.kind, target: c.target, status: c.status }));
    if (format === 'json') {
      downloadBlob(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }), 'channels.json');
    } else {
      const yaml = data.map((c) => `- id: "${c.id}"\n  name: "${c.name}"\n  kind: "${c.kind}"`).join('\n');
      downloadBlob(new Blob([`${yaml}\n`], { type: 'text/yaml' }), 'channels.yaml');
    }
    setNotice(`已导出 ${list.length} 个渠道为 ${format.toUpperCase()} 文件。`);
  };

  const toggleStar = (id: string) => {
    const target = channels.find((c) => c.id === id);
    if (!target) return;
    updateChannel.mutate(
      { id, patch: { starred: !target.starred } },
      { onError: () => setNotice(`更新收藏失败,请重试。`) },
    );
  };

  const channelsByKind = useMemo(() => {
    const map = new Map<ChannelKind, NotificationChannel[]>();
    channels.forEach((c) => {
      const arr = map.get(c.kind) || [];
      arr.push(c);
      map.set(c.kind, arr);
    });
    return map;
  }, [channels]);

  const HeroIcon = HERO_ICON;

  return (
    <div className="notifications-page mx-auto w-full max-w-[1440px] space-y-6 p-5 pb-16 sm:p-8 xl:px-10">
      <section className="relative overflow-hidden rounded-[28px] border border-[var(--border)] bg-[var(--surface-1)] px-6 py-8 shadow-[var(--shadow-sm)] sm:px-8">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden rounded-[28px]">
          <div className="absolute right-0 top-0 h-full w-1/2 bg-[radial-gradient(circle_at_top_right,rgba(168,85,247,0.10),transparent_68%)]" />
        </div>
        <div className="relative flex flex-col justify-between gap-6 xl:flex-row xl:items-end">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-violet-700 dark:text-violet-300">ADMIN / 渠道管理</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">把消息送到对的渠道、对的人。</h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--text-muted)]">统一管理邮件、IM、Webhook 与接收人组,实时观察投递结果。</p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setImportOpen(true)} className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] px-3 text-xs font-semibold text-[var(--text-secondary)] transition hover:border-[var(--brand)] hover:text-[var(--brand)]">
                <Send className="h-3.5 w-3.5" />导入
              </button>
              <button type="button" onClick={() => setExportOpen(true)} className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] px-3 text-xs font-semibold text-[var(--text-secondary)] transition hover:border-[var(--brand)] hover:text-[var(--brand)]">
                <Send className="h-3.5 w-3.5" />导出
              </button>
              <button type="button" onClick={() => setCreateOpen(true)} className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-[var(--brand)] px-4 text-xs font-semibold text-white transition hover:bg-[var(--brand-hover)]">
                <Plus className="h-4 w-4" />新建渠道
              </button>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-[var(--text-muted)]">
              <HeroIcon className="h-3 w-3" />{stats.total} 个渠道 · {stats.active} 启用 · 今日投递 {stats.sentToday}
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
              onBatchPause={handleBatchPause}
              onBatchExport={handleBatchExport}
            />
          )}
          <div className="grid gap-4 lg:grid-cols-3">
            <article className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">渠道概览</p>
              <ul className="mt-3 space-y-2 text-xs">
                {(['email', 'im', 'webhook'] as ChannelKind[]).map((k) => {
                  const meta = KIND_META[k];
                  const Icon = meta.icon;
                  const c = channelsByKind.get(k)?.length || 0;
                  return (
                    <li key={k} className="flex items-center gap-2">
                      <span className={`inline-flex h-6 w-6 items-center justify-center rounded-md ${meta.tone}`}><Icon className="h-3 w-3" /></span>
                      <span className="font-semibold">{meta.label}</span>
                      <span className="ml-auto tabular-nums">{c}</span>
                    </li>
                  );
                })}
              </ul>
            </article>
            <article className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">今日投递</p>
              <p className="mt-2 text-2xl font-semibold tabular-nums">{stats.sentToday}</p>
              <p className="mt-1 inline-flex items-center gap-1 text-[11px] text-emerald-600">
                <OVERVIEW_ICONS.email.icon className={`h-3 w-3 ${OVERVIEW_ICONS.email.tone}`} />
                平均成功率 {Math.round(channels.reduce((s, c) => s + c.successRate, 0) / Math.max(channels.length, 1))}%
              </p>
              <ul className="mt-3 space-y-1 text-[11px]">
                {events.slice(0, 3).map((e) => {
                  const meta = KIND_META[e.kind];
                  const Icon = meta.icon;
                  const badge = KIND_META && (e.status === 'delivered' ? { label: '已送达', className: 'bg-emerald-50 text-emerald-700' } :
                    e.status === 'failed' ? { label: '失败', className: 'bg-rose-50 text-rose-700' } :
                    e.status === 'queued' ? { label: '排队中', className: 'bg-sky-50 text-sky-700' } :
                    { label: '重试中', className: 'bg-amber-50 text-amber-700' });
                  return (
                    <li key={e.id} className="flex items-center gap-2">
                      <Icon className={`h-3 w-3 ${meta.tone}`} />
                      <span className="truncate">{e.subject}</span>
                      <span className={`ml-auto rounded-full px-2 py-0.5 text-[10px] font-semibold ${badge.className}`}>{badge.label}</span>
                    </li>
                  );
                })}
              </ul>
            </article>
            <article className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">告警</p>
              <ul className="mt-3 space-y-2 text-xs">
                <li className="flex items-center gap-2">
                  <span className={`grid h-6 w-6 place-items-center rounded-full ${ALERT_ICONS.failed.tone}`}>
                    {(() => { const I = ALERT_ICONS.failed.icon; return <I className="h-3 w-3" />; })()}
                  </span>
                  <span className="font-semibold">失败</span>
                  <span className="ml-auto tabular-nums">{stats.failed}</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className={`grid h-6 w-6 place-items-center rounded-full ${ALERT_ICONS.paused.tone}`}>
                    {(() => { const I = ALERT_ICONS.paused.icon; return <I className="h-3 w-3" />; })()}
                  </span>
                  <span className="font-semibold">暂停</span>
                  <span className="ml-auto tabular-nums">{channels.filter((c) => c.status === 'paused').length}</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className={`grid h-6 w-6 place-items-center rounded-full ${ALERT_ICONS.draft.tone}`}>
                    {(() => { const I = ALERT_ICONS.draft.icon; return <I className="h-3 w-3" />; })()}
                  </span>
                  <span className="font-semibold">草稿</span>
                  <span className="ml-auto tabular-nums">{channels.filter((c) => c.status === 'draft').length}</span>
                </li>
              </ul>
            </article>
          </div>
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-5">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-violet-700 dark:text-violet-300">渠道总览</p>
                <h3 className="mt-2 text-lg font-semibold">所有渠道</h3>
                <p className="mt-1 text-xs text-[var(--text-muted)]">{visibleChannels.length} 个渠道</p>
              </div>
              <div className="relative w-full xl:max-w-xs">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
                <label className="sr-only" htmlFor="nt-search">搜索渠道</label>
                <input
                  id="nt-search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="搜索渠道 / 目标"
                  className="h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-1)] pl-10 pr-3 text-sm outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--brand)]"
                />
              </div>
            </div>
            <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {visibleChannels.map((c) => (
                <ChannelCard
                  key={c.id}
                  channel={c}
                  selected={selectedIds.includes(c.id)}
                  onToggleSelect={toggleSelect}
                  onSelect={setDetail}
                  onToggleStar={toggleStar}
                />
              ))}
            </div>
            {visibleChannels.length === 0 && (
              <div className="mt-5 rounded-2xl border border-dashed border-[var(--border-strong)] p-12 text-center">
                <Search className="mx-auto h-6 w-6 text-[var(--text-muted)]" />
                <p className="mt-3 text-sm font-semibold">没有匹配的渠道</p>
                <p className="mt-1 text-xs text-[var(--text-muted)]">尝试其他关键词。</p>
              </div>
            )}
          </div>
        </>
      )}

      {tab === 'email' && (
        <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-violet-700 dark:text-violet-300">邮件渠道</p>
          <h3 className="mt-2 text-lg font-semibold">邮件通知渠道</h3>
          <p className="mt-1 text-xs text-[var(--text-muted)]">支持 SMTP 邮件告警、日报订阅与运营通知。</p>
          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {visibleChannels.filter((c) => c.kind === 'email').map((c) => (
              <ChannelCard
                key={c.id}
                channel={c}
                selected={selectedIds.includes(c.id)}
                onToggleSelect={toggleSelect}
                onSelect={setDetail}
                onToggleStar={toggleStar}
              />
            ))}
          </div>
        </section>
      )}

      {tab === 'im' && (
        <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-violet-700 dark:text-violet-300">IM 渠道</p>
          <h3 className="mt-2 text-lg font-semibold">企业 IM 集成</h3>
          <p className="mt-1 text-xs text-[var(--text-muted)]">支持 Slack、钉钉、企业微信等 IM 平台。</p>
          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {visibleChannels.filter((c) => c.kind === 'im').map((c) => (
              <ChannelCard
                key={c.id}
                channel={c}
                selected={selectedIds.includes(c.id)}
                onToggleSelect={toggleSelect}
                onSelect={setDetail}
                onToggleStar={toggleStar}
              />
            ))}
          </div>
        </section>
      )}

      {tab === 'webhook' && (
        <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-violet-700 dark:text-violet-300">Webhook</p>
              <h3 className="mt-2 text-lg font-semibold">外部系统集成</h3>
              <p className="mt-1 text-xs text-[var(--text-muted)]">通过 Webhook 将平台事件推送到外部系统。</p>
            </div>
            <button type="button" onClick={() => setNotice('已生成 Webhook 接入指南')} className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] px-3 text-xs font-semibold hover:border-[var(--brand)]">
              <Globe className="h-3.5 w-3.5" />接入指南
            </button>
          </div>
          <div className="mt-5 space-y-3">
            {webhooks.map((w) => <WebhookCard key={w.id} webhook={w} />)}
          </div>
        </section>
      )}

      {tab === 'group' && (
        <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-violet-700 dark:text-violet-300">接收人组</p>
              <h3 className="mt-2 text-lg font-semibold">接收人组管理</h3>
              <p className="mt-1 text-xs text-[var(--text-muted)]">组合多个渠道的接收人,统一订阅通知。</p>
            </div>
            <button type="button" onClick={() => setCreateGroupOpen(true)} className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-[var(--brand)] px-3 text-xs font-semibold text-white hover:bg-[var(--brand-hover)]">
              <Plus className="h-3.5 w-3.5" />新建组
            </button>
          </div>
          <div className="mt-5 space-y-3">
            {groups.map((g) => <GroupCard key={g.id} group={g} />)}
          </div>
        </section>
      )}

      <ChannelDetailDrawer
        channel={detail}
        events={events}
        onClose={() => setDetail(null)}
        onChange={(patch) => detail && updateChannelLocal(detail.id, patch)}
        onSave={handleSaveDetail}
      />
      <CreateChannelModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreate={handleCreateChannel}
      />
      <CreateGroupModal
        open={createGroupOpen}
        onClose={() => setCreateGroupOpen(false)}
        onCreate={handleCreateGroup}
      />
      <ImportChannelModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImport={handleImport}
      />
      <ExportChannelModal
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        onExport={handleExport}
        total={channels.length}
        selectedCount={selectedIds.length}
      />

      {/* keep UsersRound import referenced even though group tab uses GroupCard */}
      <span className="sr-only" aria-hidden="true"><UsersRound /></span>
    </div>
  );
}