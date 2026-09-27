import { Archive, CalendarDays, Check, CheckCircle2, ChevronRight, CircleAlert, CircleDot, Clock3, Filter, ListTodo, Play, RotateCcw, Search, SlidersHorizontal } from 'lucide-react';
import { useMemo, useState } from 'react';
import { NoticeBanner } from '@/components/feedback/NoticeBanner';
import { SideDrawer } from '@/components/feedback/SideDrawer';

type Status = '待处理' | '执行中' | '已完成' | '异常';
type View = '列表' | '日程';
type Priority = '高' | '中' | '低';
type Task = { id: string; title: string; source: string; owner: string; status: Status; due: string; time: string; description: string; priority: Priority };

const initialTasks: Task[] = [
  { id: 't1', title: '确认销售报价单', source: '销售支持助手', owner: '我', status: '待处理', due: '今天 15:00', time: '约 5 分钟', description: '请确认报价范围和折扣说明，确认后将进入客户沟通环节。', priority: '高' },
  { id: 't2', title: '整理本周客户反馈', source: '客户沟通助手', owner: '我', status: '执行中', due: '今天 17:00', time: '已运行 12 分钟', description: '正在整理最近 12 条客户反馈，并按主题生成摘要。', priority: '中' },
  { id: 't3', title: '查看入职资料清单', source: '新成员入职准备', owner: '人力资源团队', status: '已完成', due: '昨天 18:00', time: '完成于昨天', description: '入职资料已准备完成，可从团队空间查看共享结果。', priority: '低' },
  { id: 't4', title: '重新生成服务问题摘要', source: '客户反馈分类', owner: '客户成功团队', status: '异常', due: '周一 11:30', time: '需要重试', description: '部分输入资料暂时不可用，修复后可以重新运行。', priority: '高' },
  { id: 't5', title: '审核产品发布问答', source: '产品资料与常见问题', owner: '产品协作组', status: '待处理', due: '明天 10:00', time: '约 10 分钟', description: '请审核对外问答中的新功能描述和支持口径。', priority: '中' },
  { id: 't6', title: '归档九月用户反馈纪要', source: '我的协作', owner: '我', status: '已完成', due: '上周五', time: '完成于上周', description: '纪要已归档至产品协作组，保留引用和行动项。', priority: '低' },
];
const statuses: Array<Status | '全部'> = ['全部', '待处理', '执行中', '已完成', '异常'];
const statusMeta: Record<Status, { icon: typeof CircleDot; className: string; hint: string }> = {
  待处理: { icon: Clock3, className: 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300', hint: '需要你的确认' },
  执行中: { icon: Play, className: 'bg-sky-50 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300', hint: '正在自动推进' },
  已完成: { icon: CheckCircle2, className: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300', hint: '最近完成记录' },
  异常: { icon: CircleAlert, className: 'bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300', hint: '建议尽快处理' },
};

interface TaskRowProps {
  task: Task;
  meta: (typeof statusMeta)[Status];
  onOpen: (task: Task) => void;
}

function TaskRow({ task, meta, onOpen }: TaskRowProps) {
  const Icon = meta.icon;
  const isHighPriority = task.priority === '高';
  return (
    <button type="button" onClick={() => onOpen(task)} className="group flex w-full items-center gap-4 px-5 py-4 text-left transition hover:bg-[var(--bg-elevated)] sm:px-7">
      <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${meta.className}`}><Icon className="h-4 w-4" /></span>
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2">
          <span className="truncate text-sm font-semibold group-hover:text-[var(--brand)]">{task.title}</span>
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${isHighPriority ? 'bg-rose-50 text-rose-600 dark:bg-rose-500/15 dark:text-rose-300' : 'bg-[var(--bg-hover)] text-[var(--text-muted)]'}`}>{task.priority}优先级</span>
        </span>
        <span className="mt-1 block truncate text-xs text-[var(--text-muted)]">{task.source} · {task.owner}</span>
      </span>
      <span className="hidden min-w-[130px] items-center gap-2 text-xs text-[var(--text-muted)] lg:flex"><Clock3 className="h-3.5 w-3.5" />{task.due}</span>
      <span className="hidden w-32 text-xs text-[var(--text-muted)] xl:block">{task.time}</span>
      <ChevronRight className="h-4 w-4 shrink-0 text-[var(--text-muted)]" />
    </button>
  );
}

interface TaskScheduleCardProps {
  task: Task;
  meta: (typeof statusMeta)[Status];
  onOpen: (task: Task) => void;
}

function TaskScheduleCard({ task, meta, onOpen }: TaskScheduleCardProps) {
  return (
    <button key={task.id} type="button" onClick={() => onOpen(task)} className="rounded-xl border border-[var(--border)] p-4 text-left hover:border-[var(--brand)]">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold">{task.due}</span>
        <span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${meta.className}`}>{task.status}</span>
      </div>
      <h4 className="mt-4 text-sm font-semibold">{task.title}</h4>
      <p className="mt-2 line-clamp-2 text-xs leading-5 text-[var(--text-muted)]">{task.description}</p>
      <p className="mt-4 text-[11px] text-[var(--text-muted)]">{task.source}</p>
    </button>
  );
}

interface StatusCardProps {
  status: Status;
  count: number;
  active: boolean;
  onSelect: (status: Status) => void;
}

function StatusCard({ status, count, active, onSelect }: StatusCardProps) {
  const meta = statusMeta[status];
  const Icon = meta.icon;
  return (
    <button
      key={status}
      type="button"
      onClick={() => onSelect(status)}
      aria-pressed={active}
      className={`rounded-2xl border p-4 text-left transition ${active ? 'border-[var(--brand)] bg-[var(--brand-light)]' : 'border-[var(--border)] bg-[var(--surface-1)] hover:border-[var(--brand)]'}`}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-[var(--text-muted)]">{status}</span>
        <span className={`grid h-8 w-8 place-items-center rounded-lg ${meta.className}`}><Icon className="h-4 w-4" /></span>
      </div>
      <p className="mt-3 text-2xl font-semibold tabular-nums">{count}</p>
      <p className="mt-1 text-[11px] text-[var(--text-muted)]">{meta.hint}</p>
    </button>
  );
}

export default function MyTasks() {
  const [tasks, setTasks] = useState(initialTasks);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<Status | '全部'>('全部');
  const [view, setView] = useState<View>('列表');
  const [selected, setSelected] = useState<Task | null>(null);
  const [notice, setNotice] = useState('');
  const [sourceFilter, setSourceFilter] = useState('全部来源');
  const sources = ['全部来源', ...Array.from(new Set(tasks.map((task) => task.source)))];

  const filtered = useMemo(() => tasks.filter((task) =>
    (status === '全部' || task.status === status) &&
    (sourceFilter === '全部来源' || task.source === sourceFilter) &&
    `${task.title} ${task.source} ${task.owner}`.toLowerCase().includes(query.trim().toLowerCase()),
  ), [tasks, status, sourceFilter, query]);

  const counts = useMemo(() => (statuses.slice(1) as Status[]).reduce((result, item) => ({ ...result, [item]: tasks.filter((task) => task.status === item).length }), {} as Record<Status, number>), [tasks]);

  const updateTask = (task: Task, action: 'complete' | 'retry' | 'archive') => {
    if (action === 'archive') {
      setTasks((current) => current.filter((item) => item.id !== task.id));
      setSelected(null);
      setNotice(`“${task.title}”已从本页演示记录中归档。`);
      return;
    }
    const nextStatus: Status = action === 'retry' ? '执行中' : '已完成';
    setTasks((current) => current.map((item) => item.id === task.id ? { ...item, status: nextStatus, time: action === 'retry' ? '刚刚重新运行' : '刚刚完成' } : item));
    setSelected((current) => current?.id === task.id ? { ...current, status: nextStatus } : current);
    setNotice(action === 'retry' ? `“${task.title}”已重新加入本地演示队列。` : `“${task.title}”已标记为完成。`);
  };

  return (
    <div className="mx-auto w-full max-w-[1440px] space-y-6 p-5 pb-16 sm:p-8 xl:px-10">
      <section className="relative overflow-hidden rounded-[28px] border border-[var(--border)] bg-[var(--surface-1)] px-6 py-7 shadow-[var(--shadow-sm)] sm:px-8">
        <div aria-hidden="true" className="pointer-events-none absolute right-0 top-0 h-full w-1/3 bg-[linear-gradient(135deg,transparent_25%,var(--brand-light)_25%,var(--brand-light)_55%,transparent_55%)] opacity-60" />
        <div className="relative flex flex-col justify-between gap-6 xl:flex-row xl:items-end">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--brand)]">TASKS / 我的任务</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">把下一步，放在眼前。</h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--text-muted)]">所有需要你确认、正在执行和已经完成的工作，都在这里保持连续。</p>
          </div>
          <button type="button" onClick={() => setNotice('任务创建入口将在连接真实智能体后开放。')} className="inline-flex h-10 items-center gap-2 rounded-xl bg-[var(--brand)] px-4 text-xs font-semibold text-white hover:bg-[var(--brand-hover)]">
            <ListTodo className="h-4 w-4" />记录新任务
          </button>
        </div>
      </section>
      {notice && <NoticeBanner tone="sky" onClose={() => setNotice('')}>{notice}</NoticeBanner>}
      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {(statuses.slice(1) as Status[]).map((item) => (
          <StatusCard key={item} status={item} count={counts[item]} active={status === item} onSelect={setStatus} />
        ))}
      </section>
      <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)]">
        <div className="flex flex-col gap-4 border-b border-[var(--border)] px-5 py-5 xl:flex-row xl:items-center xl:justify-between sm:px-7">
          <div>
            <h3 className="text-base font-semibold">全部任务</h3>
            <p className="mt-1 text-xs text-[var(--text-muted)]">{filtered.length} 项本地演示记录</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[220px] flex-1 xl:flex-none">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
              <label htmlFor="task-search" className="sr-only">搜索任务</label>
              <input id="task-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索任务、来源或负责人" className="h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] pl-10 pr-3 text-sm outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--brand)]" />
            </div>
            <label className="sr-only" htmlFor="task-source">任务来源</label>
            <select id="task-source" value={sourceFilter} onChange={(event) => setSourceFilter(event.target.value)} className="h-10 rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] px-3 text-xs font-medium outline-none focus:border-[var(--brand)]">
              {sources.map((source) => <option key={source}>{source}</option>)}
            </select>
            <div role="group" aria-label="任务视图" className="flex rounded-xl border border-[var(--border)] p-1">
              <button type="button" aria-pressed={view === '列表'} onClick={() => setView('列表')} className={`rounded-lg p-2 ${view === '列表' ? 'bg-[var(--brand-light)] text-[var(--brand)]' : 'text-[var(--text-muted)]'}`} aria-label="列表视图"><SlidersHorizontal className="h-4 w-4" /></button>
              <button type="button" aria-pressed={view === '日程'} onClick={() => setView('日程')} className={`rounded-lg p-2 ${view === '日程' ? 'bg-[var(--brand-light)] text-[var(--brand)]' : 'text-[var(--text-muted)]'}`} aria-label="日程视图"><CalendarDays className="h-4 w-4" /></button>
            </div>
          </div>
        </div>
        <div className="flex gap-2 overflow-x-auto border-b border-[var(--border)] px-5 py-3 sm:px-7" role="group" aria-label="任务状态筛选">
          {statuses.map((item) => (
            <button key={item} type="button" aria-pressed={status === item} onClick={() => setStatus(item)} className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold ${status === item ? 'bg-[var(--text)] text-[var(--surface-1)]' : 'text-[var(--text-muted)] hover:bg-[var(--bg-hover)]'}`}>{item}</button>
          ))}
        </div>
        {view === '列表' ? (
          <div className="divide-y divide-[var(--border)]">
            {filtered.map((task) => <TaskRow key={task.id} task={task} meta={statusMeta[task.status]} onOpen={setSelected} />)}
          </div>
        ) : (
          <div className="grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-3 sm:p-7">
            {filtered.map((task) => <TaskScheduleCard key={task.id} task={task} meta={statusMeta[task.status]} onOpen={setSelected} />)}
          </div>
        )}
        {filtered.length === 0 && (
          <div className="p-14 text-center">
            <Filter className="mx-auto h-6 w-6 text-[var(--text-muted)]" />
            <p className="mt-3 text-sm font-semibold">没有匹配的任务</p>
            <p className="mt-1 text-xs text-[var(--text-muted)]">尝试更换状态、来源或关键词。</p>
          </div>
        )}
      </section>
      <SideDrawer
        open={selected !== null}
        onClose={() => setSelected(null)}
        ariaLabel={selected ? `${selected.title}详情` : '任务详情'}
        eyebrow={<p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--brand)]">TASK DETAIL / 我的任务</p>}
        closeLabel="关闭任务详情"
      >
        {selected && (
          <>
            <h3 className="mt-10 text-2xl font-semibold">{selected.title}</h3>
            <p className="mt-3 text-sm leading-7 text-[var(--text-muted)]">{selected.description}</p>
            <div className="mt-7 grid grid-cols-2 gap-3 text-xs">
              <div className="rounded-xl bg-[var(--bg-elevated)] p-4">
                <p className="text-[var(--text-muted)]">来源</p>
                <p className="mt-2 font-semibold">{selected.source}</p>
              </div>
              <div className="rounded-xl bg-[var(--bg-elevated)] p-4">
                <p className="text-[var(--text-muted)]">截止时间</p>
                <p className="mt-2 font-semibold">{selected.due}</p>
              </div>
            </div>
            <div className="mt-8 flex flex-wrap gap-2">
              {selected.status === '待处理' && (
                <button type="button" onClick={() => updateTask(selected, 'complete')} className="inline-flex items-center gap-2 rounded-xl bg-[var(--brand)] px-4 py-2.5 text-xs font-semibold text-white">
                  <Check className="h-4 w-4" />确认完成
                </button>
              )}
              {selected.status === '异常' && (
                <button type="button" onClick={() => updateTask(selected, 'retry')} className="inline-flex items-center gap-2 rounded-xl bg-[var(--brand)] px-4 py-2.5 text-xs font-semibold text-white">
                  <RotateCcw className="h-4 w-4" />重新运行
                </button>
              )}
              <button type="button" onClick={() => updateTask(selected, 'archive')} className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] px-4 py-2.5 text-xs font-semibold text-[var(--text-secondary)] hover:border-[var(--danger)] hover:text-[var(--danger)]">
                <Archive className="h-4 w-4" />归档记录
              </button>
            </div>
            <p className="mt-7 text-xs leading-6 text-[var(--text-muted)]">这是前端演示任务，操作只会更新当前页面状态。</p>
          </>
        )}
      </SideDrawer>
    </div>
  );
}