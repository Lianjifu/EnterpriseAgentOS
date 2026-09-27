import { ArrowRight, BookOpen, Check, ChevronRight, FilePlus2, FileText, Heart, LibraryBig, MessageCircleQuestion, Search, Share2, Sparkles, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useMemo, useState } from 'react';
import { NoticeBanner } from '@/components/feedback/NoticeBanner';
import { SideDrawer } from '@/components/feedback/SideDrawer';

type Kind = '制度' | '项目' | '指南';
type Resource = { id: string; title: string; kind: Kind; description: string; owner: string; updated: string; tags: string[]; excerpt: string };
type Answer = { question: string; resource: Resource };
type SortOption = '最近更新' | '名称排序';

const initialResources: Resource[] = [
  { id: 'handbook', title: '员工入职与成长手册', kind: '制度', description: '从入职准备到试用期反馈，把常用规则放在一起。', owner: '人力资源团队', updated: '今天更新', tags: ['入职', '人事'], excerpt: '入职前完成账号开通与资料确认。第一周熟悉团队协作方式，并与直属负责人约定试用期目标。' },
  { id: 'product', title: '产品资料与常见问题', kind: '项目', description: '对外介绍、功能边界和客户常问问题的统一参考。', owner: '产品团队', updated: '昨天更新', tags: ['产品', '客户'], excerpt: '对外沟通时优先使用已发布的产品说明。涉及未发布能力，请先与产品负责人确认。' },
  { id: 'expense', title: '差旅与报销指南', kind: '指南', description: '出行申请、费用标准和提交凭证的完整步骤。', owner: '财务团队', updated: '本周更新', tags: ['财务', '行政'], excerpt: '出行前提交申请，完成行程后按费用类型上传凭证。特殊费用需在备注中说明原因。' },
  { id: 'security', title: '信息安全行为规范', kind: '制度', description: '数据分级、访问边界和日常安全操作建议。', owner: '安全团队', updated: '本周更新', tags: ['安全', '合规'], excerpt: '仅在工作需要范围内访问资料。分享含敏感信息的内容前，确认接收对象及授权范围。' },
  { id: 'launch', title: '新功能发布协作清单', kind: '项目', description: '产品、市场和客户团队的发布协同步骤。', owner: '产品团队', updated: '上周更新', tags: ['发布', '协作'], excerpt: '发布前完成体验走查、对外素材确认和支持团队培训。发布后记录问题及用户反馈。' },
  { id: 'meeting', title: '高效会议与纪要模板', kind: '指南', description: '会前准备、议题记录及会后行动项的模板。', owner: '运营团队', updated: '上周更新', tags: ['协作', '模板'], excerpt: '每次会议明确目标、负责人和预期结论；会后将行动项写入共享记录并标注完成时间。' },
];
const kinds = ['全部', '制度', '项目', '指南', '已收藏'] as const;

