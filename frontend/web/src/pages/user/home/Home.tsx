import { ArrowRight, Bot, CheckCircle2, Clock3, MessageSquarePlus, Search, Workflow } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import MyInsights from './MyInsights';

const quickActions = [
  { label: '新建对话', description: '描述目标，立即开始', href: '/copilot', icon: MessageSquarePlus, tone: 'brand' },
  { label: '选择智能体', description: '使用已授权的工作助手', href: '/agents', icon: Bot, tone: 'violet' },
  { label: '选择流程', description: '使用团队准备好的流程', href: '/automations', icon: Workflow, tone: 'amber' },
  { label: '查找知识', description: '从企业资料中找到答案', href: '/knowledge', icon: Search, tone: 'emerald' },
] as const;

export default function Home() {
  return (
    <div className="mx-auto w-full max-w-[1440px] space-y-6 p-5 pb-16 sm:p-8 xl:px-10">
      <section className="relative overflow-hidden rounded-[28px] border border-[var(--border)] bg-[var(--surface-1)] p-6 shadow-[var(--shadow-sm)] sm:p-8">
        <div aria-hidden="true" className="pointer-events-none absolute right-0 top-0 h-52 w-52 translate-x-16 -translate-y-20 rounded-full bg-[var(--brand-light)] blur-3xl" />
        <div className="relative flex flex-col justify-between gap-6 xl:flex-row xl:items-end">
          <div className="max-w-2xl"><p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--brand)]">TODAY / 今日工作台</p><h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">今天，从一个结果开始。</h2><p className="mt-3 max-w-xl text-sm leading-7 text-[var(--text-muted)]">选择能力、完成工作，首页会帮你看见智能体带来的实际变化。</p></div>        </div>
        <div className="relative mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{quickActions.map(({ label, description, href, icon: Icon, tone }) => <NavLink key={href} to={href} className="group flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-3.5 transition hover:-translate-y-0.5 hover:border-[var(--brand)] hover:shadow-[var(--shadow-sm)]"><span className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg ${tone === 'brand' ? 'bg-[var(--brand-light)] text-[var(--brand)]' : tone === 'violet' ? 'bg-purple-50 text-purple-600 dark:bg-purple-500/15 dark:text-purple-300' : tone === 'amber' ? 'bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300' : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300'}`}><Icon className="h-5 w-5" /></span><span className="min-w-0"><strong className="block text-sm font-semibold">{label}</strong><span className="mt-0.5 block truncate text-xs text-[var(--text-muted)]">{description}</span></span><ArrowRight className="ml-auto h-4 w-4 shrink-0 text-[var(--text-muted)] transition group-hover:translate-x-1 group-hover:text-[var(--brand)]" /></NavLink>)}</div>
      </section>

      <MyInsights embedded />

      <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-5 sm:p-7"><div className="mb-5 flex items-center justify-between"><div><p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-700 dark:text-amber-300">NEXT / 下一步</p><h2 className="mt-2 text-xl font-semibold">待我处理</h2><p className="mt-1 text-xs text-[var(--text-muted)]">需要你确认的事项会集中显示在这里。</p></div><NavLink to="/tasks" className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--brand)] hover:underline">查看全部<ArrowRight className="h-3.5 w-3.5" /></NavLink></div><div className="grid gap-3 xl:grid-cols-2"><div className="flex items-center gap-3 rounded-xl bg-[var(--warning-bg)]/60 p-4"><span className="grid h-9 w-9 place-items-center rounded-lg bg-[var(--warning-bg)] text-[var(--warning)]"><Clock3 className="h-4 w-4" /></span><div className="min-w-0 flex-1"><p className="text-sm font-semibold">销售报价单需要确认</p><p className="mt-1 text-xs text-[var(--text-muted)]">来自：销售支持助手 · 需要你的确认</p></div><NavLink to="/tasks" className="rounded-md bg-[var(--surface-1)] px-3 py-1.5 text-xs font-medium text-[var(--brand)] shadow-sm">查看</NavLink></div><div className="flex items-center gap-3 rounded-xl border border-dashed border-[var(--border)] p-4"><span className="grid h-9 w-9 place-items-center rounded-lg bg-[var(--success-bg)] text-[var(--success)]"><CheckCircle2 className="h-4 w-4" /></span><div><p className="text-sm font-semibold">暂无其他待处理事项</p><p className="mt-1 text-xs text-[var(--text-muted)]">新的确认和任务会显示在这里</p></div></div></div></section>
    </div>
  );
}
