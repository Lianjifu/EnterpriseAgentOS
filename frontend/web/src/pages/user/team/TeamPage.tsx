import { ArrowRight, Bot, Check, ChevronRight, FileCheck2, FileText, Heart, MailPlus, MessageSquareText, Search, Share2, Sparkles, UsersRound } from 'lucide-react';
import { useMemo, useState } from 'react';
import { CenterModal } from '@/components/feedback/CenterModal';
import { NoticeBanner } from '@/components/feedback/NoticeBanner';
import { SideDrawer } from '@/components/feedback/SideDrawer';
import { useInviteMember, useMembers, useSharedItems, useTeams } from '@/api/user/team';
import type { Member, SharedItem, SharedKind, Team } from '@/api/user/team/schema';
import { mockTeams, mockMembers, mockSharedItems } from '@/mock/user/team.fixtures';

type TabLabel = '成员' | '智能体' | '知识' | '产出物';
type TabValue = 'members' | SharedKind;

const TABS: Array<{ label: TabLabel; value: TabValue }> = [
  { label: '成员', value: 'members' },
  { label: '智能体', value: 'agent' },
  { label: '知识', value: 'knowledge' },
  { label: '产出物', value: 'output' },
];

function accentClass(accent: Team['accent']) {
  return accent === 'emerald'
    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300'
    : accent === 'sky'
      ? 'bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300'
      : 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300';
}

function kindIcon(kind: SharedKind) {
  return kind === 'agent' ? Bot : kind === 'knowledge' ? FileText : FileCheck2;
}