export default function MyKnowledge() {
  const navigate = useNavigate();
  const [resources] = useState(initialResources);
  const [query, setQuery] = useState('');
  const [kind, setKind] = useState<(typeof kinds)[number]>('全部');
  const [tag, setTag] = useState('全部标签');
  const [sort, setSort] = useState<SortOption>('最近更新');
  const [favorites, setFavorites] = useState<string[]>(['handbook', 'product']);
  const [selected, setSelected] = useState<Resource | null>(null);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState<Answer | null>(null);
  const [questionHistory, setQuestionHistory] = useState<Answer[]>([]);
  const [notice, setNotice] = useState('');
  const allTags = useMemo(() => Array.from(new Set(resources.flatMap((resource) => resource.tags))).sort((a, b) => a.localeCompare(b, 'zh-CN')), [resources]);

  const visible = useMemo(() => {
    const filtered = resources.filter((resource) => {
      const matchesKind = kind === '全部' || (kind === '已收藏' ? favorites.includes(resource.id) : resource.kind === kind);
      const matchesTag = tag === '全部标签' || resource.tags.includes(tag);
      const text = `${resource.title} ${resource.description} ${resource.owner} ${resource.tags.join(' ')}`.toLowerCase();
      return matchesKind && matchesTag && text.includes(query.trim().toLowerCase());
    });
    return [...filtered].sort((a, b) => sort === '名称排序' ? a.title.localeCompare(b.title, 'zh-CN') : a.updated.localeCompare(b.updated, 'zh-CN'));
  }, [resources, kind, tag, favorites, query, sort]);

  const resetFilters = () => { setQuery(''); setKind('全部'); setTag('全部标签'); setSort('最近更新'); };
  const ask = () => {
    const text = question.trim();
    if (!text) return;
    const resource = resources.find((item) => `${item.title} ${item.tags.join(' ')} ${item.description}`.includes(text)) ?? resources[0];
    const nextAnswer = { question: text, resource };
    setAnswer(nextAnswer);
    setQuestionHistory((current) => [nextAnswer, ...current.filter((item) => item.question !== text)].slice(0, 5));
    setQuestion('');
  };
  const toggleFavorite = (resource: Resource) => setFavorites((current) => current.includes(resource.id) ? current.filter((id) => id !== resource.id) : [...current, resource.id]);
  const copyCitation = (resource: Resource) => { setNotice(`“${resource.title}”的引用摘要已复制（本地演示）。`); };
  const useKnowledge = (resource: Resource) => navigate('/copilot', { state: { knowledgeTitle: resource.title } });

  return (
    <div className="mx-auto w-full max-w-[1440px] space-y-8 p-5 pb-16 sm:p-8 xl:px-10">
      <section className="relative overflow-hidden rounded-[28px] border border-[var(--border)] bg-[var(--surface-1)] px-6 py-8 shadow-[var(--shadow-sm)] sm:px-9 sm:py-10"><div aria-hidden="true" className="pointer-events-none absolute -right-12 -top-16 h-72 w-72 rounded-full border-[36px] border-emerald-400/10" /><div className="relative grid gap-8 lg:grid-cols-[1fr_300px] lg:items-end"><div><p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-600 dark:text-emerald-300">KNOWLEDGE / 我的知识</p><h2 className="mt-4 max-w-2xl text-3xl font-semibold tracking-tight text-[var(--text)] sm:text-4xl">好答案，从可信的资料开始。</h2><p className="mt-4 max-w-xl text-sm leading-7 text-[var(--text-muted)]">选择资料、阅读来源、提出问题，把可信的知识带进下一项工作。</p><div className="mt-7 flex flex-wrap items-center gap-3"><a href="#knowledge-question" className="inline-flex items-center gap-2 rounded-xl bg-[var(--brand)] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[var(--brand-hover)]"><MessageCircleQuestion className="h-4 w-4" />试着提问</a><span className="rounded-xl border border-emerald-400/25 bg-emerald-50 px-3 py-2.5 text-xs text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-200">资料由管理员统一维护</span></div></div><div className="relative rounded-2xl border border-emerald-400/20 bg-emerald-50/80 p-5 dark:bg-emerald-500/10"><div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 dark:text-emerald-300"><LibraryBig className="h-4 w-4" />阅读路线</div><p className="mt-4 text-lg font-semibold leading-7 text-[var(--text)]">先找到资料，再追溯它的来源。</p><p className="mt-2 text-xs leading-6 text-[var(--text-muted)]">查看摘要和维护团队，再把资料带入对话。</p></div></div></section>
      {notice && <NoticeBanner tone="emerald" onClose={() => setNotice('')}>{notice}</NoticeBanner>}
      <section id="knowledge-question" className="grid gap-6 lg:grid-cols-[1fr_340px]"><div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-5 sm:p-6"><div className="flex items-start gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[var(--brand-light)] text-[var(--brand)]"><Sparkles className="h-5 w-5" /></span><div><h3 className="text-base font-semibold">从一个问题开始</h3><p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">在当前演示资料中查看示例回答和参考来源。</p></div></div><form onSubmit={(event) => { event.preventDefault(); ask(); }} className="mt-5 flex flex-col gap-2 sm:flex-row"><label className="sr-only" htmlFor="knowledge-question-input">输入知识问题</label><input id="knowledge-question-input" value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="例如：入职第一周要完成什么？" className="h-11 min-w-0 flex-1 rounded-xl border border-[var(--border-strong)] bg-[var(--bg-elevated)] px-4 text-sm text-[var(--text)] outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--brand)]" /><button type="submit" disabled={!question.trim()} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[var(--text)] px-5 text-sm font-semibold text-[var(--surface-1)] disabled:cursor-not-allowed disabled:opacity-40">查看示例<ArrowRight className="h-4 w-4" /></button></form>{answer && <div className="mt-5 rounded-xl border border-dashed border-[var(--border-strong)] bg-[var(--bg-elevated)] p-4"><p className="text-[11px] font-semibold tracking-wide text-[var(--brand)]">示例回答 · 未连接知识服务</p><p className="mt-2 text-xs font-medium text-[var(--text)]">{answer.question}</p><p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{answer.resource.excerpt}</p><button type="button" onClick={() => setSelected(answer.resource)} className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-[var(--brand)] hover:underline">参考：{answer.resource.title}<ChevronRight className="h-3.5 w-3.5" /></button></div>}</div><div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-5 sm:p-6"><div className="flex items-center justify-between"><div className="flex items-center gap-2 text-sm font-semibold"><Heart className="h-4 w-4 text-rose-500" />我的收藏</div>{questionHistory.length > 0 && <button type="button" onClick={() => setQuestionHistory([])} className="text-[11px] text-[var(--text-muted)] hover:text-[var(--brand)]">清空提问记录</button>}</div><p className="mt-2 text-xs text-[var(--text-muted)]">重要资料和最近提问，随时回到这里。</p><div className="mt-4 space-y-2">{resources.filter((resource) => favorites.includes(resource.id)).slice(0, 3).map((resource) => <button key={resource.id} type="button" onClick={() => setSelected(resource)} className="flex w-full items-center justify-between gap-3 rounded-xl bg-[var(--bg-elevated)] px-3 py-3 text-left text-xs font-medium hover:text-[var(--brand)]"><span className="truncate">{resource.title}</span><ChevronRight className="h-4 w-4 shrink-0" /></button>)}{questionHistory.map((item) => <button key={item.question} type="button" onClick={() => setAnswer(item)} className="w-full truncate rounded-xl border border-dashed border-[var(--border)] px-3 py-2 text-left text-[11px] text-[var(--text-muted)] hover:border-[var(--brand)] hover:text-[var(--brand)]">最近提问：{item.question}</button>)}{favorites.length === 0 && questionHistory.length === 0 && <p className="rounded-xl border border-dashed border-[var(--border)] p-4 text-xs text-[var(--text-muted)]">收藏资料或提问后会显示在这里。</p>}</div></div></section>
      <section aria-labelledby="knowledge-list-title"><div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between"><div><p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--brand)]">LIBRARY</p><h3 id="knowledge-list-title" className="mt-2 text-xl font-semibold">资料架</h3><p className="mt-1 text-xs text-[var(--text-muted)]">管理员维护的资料 · {visible.length} 项可用内容</p></div><div className="flex w-full flex-col gap-2 sm:flex-row xl:w-auto"><div className="relative min-w-0 flex-1 sm:min-w-[260px]"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" /><label htmlFor="knowledge-search" className="sr-only">搜索资料</label><input id="knowledge-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索标题、团队或标签" className="h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-1)] pl-10 pr-10 text-sm outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--brand)]" />{query && <button type="button" onClick={() => setQuery('')} aria-label="清空资料搜索" className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-[var(--text-muted)] hover:bg-[var(--bg-hover)]"><X className="h-3.5 w-3.5" /></button>}</div><label className="sr-only" htmlFor="knowledge-tag">按标签筛选</label><select id="knowledge-tag" value={tag} onChange={(event) => setTag(event.target.value)} className="h-10 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] px-3 text-xs font-medium outline-none focus:border-[var(--brand)]"><option>全部标签</option>{allTags.map((item) => <option key={item}>{item}</option>)}</select><label className="sr-only" htmlFor="knowledge-sort">排序方式</label><select id="knowledge-sort" value={sort} onChange={(event) => setSort(event.target.value as SortOption)} className="h-10 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] px-3 text-xs font-medium outline-none focus:border-[var(--brand)]"><option>最近更新</option><option>名称排序</option></select></div></div><div className="mt-5 flex flex-wrap items-center gap-2"><div className="flex gap-2 overflow-x-auto pb-1" role="group" aria-label="资料类型筛选">{kinds.map((item) => <button key={item} type="button" aria-pressed={kind === item} onClick={() => setKind(item)} className={`shrink-0 rounded-full px-4 py-2 text-xs font-semibold transition ${kind === item ? 'bg-[var(--text)] text-[var(--surface-1)]' : 'border border-[var(--border)] bg-[var(--surface-1)] text-[var(--text-secondary)] hover:border-[var(--brand)] hover:text-[var(--brand)]'}`}>{item}</button>)}</div>{(query || tag !== '全部标签' || kind !== '全部') && <button type="button" onClick={resetFilters} className="text-xs font-semibold text-[var(--brand)] hover:underline">清除筛选</button>}</div><div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{visible.map((resource) => <article key={resource.id} className="group flex min-h-[210px] flex-col rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-5 transition hover:-translate-y-0.5 hover:border-emerald-400/50 hover:shadow-[var(--shadow-sm)]"><div className="flex items-start justify-between"><span className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">{resource.kind === '指南' ? <BookOpen className="h-5 w-5" /> : resource.kind === '项目' ? <FilePlus2 className="h-5 w-5" /> : <FileText className="h-5 w-5" />}</span><button type="button" aria-label={`${favorites.includes(resource.id) ? '取消收藏' : '收藏'}${resource.title}`} aria-pressed={favorites.includes(resource.id)} onClick={() => toggleFavorite(resource)} className={`rounded-lg p-2 transition ${favorites.includes(resource.id) ? 'text-rose-500' : 'text-[var(--text-muted)] hover:text-rose-500'}`}><Heart className="h-4 w-4" fill={favorites.includes(resource.id) ? 'currentColor' : 'none'} /></button></div><button type="button" onClick={() => setSelected(resource)} className="mt-4 text-left"><span className="text-[10px] font-semibold tracking-wide text-emerald-700 dark:text-emerald-300">{resource.kind} · {resource.updated}</span><h4 className="mt-2 text-base font-semibold leading-6 group-hover:text-[var(--brand)]">{resource.title}</h4><p className="mt-2 line-clamp-2 text-xs leading-6 text-[var(--text-muted)]">{resource.description}</p></button><div className="mt-auto flex items-center justify-between gap-2 pt-5 text-[11px] text-[var(--text-muted)]"><span className="truncate">{resource.owner}</span><button type="button" onClick={() => setSelected(resource)} className="inline-flex items-center gap-1 font-medium text-[var(--brand)]">查看详情<ChevronRight className="h-3.5 w-3.5" /></button></div></article>)}</div>{visible.length === 0 && <div className="mt-5 rounded-2xl border border-dashed border-[var(--border-strong)] bg-[var(--surface-1)] p-12 text-center"><Search className="mx-auto h-6 w-6 text-[var(--text-muted)]" /><p className="mt-3 text-sm font-semibold">没有找到匹配的资料</p><p className="mt-1 text-xs text-[var(--text-muted)]">试试其他关键词，或清除筛选条件。</p><button type="button" onClick={resetFilters} className="mt-4 text-xs font-semibold text-[var(--brand)] hover:underline">清除全部筛选</button></div>}</section>
      <SideDrawer
        open={selected !== null}
        onClose={() => setSelected(null)}
        ariaLabel={selected ? `${selected.title}详情` : '资料详情'}
        eyebrow={<span className="text-[11px] font-semibold tracking-[0.2em] text-emerald-700 dark:text-emerald-300">资料详情 / {selected?.kind ?? ''}</span>}
        closeLabel="关闭资料详情"
        panelClassName="flex flex-col"
      >
        {selected && (
          <>
            <div className="mt-10 grid h-14 w-14 place-items-center rounded-2xl bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
              <BookOpen className="h-7 w-7" />
            </div>
            <h3 className="mt-5 text-2xl font-semibold leading-9">{selected.title}</h3>
            <p className="mt-3 text-sm leading-7 text-[var(--text-muted)]">{selected.description}</p>
            <div className="mt-7 flex flex-wrap gap-2">
              {selected.tags.map((item) => <span key={item} className="rounded-full bg-[var(--bg-elevated)] px-3 py-1.5 text-xs text-[var(--text-secondary)]">{item}</span>)}
            </div>
            <div className="mt-8 divide-y divide-[var(--border)] rounded-2xl border border-[var(--border)] px-5">
              <div className="flex justify-between gap-4 py-4 text-xs">
                <span className="text-[var(--text-muted)]">维护团队</span>
                <span className="font-semibold">{selected.owner}</span>
              </div>
              <div className="flex justify-between gap-4 py-4 text-xs">
                <span className="text-[var(--text-muted)]">最近更新</span>
                <span className="font-semibold">{selected.updated}</span>
              </div>
              <div className="flex justify-between gap-4 py-4 text-xs">
                <span className="text-[var(--text-muted)]">引用状态</span>
                <span className="inline-flex items-center gap-1 font-semibold text-emerald-700 dark:text-emerald-300">
                  <Check className="h-3.5 w-3.5" />示例来源信息
                </span>
              </div>
            </div>
            <div className="mt-8 rounded-2xl bg-[var(--bg-elevated)] p-5">
              <p className="text-xs font-semibold">内容摘要 · 演示</p>
              <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">{selected.excerpt}</p>
            </div>
            <div className="mt-7 grid gap-2 sm:grid-cols-3">
              <button type="button" onClick={() => toggleFavorite(selected)} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--brand)] px-3 py-2.5 text-xs font-semibold text-white">
                <Heart className="h-3.5 w-3.5" fill={favorites.includes(selected.id) ? 'currentColor' : 'none'} />
                {favorites.includes(selected.id) ? '取消收藏' : '收藏资料'}
              </button>
              <button type="button" onClick={() => useKnowledge(selected)} className="inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--border)] px-3 py-2.5 text-xs font-semibold text-[var(--text-secondary)]">
                <MessageCircleQuestion className="h-3.5 w-3.5" />带入对话
              </button>
              <button type="button" onClick={() => copyCitation(selected)} className="inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--border)] px-3 py-2.5 text-xs font-semibold text-[var(--text-secondary)]">
                <Share2 className="h-3.5 w-3.5" />复制引用
              </button>
            </div>
            <p className="mt-6 text-xs leading-6 text-[var(--text-muted)]">资料由管理员维护；你可以收藏、阅读并将它用于当前工作。</p>
          </>
        )}
      </SideDrawer>
    </div>
  );
}
