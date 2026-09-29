import { Activity, ArrowRight, CalendarClock, Check, ChevronRight, CirclePlay, Heart, LayoutTemplate, MoreHorizontal, Search, Sparkles, Workflow } from 'lucide-react';
import { useMemo, useState } from 'react';
import { CenterModal } from '@/components/feedback/CenterModal';
import { NoticeBanner } from '@/components/feedback/NoticeBanner';
import { SideDrawer } from '@/components/feedback/SideDrawer';
import { useFlows, useFlowRuns, useRecordFlowRun, useToggleFlowFavorite } from '@/api/user/automations';
import type { Flow, FlowRun, FlowAvailability } from '@/api/user/automations/schema';
import { mockFlows, mockFlowRuns } from '@/mock/user/automations.fixtures';

const SCENES = ['全部场景', '销售支持', '团队协作', '行政办公'] as const;
const AVAIL_OPTIONS: Array<'all' | FlowAvailability> = ['all', 'available', 'unavailable'];
const AVAIL_LABEL: Record<'all' | FlowAvailability, string> = {
  all: '全部', available: '可使用', unavailable: '暂不可用',
};

export default function AutomationsPage() {
  const { data: remoteFlows } = useFlows();
  const { data: remoteRuns } = useFlowRuns();
  const recordRun = useRecordFlowRun();
  const flows = (remoteFlows && remoteFlows.length > 0 ? remoteFlows : mockFlows) as Flow[];
  const initialRuns = (remoteRuns && remoteRuns.length > 0 ? remoteRuns : mockFlowRuns) as FlowRun[];

  const [runs, setRuns] = useState<FlowRun[]>(initialRuns);
  const [favorites, setFavorites] = useState<string[]>(['weekly', 'briefing']);
  const [search, setSearch] = useState('');
  const [availabilityFilter, setAvailabilityFilter] = useState<'all' | FlowAvailability>('available');
  const [scene, setScene] = useState<(typeof SCENES)[number]>('全部场景');
  const [selected, setSelected] = useState<Flow | null>(null);
  const [runTarget, setRunTarget] = useState<Flow | null>(null);
  const [runNote, setRunNote] = useState('');
  const [notice, setNotice] = useState('');

  const visible = useMemo(() => flows.filter((flow) =>
    (availabilityFilter === 'all' || flow.availability === availabilityFilter) &&
    (scene === '全部场景' || flow.scene === scene) &&
    `${flow.name} ${flow.description} ${flow.owner}`.toLowerCase().includes(search.trim().toLowerCase()),
  ), [flows, availabilityFilter, scene, search]);

  const runFlow = () => {
    if (!runTarget || runTarget.availability !== 'available') return;
    const next: FlowRun = {
      id: `local-${Date.now()}`,
      name: runTarget.name,
      time: '刚刚 · 本地演示',
      result: runNote.trim() ? '已记录使用说明' : '演示完成',
    };
    setRuns((current) => [next, ...current]);
    setNotice(`"${runTarget.name}"已加入本地使用记录,未触发真实工作流。`);
    setRunNote('');
    setRunTarget(null);
    recordRun.mutate({ flowId: runTarget.id, note: runNote });
  };

  const toggleFavorite = (flow: Flow) =>
    setFavorites((current) => current.includes(flow.id) ? current.filter((id) => id !== flow.id) : [...current, flow.id]);

  return (
    <div className="mx-auto w-full max-w-[1440px] space-y-8 p-5 pb-16 sm:p-8 xl:px-10">
      <section className="relative overflow-hidden rounded-[28px] border border-[var(--border)] bg-[var(--surface-1)] px-6 py-8 shadow-[var(--shadow-sm)] sm:px-9 sm:py-10"><div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-10 h-56 w-56 rotate-12 rounded-[44px] border-[28px] border-amber-400/15" /><div className="relative grid gap-8 lg:grid-cols-[1fr_330px] lg:items-end"><div><p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-amber-700 dark:text-amber-300">AUTOMATIONS / 我的工作流</p><h2 className="mt-4 max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">找到合适的工作流,直接开始工作。</h2><p className="mt-4 max-w-xl text-sm leading-7 text-[var(--text-muted)]">选择团队已经准备好的工作流,查看执行步骤,填写必要说明并开始使用。</p><a href="#automation-list" className="mt-7 inline-flex items-center gap-2 rounded-xl bg-[var(--brand)] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[var(--brand-hover)]"><CirclePlay className="h-4 w-4" />浏览可用工作流</a></div><div className="relative rounded-2xl border border-amber-400/25 bg-amber-50/80 p-5 dark:bg-amber-500/10"><p className="flex items-center gap-2 text-xs font-semibold text-amber-800 dark:text-amber-300"><Workflow className="h-4 w-4" />使用工作流很简单</p><div className="mt-5 flex items-center gap-2 text-[11px] font-semibold text-[var(--text-secondary)]"><span className="rounded-lg bg-[var(--surface-1)] px-2.5 py-2">选择工作流</span><ArrowRight className="h-3.5 w-3.5 shrink-0 text-amber-600" /><span className="rounded-lg bg-[var(--surface-1)] px-2.5 py-2">确认步骤</span><ArrowRight className="h-3.5 w-3.5 shrink-0 text-amber-600" /><span className="rounded-lg bg-[var(--surface-1)] px-2.5 py-2">查看结果</span></div><p className="mt-4 text-xs leading-6 text-[var(--text-muted)]">工作流由管理员维护,你只需要选择和使用。</p></div></div></section>
      {notice && <NoticeBanner tone="amber" onClose={() => setNotice('')}>{notice}</NoticeBanner>}
      <section className="grid gap-4 md:grid-cols-3"><div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-5"><p className="text-xs text-[var(--text-muted)]">可使用工作流</p><p className="mt-3 text-3xl font-semibold">{flows.filter((flow) => flow.availability === 'available').length}</p><p className="mt-1 text-xs text-[var(--text-muted)]">按团队场景分类</p></div><div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-5"><p className="text-xs text-[var(--text-muted)]">我的收藏</p><p className="mt-3 text-3xl font-semibold">{favorites.length}</p><p className="mt-1 text-xs text-[var(--text-muted)]">快速找到常用工作流</p></div><div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-5"><p className="text-xs text-[var(--text-muted)]">最近使用</p><p className="mt-3 text-3xl font-semibold">{runs.length}</p><p className="mt-1 text-xs text-[var(--text-muted)]">本页演示使用记录</p></div></section>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_300px]"><section id="automation-list" aria-labelledby="automation-list-title" className="min-w-0"><div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--brand)]">READY TO USE</p><h3 id="automation-list-title" className="mt-2 text-xl font-semibold">可用工作流</h3><p className="mt-1 text-xs text-[var(--text-muted)]">管理员维护的工作流 · {visible.length} 项结果</p></div><div className="relative w-full sm:max-w-xs"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" /><label className="sr-only" htmlFor="automation-search">搜索工作流</label><input id="automation-search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="搜索工作流、场景或团队" className="h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-1)] pl-10 pr-3 text-sm outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--brand)]" /></div></div><div className="mt-5 flex flex-wrap items-center gap-2"><div role="group" aria-label="工作流可用性筛选" className="flex gap-1 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-1">{AVAIL_OPTIONS.map((item) => <button key={item} type="button" aria-pressed={availabilityFilter === item} onClick={() => setAvailabilityFilter(item)} className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${availabilityFilter === item ? 'bg-[var(--text)] text-[var(--surface-1)]' : 'text-[var(--text-muted)] hover:bg-[var(--bg-hover)]'}`}>{AVAIL_LABEL[item]}</button>)}</div><label className="sr-only" htmlFor="automation-scene">按场景筛选</label><select id="automation-scene" value={scene} onChange={(event) => setScene(event.target.value as (typeof SCENES)[number])} className="h-9 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] px-3 text-xs font-medium text-[var(--text-secondary)] outline-none focus:border-[var(--brand)]">{SCENES.map((item) => <option key={item}>{item}</option>)}</select></div><div className="mt-5 space-y-3">{visible.map((flow, index) => <article key={flow.id} className="group rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-5 transition hover:border-amber-400/50 hover:shadow-[var(--shadow-sm)]"><div className="flex items-start gap-4"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300"><Workflow className="h-5 w-5" /></span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">0{index + 1} / {flow.scene}</span><span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${flow.availability === 'available' ? 'bg-[var(--success-bg)] text-[var(--success)]' : 'bg-[var(--bg-hover)] text-[var(--text-muted)]'}`}>{flow.availability === 'available' ? '可使用' : '暂不可用'}</span></div><button type="button" onClick={() => setSelected(flow)} className="mt-2 text-left text-base font-semibold hover:text-[var(--brand)]">{flow.name}</button><p className="mt-2 text-xs leading-6 text-[var(--text-muted)]">{flow.description}</p><div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] text-[var(--text-muted)]"><span className="inline-flex items-center gap-1"><CalendarClock className="h-3.5 w-3.5" />{flow.cadence}</span><span>{flow.lastRun}</span><span>{flow.owner}</span></div></div><button type="button" aria-label={`${favorites.includes(flow.id) ? '取消收藏' : '收藏'}${flow.name}`} aria-pressed={favorites.includes(flow.id)} onClick={() => toggleFavorite(flow)} className={`rounded-lg p-2 ${favorites.includes(flow.id) ? 'text-rose-500' : 'text-[var(--text-muted)] hover:text-rose-500'}`}><Heart className="h-4 w-4" fill={favorites.includes(flow.id) ? 'currentColor' : 'none'} /></button></div><div className="mt-5 flex flex-wrap items-center gap-2 border-t border-[var(--border)] pt-4"><button type="button" onClick={() => flow.availability === 'available' ? setRunTarget(flow) : setNotice('这个流程当前不可用,请选择其他可用流程。')} disabled={flow.availability !== 'available'} className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--brand)] px-3 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"><CirclePlay className="h-4 w-4" />使用工作流</button><button type="button" onClick={() => setSelected(flow)} className="ml-auto inline-flex items-center gap-1 text-xs font-semibold text-[var(--brand)] hover:underline">查看步骤<ChevronRight className="h-4 w-4" /></button></div></article>)}</div>{visible.length === 0 && <div className="mt-5 rounded-2xl border border-dashed border-[var(--border-strong)] bg-[var(--surface-1)] p-12 text-center"><Search className="mx-auto h-6 w-6 text-[var(--text-muted)]" /><p className="mt-3 text-sm font-semibold">没有匹配的工作流</p><p className="mt-1 text-xs text-[var(--text-muted)]">尝试其他关键词、场景或可用性。</p></div>}</section><aside className="space-y-5"><section className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-5"><div className="flex items-center justify-between"><h3 className="flex items-center gap-2 text-sm font-semibold"><Activity className="h-4 w-4 text-amber-600" />最近使用</h3><MoreHorizontal className="h-4 w-4 text-[var(--text-muted)]" aria-hidden="true" /></div><p className="mt-2 text-xs text-[var(--text-muted)]">本地演示记录,不代表真实执行。</p><ol className="mt-5 space-y-0">{runs.slice(0, 5).map((run) => <li key={run.id} className="relative border-l border-[var(--border)] pb-5 pl-5 last:pb-0"><span className="absolute -left-[5px] top-1.5 h-2.5 w-2.5 rounded-full bg-amber-500 ring-4 ring-[var(--surface-1)]" /><p className="text-xs font-semibold">{run.name}</p><p className="mt-1 text-[11px] text-[var(--text-muted)]">{run.time} · {run.result}</p></li>)}</ol></section><section className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-5"><span className="grid h-9 w-9 place-items-center rounded-xl bg-[var(--brand-light)] text-[var(--brand)]"><LayoutTemplate className="h-4 w-4" /></span><h3 className="mt-4 text-sm font-semibold">不知道选哪个？</h3><p className="mt-2 text-xs leading-6 text-[var(--text-muted)]">先按场景筛选,再打开工作流查看步骤和适用范围。</p></section></aside></div>
      <SideDrawer
        open={selected !== null}
        onClose={() => setSelected(null)}
        ariaLabel={selected ? `${selected.name}工作流详情` : '工作流详情'}
        eyebrow={<p className="text-[11px] font-semibold tracking-[0.2em] text-amber-700 dark:text-amber-300">工作流详情 / {selected?.scene ?? ''}</p>}
        closeLabel="关闭工作流详情"
      >
        {selected && (
          <>
            <span className="mt-10 grid h-14 w-14 place-items-center rounded-2xl bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
              <Workflow className="h-7 w-7" />
            </span>
            <h3 className="mt-5 text-2xl font-semibold">{selected.name}</h3>
            <p className="mt-3 text-sm leading-7 text-[var(--text-muted)]">{selected.description}</p>
            <div className="mt-7 grid grid-cols-2 gap-3 text-xs">
              <div className="rounded-xl bg-[var(--bg-elevated)] p-4">
                <p className="text-[var(--text-muted)]">使用方式</p>
                <p className="mt-2 font-semibold">{selected.cadence}</p>
              </div>
              <div className="rounded-xl bg-[var(--bg-elevated)] p-4">
                <p className="text-[var(--text-muted)]">当前状态</p>
                <p className="mt-2 font-semibold">{selected.availability === 'available' ? '可使用' : '暂不可用'}</p>
              </div>
            </div>
            <h4 className="mt-9 text-sm font-semibold">执行步骤</h4>
            <ol className="mt-4 space-y-3">
              {selected.steps.map((step, idx) => (
                <li key={`${step}-${idx}`} className="flex items-center gap-4 rounded-xl border border-[var(--border)] p-4">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-amber-50 text-xs font-bold text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">{idx + 1}</span>
                  <span className="text-sm font-medium">{step}</span>
                  {idx === selected.steps.length - 1 && <Check className="ml-auto h-4 w-4 text-[var(--success)]" />}
                </li>
              ))}
            </ol>
            <button type="button" disabled={selected.availability !== 'available'} onClick={() => { setRunTarget(selected); setSelected(null); }} className="mt-7 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--brand)] px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40">
              <CirclePlay className="h-4 w-4" />使用这个工作流
            </button>
            <p className="mt-4 text-xs leading-6 text-[var(--text-muted)]">工作流由管理员维护;使用操作只会创建当前页面的演示记录。</p>
          </>
        )}
      </SideDrawer>
      <CenterModal
        open={runTarget !== null}
        onClose={() => setRunTarget(null)}
        ariaLabel={runTarget ? `使用${runTarget.name}` : '使用工作流'}
        title={runTarget ? `使用工作流：${runTarget.name}` : '使用工作流'}
        description="确认后会创建一条本地演示使用记录,不会触发真实工作流。"
        closeLabel="关闭使用工作流窗口"
        onSubmit={(event) => { event.preventDefault(); runFlow(); }}
        footer={
          <>
            <button type="button" onClick={() => setRunTarget(null)} className="rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm font-medium">取消</button>
            <button type="submit" className="inline-flex items-center gap-2 rounded-xl bg-[var(--brand)] px-4 py-2.5 text-sm font-semibold text-white">
              <CirclePlay className="h-4 w-4" />确认使用
            </button>
          </>
        }
      >
        <label className="mt-6 block text-xs font-semibold">给这次使用添加说明（可选）
          <textarea
            value={runNote}
            onChange={(event) => setRunNote(event.target.value)}
            placeholder="例如：整理本周华东客户进展"
            className="mt-2 min-h-24 w-full resize-y rounded-xl border border-[var(--border-strong)] bg-[var(--bg-elevated)] p-3 text-sm font-normal outline-none focus:border-[var(--brand)]"
          />
        </label>
      </CenterModal>
    </div>
  );
}