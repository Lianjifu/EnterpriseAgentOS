import { BookOpen, ChevronDown, ClipboardList, ExternalLink, HelpCircle, LifeBuoy, MessageCircleQuestion, Search, Sparkles, TerminalSquare } from 'lucide-react';
import { useMemo, useState } from 'react';
import { CenterModal } from '@/components/feedback/CenterModal';
import { NoticeBanner } from '@/components/feedback/NoticeBanner';

type HelpTopic = { id: string; title: string; description: string; icon: typeof BookOpen; color: string };
type Faq = { question: string; answer: string; topic: string };

const userTopics: HelpTopic[] = [
  { id: 'start', title: '快速开始', description: '从第一个目标开始，了解如何选择智能体并得到结果。', icon: Sparkles, color: 'bg-violet-50 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300' },
  { id: 'tasks', title: '跟进任务', description: '查看执行进度、完成确认和处理异常结果。', icon: ClipboardList, color: 'bg-sky-50 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300' },
  { id: 'knowledge', title: '使用知识', description: '查找资料、理解来源，并让答案更可信。', icon: BookOpen, color: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300' },
  { id: 'workspace', title: '工作空间', description: '管理协作内容、偏好和工作台设置。', icon: TerminalSquare, color: 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300' },
];
const userFaqs: Faq[] = [
  { question: '如何开始一次新的工作？', answer: '进入“我的对话”，描述你想完成的目标。你可以直接选择建议动作，也可以先从智能体库选择一个工作助手。', topic: '快速开始' },
  { question: '智能体生成的结果可以直接使用吗？', answer: '重要结果需要你检查来源和范围。涉及外部发送、数据修改或高风险动作时，平台会在执行前请求确认。', topic: '快速开始' },
  { question: '在哪里查看正在执行的任务？', answer: '打开“我的任务”，可以按状态、来源和关键词筛选；点击任务可查看输入、进度和下一步操作。', topic: '我的任务' },
  { question: '怎样判断知识回答是否可信？', answer: '查看回答下方的来源和引用位置。优先使用有维护团队、更新时间和清晰范围的资料。', topic: '我的知识' },
  { question: '如何切换深色模式？', answer: '点击工作台顶部的主题按钮，或进入“设置 > 偏好”，主题会保存在当前浏览器中。', topic: '设置' },
  { question: '如何邀请团队成员协作？', answer: '进入“我的协作”，选择协作空间并点击“邀请协作者”。当前页面提供本地演示，真实邀请需要连接团队服务。', topic: '我的协作' },
];

const adminTopics: HelpTopic[] = [
  { id: 'agent', title: '智能体管理', description: '创建、评测和发布企业智能体。', icon: Sparkles, color: 'bg-violet-50 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300' },
  { id: 'knowledge', title: '知识管理', description: '维护资料来源、加工状态和访问权限。', icon: BookOpen, color: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300' },
  { id: 'workflow', title: '流程与工具', description: '编排自动化流程并接入外部系统。', icon: ClipboardList, color: 'bg-sky-50 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300' },
  { id: 'govern', title: '合规与监控', description: '配置模型、额度、告警、审计与合规策略。', icon: TerminalSquare, color: 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300' },
];
const adminFaqs: Faq[] = [
  { question: '如何发布一个智能体给用户使用？', answer: '进入“智能体管理”，完成草稿、评测和发布三步。发布后该智能体会出现在用户的“智能体库”。', topic: '智能体管理' },
  { question: '知识库如何保证回答质量？', answer: '在“知识管理”维护来源、加工任务和访问范围；通过“检索评测”持续校验召回与准确率。', topic: '知识管理' },
  { question: '怎样接入一个新的外部工具？', answer: '进入“技能管理”，新增 Skill / Tool 能力并配置鉴权与访问权限；上线后用户即可在“我的技能”选用。', topic: '流程与工具' },
  { question: '告警应该如何分级？', answer: '在“告警配置”按严重程度（提醒 / 警告 / 严重）和通知渠道分级，避免用户被低优先级信息打扰。', topic: '合规与监控' },
  { question: '如何导出审计日志？', answer: '在“审计日志”页面，按时间范围或成员筛选后点击“导出审计”，会生成可下载的文件。', topic: '合规与监控' },
  { question: '管理员如何进入用户视角？', answer: '登录后默认进入用户工作台；点击顶部“返回企智搭工作台”可在用户/管理两侧切换。', topic: '系统设置' },
];

const audienceMeta = {
  user: { eyebrow: 'HELP / 帮助中心', heading: '想知道什么？从这里开始。', sub: '找到下一步的答案，或者告诉我们哪里还可以更清楚。', placeholder: '搜索“如何开始”“任务”“知识来源”…', hots: ['如何开始', '我的任务', '知识来源', '深色模式'], dialogTitle: '提交帮助反馈', dialogDesc: '描述哪里不清楚，帮助我们改进下一版说明。', dialogPlaceholder: '例如：我想知道如何查看一次任务的完整执行过程' },
  admin: { eyebrow: 'ADMIN HELP / 管理员帮助', heading: '管理员从这里开始。', sub: '查看能力建设、平台治理与组织管理的常见操作与文档。', placeholder: '搜索"智能体发布""知识评测""告警分级"...', hots: ['智能体发布', '知识评测', '告警分级', '审计导出'], dialogTitle: '提交管理员反馈', dialogDesc: '描述管理动作中不清楚的地方，我们会在下一版说明中改进。', dialogPlaceholder: '例如：我想知道如何为某个部门单独发布一个智能体' },
} as const;

export default function HelpCenter({ audience = 'user' }: { audience?: 'user' | 'admin' }) {
  const meta = audienceMeta[audience];
  const topics = audience === 'admin' ? adminTopics : userTopics;
  const faqs = audience === 'admin' ? adminFaqs : userFaqs;
  const [query, setQuery] = useState('');
  const [topic, setTopic] = useState<string | null>(null);
  const [openFaq, setOpenFaq] = useState<string | null>(null);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [notice, setNotice] = useState('');
  const visibleFaqs = useMemo(() => faqs.filter((faq) => (!topic || faq.topic === topic) && `${faq.question} ${faq.answer} ${faq.topic}`.toLowerCase().includes(query.trim().toLowerCase())), [topic, query, faqs]);
  const searchTopic = (nextTopic: string) => { setTopic(nextTopic); setQuery(''); document.getElementById('help-faq')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); };
  const shortcutItems = audience === 'admin'
    ? [
        { label: '打开运营概览', href: '/admin/overview' },
        { label: '查看运行监控', href: '/admin/operations' },
        { label: '维护知识库', href: '/admin/knowledge' },
      ]
    : [
        { label: '开始一次对话', href: '/copilot' },
        { label: '发现一个智能体', href: '/agents' },
        { label: '查找一份资料', href: '/knowledge' },
      ];

  return (
    <div className="mx-auto w-full max-w-[1440px] space-y-6 p-5 pb-16 sm:p-8 xl:px-10"><section className="relative overflow-hidden rounded-[28px] border border-[var(--border)] bg-[var(--surface-1)] px-6 py-10 text-center shadow-[var(--shadow-sm)] sm:px-8"><div aria-hidden="true" className="pointer-events-none absolute left-1/2 top-0 h-64 w-96 -translate-x-1/2 rounded-full bg-[var(--brand-light)] blur-3xl" /><div className="relative mx-auto max-w-3xl"><p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--brand)]">{meta.eyebrow}</p><h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">{meta.heading}</h2><p className="mt-3 text-sm leading-7 text-[var(--text-muted)]">{meta.sub}</p><form onSubmit={(event) => { event.preventDefault(); document.getElementById('help-faq')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }} className="relative mx-auto mt-7 max-w-2xl"><Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--text-muted)]" /><label className="sr-only" htmlFor="help-search">搜索帮助内容</label><input id="help-search" value={query} onChange={(event) => { setQuery(event.target.value); setTopic(null); }} placeholder={meta.placeholder} className="h-14 w-full rounded-2xl border border-[var(--border-strong)] bg-[var(--surface-1)] pl-12 pr-4 text-sm shadow-[var(--shadow-sm)] outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--brand)]" /></form><div className="mt-4 flex flex-wrap justify-center gap-2 text-xs text-[var(--text-muted)]"><span>热门：</span>{meta.hots.map((item) => <button key={item} type="button" onClick={() => { setQuery(item); setTopic(null); }} className="rounded-full px-2 py-1 hover:bg-[var(--bg-hover)] hover:text-[var(--brand)]">{item}</button>)}</div></div></section>
      {notice && <NoticeBanner tone="emerald" onClose={() => setNotice('')}>{notice}</NoticeBanner>}
      <section><div className="flex items-end justify-between"><div><p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--brand)]">按工作场景查找</p><h3 className="mt-2 text-xl font-semibold">{audience === 'admin' ? '按管理场景查找' : '按工作场景查找'}</h3></div><span className="text-xs text-[var(--text-muted)]">{topics.length} 个主题</span></div><div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{topics.map((item) => { const Icon = item.icon; return <button key={item.id} type="button" onClick={() => searchTopic(item.title)} className="group rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-5 text-left transition hover:-translate-y-0.5 hover:border-[var(--brand)] hover:shadow-[var(--shadow-sm)]"><span className={`grid h-10 w-10 place-items-center rounded-xl ${item.color}`}><Icon className="h-5 w-5" /></span><h4 className="mt-4 text-sm font-semibold group-hover:text-[var(--brand)]">{item.title}</h4><p className="mt-2 text-xs leading-6 text-[var(--text-muted)]">{item.description}</p><span className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-[var(--brand)]">查看指南<ExternalLink className="h-3.5 w-3.5" /></span></button>; })}</div></section>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]"><section id="help-faq" className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)]"><div className="border-b border-[var(--border)] px-5 py-5 sm:px-7"><h3 className="text-base font-semibold">常见问题</h3><p className="mt-1 text-xs text-[var(--text-muted)]">{visibleFaqs.length} 个相关答案</p></div><div className="divide-y divide-[var(--border)]">{visibleFaqs.map((faq) => <div key={faq.question}><button type="button" onClick={() => setOpenFaq((current) => current === faq.question ? null : faq.question)} aria-expanded={openFaq === faq.question} className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left text-sm font-medium hover:bg-[var(--bg-elevated)] sm:px-7"><span>{faq.question}</span><ChevronDown className={`h-4 w-4 shrink-0 text-[var(--text-muted)] transition ${openFaq === faq.question ? 'rotate-180 text-[var(--brand)]' : ''}`} /></button>{openFaq === faq.question && <div className="px-5 pb-5 text-sm leading-7 text-[var(--text-muted)] sm:px-7">{faq.answer}<button type="button" onClick={() => { navigator.clipboard?.writeText(faq.question); setNotice('问题链接已复制（本地演示）。'); }} className="mt-3 block text-xs font-semibold text-[var(--brand)] hover:underline">复制这个问题的链接</button></div>}</div>)}{visibleFaqs.length === 0 && <div className="p-14 text-center"><Search className="mx-auto h-6 w-6 text-[var(--text-muted)]" /><p className="mt-3 text-sm font-semibold">没有找到相关答案</p><p className="mt-1 text-xs text-[var(--text-muted)]">换个说法试试，或直接向支持团队反馈。</p></div>}</div></section><aside className="space-y-5"><section className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-6"><span className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--brand-light)] text-[var(--brand)]"><LifeBuoy className="h-5 w-5" /></span><h3 className="mt-5 text-base font-semibold">还需要帮助？</h3><p className="mt-2 text-xs leading-6 text-[var(--text-muted)]">{audience === 'admin' ? '告诉我们你遇到的管理场景，我们会把问题整理成更好的管理员文档。' : '告诉我们你遇到的情况，我们会把问题整理成更好的使用说明。'}</p><button type="button" onClick={() => setFeedbackOpen(true)} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[var(--text)] px-4 py-2.5 text-xs font-semibold text-[var(--surface-1)]"><MessageCircleQuestion className="h-4 w-4" />提交反馈</button></section><section className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-6"><h3 className="text-sm font-semibold">快捷指南</h3><div className="mt-4 space-y-1">{shortcutItems.map((item) => <a key={item.href} href={item.href} className="flex items-center justify-between rounded-lg p-2 text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--brand)]"><span>{item.label}</span><ChevronDown className="h-4 w-4 -rotate-90" /></a>)}</div></section></aside></div>
      <CenterModal
        open={feedbackOpen}
        onClose={() => setFeedbackOpen(false)}
        ariaLabel={meta.dialogTitle}
        title={meta.dialogTitle}
        description={meta.dialogDesc}
        closeLabel="关闭反馈窗口"
        onSubmit={(event) => {
          event.preventDefault();
          setFeedbackOpen(false);
          setFeedback('');
          setNotice('感谢反馈，内容已保存在本页演示状态。');
        }}
        footer={
          <>
            <button type="button" onClick={() => setFeedbackOpen(false)} className="rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm font-medium">取消</button>
            <button type="submit" className="rounded-xl bg-[var(--brand)] px-4 py-2.5 text-sm font-semibold text-white">提交反馈</button>
          </>
        }
      >
        <label className="mt-6 block text-xs font-semibold">你的反馈
          <textarea
            autoFocus
            required
            value={feedback}
            onChange={(event) => setFeedback(event.target.value)}
            placeholder={meta.dialogPlaceholder}
            className="mt-2 min-h-32 w-full resize-y rounded-xl border border-[var(--border-strong)] bg-[var(--bg-elevated)] p-3 text-sm outline-none focus:border-[var(--brand)]"
          />
        </label>
      </CenterModal>
    </div>
  );
}