export default function TeamPage() {
  const { data: remoteTeams } = useTeams();
  const { data: remoteMembers } = useMembers();
  const { data: remoteShared } = useSharedItems();
  const invite = useInviteMember();

  const teams = (remoteTeams && remoteTeams.length > 0 ? remoteTeams : mockTeams) as Team[];
  const initialMembers = (remoteMembers && remoteMembers.length > 0 ? remoteMembers : mockMembers) as Member[];
  const initialShared = (remoteShared && remoteShared.length > 0 ? remoteShared : mockSharedItems) as SharedItem[];

  const [members, setMembers] = useState<Member[]>(initialMembers);
  const [favorites, setFavorites] = useState<string[]>(['a2']);
  const [activeTeam, setActiveTeam] = useState<string>(teams[0]?.name ?? '产品协作组');
  const [tab, setTab] = useState<TabValue>('members');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<SharedItem | Member | null>(null);
  const [inviting, setInviting] = useState(false);
  const [email, setEmail] = useState('');
  const [notice, setNotice] = useState('');

  const visibleMembers = useMemo(
    () => members.filter((member) => member.team === activeTeam && `${member.name} ${member.role}`.toLowerCase().includes(query.trim().toLowerCase())),
    [members, activeTeam, query],
  );
  const visibleItems = useMemo(
    () => initialShared.filter((item) => item.team === activeTeam && item.kind === tab && `${item.title} ${item.description} ${item.owner} ${item.label}`.toLowerCase().includes(query.trim().toLowerCase())),
    [initialShared, activeTeam, tab, query],
  );
  const currentTeam = teams.find((item) => item.name === activeTeam) ?? teams[0];

  const submitInvite = () => {
    const trimmed = email.trim();
    if (!trimmed || !currentTeam) return;
    const invitee: Member = {
      id: `local-${Date.now()}`,
      name: trimmed,
      role: '待邀请 · 本地演示',
      team: activeTeam,
      initials: trimmed.slice(0, 1).toUpperCase(),
      color: 'bg-[var(--brand-light)] text-[var(--brand)]',
    };
    setMembers((current) => [invitee, ...current]);
    setTab('members');
    setQuery('');
    setInviting(false);
    setEmail('');
    setNotice(`"${trimmed}"已加入本页待邀请列表,未发送真实邀请。`);
    invite.mutate({ team: activeTeam, email: trimmed });
  };

  const isResource = (item: SharedItem | Member): item is SharedItem => 'kind' in item;

  return (
    <div className="mx-auto max-w-7xl space-y-8 p-5 pb-16 sm:p-8">
      <section className="relative overflow-hidden rounded-[28px] border border-[var(--border)] bg-[var(--surface-1)] px-6 py-8 shadow-[var(--shadow-sm)] sm:px-9 sm:py-10"><div aria-hidden="true" className="pointer-events-none absolute -right-10 top-0 flex gap-2 opacity-15"><span className="mt-16 h-32 w-32 rounded-full bg-sky-400" /><span className="h-40 w-40 rounded-full bg-[var(--brand)]" /></div><div className="relative grid gap-8 lg:grid-cols-[1fr_300px] lg:items-end"><div><p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-sky-700 dark:text-sky-300">TOGETHER / 我的协作</p><h2 className="mt-4 max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">好的工作,不必从零开始。</h2><p className="mt-4 max-w-xl text-sm leading-7 text-[var(--text-muted)]">找到一起工作的人,接住团队共享的智能体、知识与成果。</p><button type="button" onClick={() => setInviting(true)} className="mt-7 inline-flex items-center gap-2 rounded-xl bg-[var(--brand)] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[var(--brand-hover)]"><MailPlus className="h-4 w-4" />邀请协作者</button></div><div className="relative rounded-2xl border border-sky-400/20 bg-sky-50/80 p-5 dark:bg-sky-500/10"><p className="flex items-center gap-2 text-xs font-semibold text-sky-800 dark:text-sky-300"><Share2 className="h-4 w-4" />协作约定</p><p className="mt-4 text-lg font-semibold leading-7">分享的是可用的上下文,不只是一个链接。</p><p className="mt-2 text-xs leading-6 text-[var(--text-muted)]">每份共享内容都带着维护人、归属团队和用途说明。</p></div></div></section>

      {notice && <NoticeBanner tone="sky" onClose={() => setNotice('')}>{notice}</NoticeBanner>}

      <div className="grid gap-6 xl:grid-cols-[270px_minmax(0,1fr)]"><aside className="space-y-5"><section className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-4"><div className="px-2 pb-3"><p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">SPACES</p><h3 className="mt-2 text-sm font-semibold">我的协作空间</h3></div><div className="space-y-1" role="group" aria-label="选择协作空间">{teams.map((team) => <button key={team.name} type="button" aria-pressed={activeTeam === team.name} onClick={() => { setActiveTeam(team.name); setQuery(''); setSelected(null); }} className={`flex w-full items-center gap-3 rounded-xl p-3 text-left transition ${activeTeam === team.name ? 'bg-[var(--brand-light)] text-[var(--brand)] dark:text-indigo-200' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'}`}><span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${accentClass(team.accent)}`}><UsersRound className="h-4 w-4" /></span><span className="min-w-0 flex-1"><span className="block truncate text-xs font-semibold">{team.name}</span><span className="mt-0.5 block truncate text-[10px] opacity-70">{team.note}</span></span><ChevronRight className="h-4 w-4 shrink-0" /></button>)}</div></section><div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-5"><span className="grid h-9 w-9 place-items-center rounded-xl bg-[var(--brand-light)] text-[var(--brand)]"><Sparkles className="h-4 w-4" /></span><p className="mt-4 text-sm font-semibold">一起推进,而不是来回寻找</p><p className="mt-2 text-xs leading-6 text-[var(--text-muted)]">切换空间,查看当前团队已经准备好的成员与共享内容。</p></div></aside>
        <section className="min-w-0 space-y-5"><div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-5 sm:p-6"><div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div><p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-sky-700 dark:text-sky-300">CURRENT SPACE</p><h3 className="mt-2 text-xl font-semibold">{currentTeam?.name ?? ''}</h3><p className="mt-1 text-xs leading-6 text-[var(--text-muted)]">{currentTeam?.note ?? ''}</p></div><span className="inline-flex w-fit items-center gap-1 rounded-full bg-[var(--success-bg)] px-3 py-1.5 text-[11px] font-semibold text-[var(--success)]"><Check className="h-3.5 w-3.5" />演示空间</span></div><div className="mt-6 grid gap-3 sm:grid-cols-3"><div className="rounded-xl bg-[var(--bg-elevated)] p-4"><p className="text-xs font-semibold">一起参与</p><p className="mt-1 text-xs text-[var(--text-muted)]">找到协作伙伴与职责</p></div><div className="rounded-xl bg-[var(--bg-elevated)] p-4"><p className="text-xs font-semibold">共享能力</p><p className="mt-1 text-xs text-[var(--text-muted)]">复用已经验证的做法</p></div><div className="rounded-xl bg-[var(--bg-elevated)] p-4"><p className="text-xs font-semibold">保留成果</p><p className="mt-1 text-xs text-[var(--text-muted)]">让工作结果可追溯</p></div></div></div>
          <div><div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--brand)]">SHARED WITH ME</p><h3 className="mt-2 text-xl font-semibold">团队里的内容</h3></div><div className="relative w-full sm:max-w-xs"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" /><label className="sr-only" htmlFor="team-search">搜索团队内容</label><input id="team-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索成员或共享内容" className="h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-1)] pl-10 pr-3 text-sm outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--brand)]" /></div></div><div role="tablist" aria-label="共享内容类型" className="mt-5 flex gap-1 overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-1">{TABS.map((item) => <button key={item.value} type="button" role="tab" aria-selected={tab === item.value} onClick={() => setTab(item.value)} className={`min-w-20 flex-1 rounded-lg px-3 py-2.5 text-xs font-semibold transition ${tab === item.value ? 'bg-[var(--text)] text-[var(--surface-1)]' : 'text-[var(--text-muted)] hover:bg-[var(--bg-hover)]'}`}>{item.label}</button>)}</div>
            {tab === 'members' ? <div className="mt-4 grid gap-3 md:grid-cols-2">{visibleMembers.map((member) => <button key={member.id} type="button" onClick={() => setSelected(member)} className="flex items-center gap-4 rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-4 text-left transition hover:-translate-y-0.5 hover:border-sky-400/50 hover:shadow-[var(--shadow-sm)]"><span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl text-sm font-bold ${member.color}`}>{member.initials}</span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{member.name}</span><span className="mt-1 block truncate text-xs text-[var(--text-muted)]">{member.role}</span></span><ChevronRight className="h-4 w-4 shrink-0 text-[var(--text-muted)]" /></button>)}</div> : <div className="mt-4 grid gap-3 md:grid-cols-2">{visibleItems.map((item) => { const Icon = kindIcon(item.kind); return <article key={item.id} className="flex min-h-[180px] flex-col rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-5 transition hover:border-sky-400/50 hover:shadow-[var(--shadow-sm)]"><div className="flex items-start justify-between"><span className="grid h-10 w-10 place-items-center rounded-xl bg-sky-50 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300"><Icon className="h-5 w-5" /></span><button type="button" aria-label={`${favorites.includes(item.id) ? '取消收藏' : '收藏'}${item.title}`} aria-pressed={favorites.includes(item.id)} onClick={() => setFavorites((current) => current.includes(item.id) ? current.filter((id) => id !== item.id) : [...current, item.id])} className={`rounded-lg p-2 ${favorites.includes(item.id) ? 'text-rose-500' : 'text-[var(--text-muted)] hover:text-rose-500'}`}><Heart className="h-4 w-4" fill={favorites.includes(item.id) ? 'currentColor' : 'none'} /></button></div><button type="button" onClick={() => setSelected(item)} className="mt-4 text-left"><span className="text-[10px] font-semibold text-sky-700 dark:text-sky-300">{item.label} · {item.updated}</span><h4 className="mt-2 text-sm font-semibold hover:text-[var(--brand)]">{item.title}</h4><p className="mt-2 line-clamp-2 text-xs leading-6 text-[var(--text-muted)]">{item.description}</p></button><div className="mt-auto flex items-center justify-between pt-4 text-[11px] text-[var(--text-muted)]"><span>由 {item.owner} 共享</span><button type="button" onClick={() => setSelected(item)} className="inline-flex items-center gap-1 font-semibold text-[var(--brand)]">查看详情<ChevronRight className="h-3.5 w-3.5" /></button></div></article>; })}</div>}
            {(tab === 'members' ? visibleMembers.length : visibleItems.length) === 0 && <div className="mt-4 rounded-2xl border border-dashed border-[var(--border-strong)] bg-[var(--surface-1)] p-12 text-center"><Search className="mx-auto h-6 w-6 text-[var(--text-muted)]" /><p className="mt-3 text-sm font-semibold">当前视图没有匹配内容</p><p className="mt-1 text-xs text-[var(--text-muted)]">切换分类或尝试其他关键词。</p></div>}
          </div></section></div>

      <SideDrawer
        open={selected !== null}
        onClose={() => setSelected(null)}
        ariaLabel={selected ? (isResource(selected) ? `${selected.title}详情` : `${selected.name}详情`) : '协作详情'}
        eyebrow={<p className="text-[11px] font-semibold tracking-[0.2em] text-sky-700 dark:text-sky-300">{activeTeam} / 详情</p>}
        closeLabel="关闭协作详情"
      >
        {selected && (
          <>
            <span className="mt-10 grid h-14 w-14 place-items-center rounded-2xl bg-sky-50 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300">
              {isResource(selected) ? <Share2 className="h-7 w-7" /> : <UsersRound className="h-7 w-7" />}
            </span>
            <h3 className="mt-5 text-2xl font-semibold">{isResource(selected) ? selected.title : selected.name}</h3>
            <p className="mt-3 text-sm leading-7 text-[var(--text-muted)]">{isResource(selected) ? selected.description : `${selected.role} · ${selected.team}`}</p>
            <div className="mt-8 divide-y divide-[var(--border)] rounded-2xl border border-[var(--border)] px-5">
              <div className="flex justify-between gap-4 py-4 text-xs">
                <span className="text-[var(--text-muted)]">归属空间</span>
                <span className="font-semibold">{selected.team}</span>
              </div>
              <div className="flex justify-between gap-4 py-4 text-xs">
                <span className="text-[var(--text-muted)]">{isResource(selected) ? '共享者' : '参与方式'}</span>
                <span className="font-semibold">{isResource(selected) ? selected.owner : selected.role}</span>
              </div>
              {isResource(selected) && (
                <div className="flex justify-between gap-4 py-4 text-xs">
                  <span className="text-[var(--text-muted)]">最近动态</span>
                  <span className="font-semibold">{selected.updated}</span>
                </div>
              )}
            </div>
            <div className="mt-8 rounded-2xl bg-[var(--bg-elevated)] p-5">
              <p className="flex items-center gap-2 text-xs font-semibold"><MessageSquareText className="h-4 w-4 text-[var(--brand)]" />协作提示</p>
              <p className="mt-2 text-xs leading-6 text-[var(--text-muted)]">这个视图展示前端演示数据。真实分享范围和成员权限需要接入协作服务后确认。</p>
            </div>
          </>
        )}
      </SideDrawer>
      <CenterModal
        open={inviting}
        onClose={() => setInviting(false)}
        ariaLabel="邀请协作者"
        title={`邀请加入 ${activeTeam}`}
        description="填写邮箱后将加入本页演示列表,不会发送邮件。"
        closeLabel="关闭邀请窗口"
        panelClassName="max-w-md"
        onSubmit={(event) => { event.preventDefault(); submitInvite(); }}
        footer={
          <>
            <button type="button" onClick={() => setInviting(false)} className="rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm font-medium">取消</button>
            <button type="submit" disabled={!email.trim()} className="inline-flex items-center gap-2 rounded-xl bg-[var(--brand)] px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40">
              <MailPlus className="h-4 w-4" />加入演示列表
            </button>
          </>
        }
      >
        <label className="mt-6 block text-xs font-semibold">协作者邮箱
          <input
            autoFocus
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="name@company.com"
            className="mt-2 h-11 w-full rounded-xl border border-[var(--border-strong)] bg-[var(--bg-elevated)] px-3 text-sm outline-none focus:border-[var(--brand)]"
          />
        </label>
      </CenterModal>
    </div>
  );
}