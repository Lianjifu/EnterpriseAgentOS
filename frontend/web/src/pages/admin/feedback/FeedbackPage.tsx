/**
 * AdminFeedback — orchestrator。
 * 反馈 / 工单 / 主题 / 规则 走 useApiQuery 拉取;写操作(创建 / 编辑 / 删除 / 批量 / 导入导出 / 规则启用停用)走本地乐观更新。
 */
import { Download, MessageSquare, Plus, Upload } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { NoticeBanner } from '@/components/feedback/NoticeBanner';
import { useFeedbackList, useFeedbackRules, useFeedbackTickets, useFeedbackTopics } from '@/api/admin/feedback';
import type { ExchangeFormat, Feedback, FeedbackPriority, FeedbackSentiment, FeedbackStatus, RoutingRule, TabId, Ticket } from '@/api/admin/feedback/schema';
import { uid } from './components/constants';
import { CreateRuleModal, CreateTicketModal, DeleteFeedbackModal, ExportFeedbackModal, ImportFeedbackModal } from './components/Modals';
import { FeedbackDetailDrawer } from './components/FeedbackDetailDrawer';
import { ListTab, OverviewTab, RuleTab, TicketTab, TopicTab } from './components/tabs/Tabs';

export default function FeedbackPage() {
  const remoteList = useFeedbackList();
  const remoteTickets = useFeedbackTickets();
  const remoteTopics = useFeedbackTopics();
  const remoteRules = useFeedbackRules();
  const feedbackData = remoteList.data ?? [];
  const ticketsData = remoteTickets.data ?? [];
  const topicsData = remoteTopics.data ?? [];
  const rulesData = remoteRules.data ?? [];

  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [topics] = useState(topicsData);
  const [rules, setRules] = useState<RoutingRule[]>([]);
  const [tab, setTab] = useState<TabId>('overview');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | FeedbackStatus>('all');
  const [sentimentFilter, setSentimentFilter] = useState<'all' | FeedbackSentiment>('all');
  const [priorityFilter, setPriorityFilter] = useState<'all' | FeedbackPriority>('all');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [detail, setDetail] = useState<Feedback | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Feedback | null>(null);
  const [createTicketOpen, setCreateTicketOpen] = useState(false);
  const [createRuleOpen, setCreateRuleOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [notice, setNotice] = useState('');

  useEffect(() => { setFeedback(feedbackData); }, [feedbackData]);
  useEffect(() => { setTickets(ticketsData); }, [ticketsData]);
  useEffect(() => { setRules(rulesData); }, [rulesData]);

  const counts = useMemo(() => {
    const total = feedback.length;
    const negative = feedback.filter((f) => f.sentiment === 'negative').length;
    const positive = feedback.filter((f) => f.sentiment === 'positive').length;
    const newOnes = feedback.filter((f) => f.status === 'new').length;
    return { total, negative, positive, newOnes };
  }, [feedback]);

  const tabCounts = useMemo(() => ({
    overview: counts.total,
    list: counts.total,
    ticket: tickets.length,
    topic: topics.length,
    rule: rules.length,
  }), [counts.total, tickets.length, topics.length, rules.length]);

  const visibleFeedback = useMemo(() => {
    const q = search.trim().toLowerCase();
    return feedback.filter((f) =>
      (statusFilter === 'all' || f.status === statusFilter) &&
      (sentimentFilter === 'all' || f.sentiment === sentimentFilter) &&
      (priorityFilter === 'all' || f.priority === priorityFilter) &&
      (q.length === 0 || `${f.user} ${f.agent} ${f.topic} ${f.comment} ${f.tags.join(' ')}`.toLowerCase().includes(q)),
    );
  }, [feedback, statusFilter, sentimentFilter, priorityFilter, search]);

  const toggleSelect = (id: string) => setSelectedIds((current) => current.includes(id) ? current.filter((x) => x !== id) : [...current, id]);

  const updateFeedback = (id: string, patch: Partial<Feedback>) => {
    setFeedback((current) => current.map((f) => f.id === id ? { ...f, ...patch } : f));
    if (detail && detail.id === id) setDetail({ ...detail, ...patch });
  };

  const handleSaveDetail = () => {
    if (!detail) return;
    setFeedback((current) => current.map((f) => f.id === detail.id ? { ...detail } : f));
    setNotice(`已保存反馈「${detail.id}」的修改。`);
    setDetail(null);
  };

  const handleDelete = (fb: Feedback) => {
    setFeedback((current) => current.filter((f) => f.id !== fb.id));
    setNotice(`已删除反馈「${fb.id}」。`);
    setDeleteTarget(null);
  };

  const handleQuickTriage = (fb: Feedback) => {
    setFeedback((current) => current.map((f) => f.id === fb.id ? { ...f, status: 'triaged' } : f));
    setNotice(`已分诊:${fb.id}`);
  };

  const handleQuickResolve = (fb: Feedback) => {
    setFeedback((current) => current.map((f) => f.id === fb.id ? { ...f, status: 'resolved' } : f));
    setNotice(`已标记已解决:${fb.id}`);
  };

  const handleBatchTriage = () => {
    setFeedback((current) => current.map((f) => selectedIds.includes(f.id) ? { ...f, status: 'triaged' } : f));
    setNotice(`已批量分诊 ${selectedIds.length} 条。`);
    setSelectedIds([]);
  };
  const handleBatchResolve = () => {
    setFeedback((current) => current.map((f) => selectedIds.includes(f.id) ? { ...f, status: 'resolved' } : f));
    setNotice(`已批量标记已解决 ${selectedIds.length} 条。`);
    setSelectedIds([]);
  };
  const handleBatchDelete = () => {
    setFeedback((current) => current.filter((f) => !selectedIds.includes(f.id)));
    setNotice(`已批量删除 ${selectedIds.length} 条。`);
    setSelectedIds([]);
  };

  const handleCreateTicket = (ticket: Ticket) => {
    setTickets((current) => [ticket, ...current]);
    setNotice(`已创建工单「${ticket.title}」。`);
    setCreateTicketOpen(false);
    setTab('ticket');
  };

  const handleCreateRule = (rule: RoutingRule) => {
    setRules((current) => [rule, ...current]);
    setNotice(`已创建规则「${rule.name}」。`);
    setCreateRuleOpen(false);
  };

  const handleImport = (count: number) => {
    for (let i = 0; i < count; i += 1) {
      const newFb: Feedback = {
        id: uid('fb'),
        agent: '客户沟通助手',
        user: '导入用户',
        session: '会话 #XXXX',
        type: 'comment',
        rating: 4,
        sentiment: 'neutral',
        status: 'new',
        priority: 'medium',
        topic: '导入主题',
        comment: '从外部文件导入的反馈,等待分诊。',
        submittedAt: '刚刚',
        tags: [],
      };
      setFeedback((current) => [newFb, ...current]);
    }
    setNotice(`已导入 ${count} 条反馈。`);
  };

  const handleExport = (format: ExchangeFormat) => {
    const list = selectedIds.length > 0 ? feedback.filter((f) => selectedIds.includes(f.id)) : feedback;
    const payload = list.map((f) => ({ id: f.id, user: f.user, agent: f.agent, topic: f.topic, comment: f.comment, sentiment: f.sentiment, status: f.status }));
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    if (format === 'json') {
      downloadBlob(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }), 'feedback.json');
    } else {
      const yaml = payload.map((p) => `- id: "${p.id}"\n  user: "${p.user}"\n  topic: "${p.topic}"\n  comment: "${p.comment}"\n  sentiment: "${p.sentiment}"`).join('\n');
      downloadBlob(new Blob([`${yaml}\n`], { type: 'text/yaml' }), 'feedback.yaml');
    }
    setNotice(`已导出 ${list.length} 条反馈为 ${format.toUpperCase()} 文件。`);
  };

  const handleRuleToggle = (id: string) => {
    setRules((current) => current.map((r) => r.id === id ? { ...r, enabled: !r.enabled } : r));
    const r = rules.find((x) => x.id === id);
    if (r) setNotice(`已${r.enabled ? '停用' : '启用'}规则「${r.name}」`);
  };

  const handleRuleDelete = (id: string) => {
    const r = rules.find((x) => x.id === id);
    setRules((current) => current.filter((x) => x.id !== id));
    if (r) setNotice(`已删除规则「${r.name}」`);
  };

  const handleCreateTicketFromDetail = () => {
    if (!detail) return;
    const newTicket: Ticket = {
      id: uid('tk'),
      title: `${detail.topic} 反馈工单`,
      feedbackIds: [detail.id],
      owner: '张敏',
      priority: detail.priority,
      status: 'triaged',
      topic: detail.topic,
      description: detail.comment,
      createdAt: '今天',
      dueAt: '本周内',
    };
    setTickets((current) => [newTicket, ...current]);
    setNotice(`已为反馈「${detail.id}」创建工单「${newTicket.title}」`);
    setDetail(null);
    setTab('ticket');
  };

  const positivePct = counts.total > 0 ? (counts.positive / counts.total) * 100 : 0;
  const negativePct = counts.total > 0 ? (counts.negative / counts.total) * 100 : 0;

  return (
    <div className="feedback-page mx-auto w-full max-w-[1440px] space-y-6 p-5 pb-16 sm:p-8 xl:px-10">
      <section className="relative overflow-hidden rounded-[28px] border border-[var(--border)] bg-[var(--surface-1)] px-6 py-8 shadow-[var(--shadow-sm)] sm:px-8">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden rounded-[28px]">
          <div className="absolute right-0 top-0 h-full w-1/2 bg-[radial-gradient(circle_at_top_right,rgba(245,158,11,0.10),transparent_68%)]" />
        </div>
        <div className="relative flex flex-col justify-between gap-6 xl:flex-row xl:items-end">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-amber-700 dark:text-amber-300">ADMIN / 用户反馈</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">让用户的每一条反馈都被看见。</h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--text-muted)]">收集赞踩与修正建议,聚类主题并派单处理,把分散的声音变成改进的燃料。</p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setImportOpen(true)} className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] px-3 text-xs font-semibold text-[var(--text-secondary)] transition hover:border-[var(--brand)] hover:text-[var(--brand)]">
                <Upload className="h-3.5 w-3.5" />导入
              </button>
              <button type="button" onClick={() => setExportOpen(true)} className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] px-3 text-xs font-semibold text-[var(--text-secondary)] transition hover:border-[var(--brand)] hover:text-[var(--brand)]">
                <Download className="h-3.5 w-3.5" />导出
              </button>
              <button type="button" onClick={() => setCreateTicketOpen(true)} className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-[var(--brand)] px-4 text-xs font-semibold text-white transition hover:bg-[var(--brand-hover)]">
                <Plus className="h-4 w-4" />新建工单
              </button>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-[var(--text-muted)]">
              <MessageSquare className="h-3 w-3" />{feedback.length} 条反馈 · {counts.newOnes} 条待分诊 · 正面率 {positivePct.toFixed(0)}%
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
        {[
          { id: 'overview' as TabId, label: '反馈总览', count: tabCounts.overview },
          { id: 'list' as TabId, label: '反馈列表', count: tabCounts.list },
          { id: 'ticket' as TabId, label: '工单管理', count: tabCounts.ticket },
          { id: 'topic' as TabId, label: '反馈主题', count: tabCounts.topic },
          { id: 'rule' as TabId, label: '规则模板', count: tabCounts.rule },
        ].map((t) => (
          <button key={t.id} type="button" onClick={() => setTab(t.id)} aria-pressed={tab === t.id} className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-4 py-2 text-xs font-semibold transition ${tab === t.id ? 'border-[var(--brand)] bg-[var(--brand-light)] text-[var(--brand)]' : 'border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--brand)] hover:text-[var(--brand)]'}`}>
            {t.label}
            <span className="rounded bg-[var(--bg-elevated)] px-1.5 py-0.5 text-[10px] tabular-nums">{t.count}</span>
          </button>
        ))}
      </section>

      {tab === 'overview' && (
        <OverviewTab
          visibleFeedback={visibleFeedback}
          feedback={feedback}
          topics={topics}
          tickets={tickets}
          counts={counts}
          positivePct={positivePct}
          negativePct={negativePct}
          search={search}
          setSearch={setSearch}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          sentimentFilter={sentimentFilter}
          setSentimentFilter={setSentimentFilter}
          priorityFilter={priorityFilter}
          setPriorityFilter={setPriorityFilter}
          selectedIds={selectedIds}
          setSelectedIds={setSelectedIds}
          onSelect={setDetail}
          onToggleSelect={toggleSelect}
          onQuickTriage={handleQuickTriage}
          onQuickResolve={handleQuickResolve}
          onBatchTriage={handleBatchTriage}
          onBatchResolve={handleBatchResolve}
          onBatchDelete={handleBatchDelete}
          onJumpToTickets={() => setTab('ticket')}
        />
      )}
      {tab === 'list' && (
        <ListTab
          visibleFeedback={visibleFeedback}
          search={search}
          setSearch={setSearch}
          selectedIds={selectedIds}
          onSelect={setDetail}
          onToggleSelect={toggleSelect}
          onQuickTriage={handleQuickTriage}
          onQuickResolve={handleQuickResolve}
        />
      )}
      {tab === 'ticket' && (
        <TicketTab tickets={tickets} onCreate={() => setCreateTicketOpen(true)} />
      )}
      {tab === 'topic' && (
        <TopicTab topics={topics} onJumpToTickets={() => setTab('ticket')} />
      )}
      {tab === 'rule' && (
        <RuleTab rules={rules} onCreate={() => setCreateRuleOpen(true)} onToggle={handleRuleToggle} onDelete={handleRuleDelete} />
      )}

      <FeedbackDetailDrawer
        fb={detail}
        onClose={() => setDetail(null)}
        onChange={(patch) => detail && updateFeedback(detail.id, patch)}
        onSave={handleSaveDetail}
        onCreateTicket={handleCreateTicketFromDetail}
      />

      <CreateTicketModal open={createTicketOpen} onClose={() => setCreateTicketOpen(false)} onCreate={handleCreateTicket} />
      <CreateRuleModal open={createRuleOpen} onClose={() => setCreateRuleOpen(false)} onCreate={handleCreateRule} />
      <DeleteFeedbackModal open={deleteTarget !== null} onClose={() => setDeleteTarget(null)} onConfirm={() => deleteTarget && handleDelete(deleteTarget)} fb={deleteTarget} />
      <ImportFeedbackModal open={importOpen} onClose={() => setImportOpen(false)} onImport={handleImport} />
      <ExportFeedbackModal open={exportOpen} onClose={() => setExportOpen(false)} onExport={handleExport} total={feedback.length} selectedCount={selectedIds.length} />
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