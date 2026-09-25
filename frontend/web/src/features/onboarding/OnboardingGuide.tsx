import { useEffect, useState } from 'react';
import {
  Activity, ArrowRight, BookOpen, Bot, Brain, BrainCircuit, BriefcaseBusiness,
  CheckCircle2, ChevronLeft, ChevronRight, ClipboardCheck, ListChecks,
  Send, ShieldCheck, Sparkles, Wrench, X,
} from 'lucide-react';
import { Button } from '@de/web-ui';
import { cn } from '@de/web-utils';
import type { Role } from '@de/web-types';
import { resolveAppRole, type AppRole } from '@/features/role-nav/role-nav';

type OnboardingGuideProps = {
  open: boolean;
  onClose: () => void;
  role?: Role;
};

/** 管理员侧栏预览 — 企业级智能体操作系统默认向导 */
export const PREVIEW_NAV_GROUPS = [
  { label: null, items: ['运营总览', '任务中心'] },
  { label: '智能体', items: ['智能体工厂', '协作会话'] },
  { label: '技能中心', items: ['技能·工具·MCP', '工作流程'] },
  { label: '知识资产', items: ['知识中心', '记忆中心'] },
  { label: '能力底座', items: ['模型服务', '消息渠道'] },
  { label: '治理', items: ['审计中心', '持续验证', '访问控制', '工作空间', '平台设置'] },
] as const;

export const PREVIEW_NAV_BY_ROLE: Record<AppRole, ReadonlyArray<{ label: string | null; items: readonly string[] }>> = {
  admin: PREVIEW_NAV_GROUPS,
  user: [
    { label: null, items: ['运营总览', '我的待办'] },
    { label: '工作台', items: ['协作会话'] },
    { label: '技能中心', items: ['技能·工具·MCP', '工作流程'] },
    { label: '我的空间', items: ['我的技能', '知识检索'] },
  ],
  auditor: [
    { label: null, items: ['运营总览'] },
    { label: '审计', items: ['审计中心', '持续验证'] },
    { label: '核查', items: ['任务核查', '协作记录', '伙伴档案', '流程版本', '知识引用', '技能权限', '记忆策略', '模型审计'] },
  ],
};

/** 三价值卡 — 企业级智能体平台差异化卖点 */
export const VALUE_CARDS = [
  {
    icon: ShieldCheck,
    eyebrow: '治理优先',
    title: '受控边界内协同',
    description: '身份、记忆、渠道与审批贯穿关键操作，守住智能体执行边界与数据合规。',
  },
  {
    icon: Bot,
    eyebrow: '能力底座',
    title: '智能体能力统一接入',
    description: '模型、知识、技能、记忆、消息渠道沉淀为统一资产，供智能体复用编排。',
  },
  {
    icon: ClipboardCheck,
    eyebrow: '可审计',
    title: '全过程证据关联',
    description: '协作、任务、上岗与治理证据全程留痕，支持复核、运营与合规导出。',
  },
];

/** 三步启用路径 */
export const JOURNEY_CARDS = [
  {
    number: '01',
    phase: 'Phase · 底座',
    title: '接入能力底座',
    description: '配置模型服务、知识库、技能与记忆策略，建立可被智能体调用的统一能力。',
  },
  {
    number: '02',
    phase: 'Phase · 编排',
    title: '编排智能体与工作流',
    description: '按业务角色设计智能体，组合工作流程与审批节点，完成试运行与评测。',
  },
  {
    number: '03',
    phase: 'Phase · 运营',
    title: '受控上岗与持续治理',
    description: '双重审批上岗后，在任务协作、持续验证与审计中心保护下开展日常运营。',
  },
];

const ROLE_WELCOME: Record<AppRole, { title: string; body: string; journeyTitle: string; journeyBody: string }> = {
  user: {
    title: '从协作会话与待办开始',
    body: '日常以智能体协作会话为主入口，用「我的待办」处理审批，用知识检索与技能清单辅助调用。',
    journeyTitle: '完成一次受控协作',
    journeyBody: '发起协作 → 智能体执行 → 处理待办 → 引用知识与技能，全程可追溯。',
  },
  admin: {
    title: '让智能体在受控边界内协同',
    body: '从能力底座、编排上岗到受控运营，统一身份权限、记忆策略与审计证据，沉淀为企业级智能体平台。',
    journeyTitle: '建立企业级智能体执行闭环',
    journeyBody: '沿「能力 → 编排 → 运营」完成企业级智能体平台启用，每一步可治理可审计。',
  },
  auditor: {
    title: '以审计与核查为中心',
    body: '直达审计中心与持续验证，对任务、协作与智能体能力进行只读核查与合规追溯。',
    journeyTitle: '完成一次合规核查',
    journeyBody: '审计中心检索证据 → 持续验证看裁决 → 任务/智能体能力核查复核。',
  },
};

const BRAND = 'var(--brand)';

export function OnboardingGuide({ open, onClose, role }: OnboardingGuideProps) {
  const [page, setPage] = useState<1 | 2>(1);
  const appRole = resolveAppRole(role);
  const welcome = ROLE_WELCOME[appRole];
  const previewNav = PREVIEW_NAV_BY_ROLE[appRole];

  useEffect(() => {
    if (open) setPage(1);
  }, [open]);

  if (!open) return null;

  const isJourney = page === 2;
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/40 p-3 backdrop-blur-md sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-title"
    >
      <section className="grid w-full max-w-6xl grid-cols-1 overflow-hidden rounded-[24px] border border-white/80 bg-white/70 shadow-[0_24px_72px_rgba(15,23,42,0.28)] backdrop-blur-2xl sm:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:grid-cols-[minmax(0,1.1fr)_minmax(420px,0.9fr)]">
        <PlatformPreview page={page} navGroups={previewNav} />

        <div className="relative flex flex-col border-l border-white/70 bg-[color-mix(in_srgb,var(--brand)_6%,white)] p-5 sm:p-6 lg:p-9">
          <button
            type="button"
            onClick={onClose}
            className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-md text-[var(--text-muted)] transition-colors hover:bg-white/70 hover:text-[var(--text)] sm:right-5 sm:top-5"
            aria-label="关闭引导"
          >
            <X className="h-4 w-4" />
          </button>

          {!isJourney ? (
            <div className="pr-9 sm:pr-10">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--brand)] sm:text-sm">
                <Sparkles className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                企业级智能体平台
              </div>
              <p className="mt-3 text-[13px] font-medium text-[var(--text-secondary)] sm:mt-5 sm:text-sm">欢迎进入企业级智能体平台</p>
              <h1 id="onboarding-title" className="mt-2 max-w-md text-[22px] font-semibold leading-tight tracking-tight text-[var(--brand)] sm:mt-3 sm:text-[30px]">
                {welcome.title}
              </h1>
              <p className="mt-3 max-w-md text-[13px] leading-6 text-[var(--text-secondary)] sm:mt-4 sm:text-[14px] sm:leading-7">
                {welcome.body}
              </p>
            </div>
          ) : (
            <div className="pr-9 sm:pr-10">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--brand)] sm:text-sm">核心路径</div>
              <h1 id="onboarding-title" className="mt-3 max-w-md text-[22px] font-semibold leading-tight tracking-tight text-[var(--brand)] sm:mt-4 sm:text-[30px]">
                {welcome.journeyTitle}
              </h1>
              <p className="mt-3 max-w-md text-[13px] leading-6 text-[var(--text-secondary)] sm:mt-4 sm:text-[14px] sm:leading-7">
                {welcome.journeyBody}
              </p>
            </div>
          )}

          <div className="mt-5 space-y-2.5 sm:mt-7 sm:space-y-3">
            {isJourney
              ? JOURNEY_CARDS.map((item) => (
                  <div
                    key={item.number}
                    className="flex gap-3 rounded-xl border border-white/90 bg-white/85 px-3.5 py-3 shadow-[0_8px_20px_rgba(79,70,229,0.08)] sm:gap-4 sm:px-4 sm:py-3.5"
                  >
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-[var(--brand)] to-[var(--purple)] text-[11px] font-bold text-white shadow-sm sm:h-10 sm:w-10 sm:text-[12px]">
                      {item.number}
                    </span>
                    <div className="min-w-0">
                      <div className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[var(--brand)] sm:text-[11px]">
                        {item.phase}
                      </div>
                      <h2 className="mt-0.5 text-[14px] font-semibold text-[var(--text)] sm:text-[15px]">{item.title}</h2>
                      <p className="mt-1 text-[12px] leading-5 text-[var(--text-secondary)] sm:text-[13px] sm:leading-6">{item.description}</p>
                    </div>
                  </div>
                ))
              : VALUE_CARDS.map(({ icon: Icon, eyebrow, title, description }) => (
                  <div
                    key={title}
                    className="flex gap-3 rounded-xl border border-white/90 bg-white/85 px-3.5 py-3 shadow-[0_8px_20px_rgba(79,70,229,0.08)] sm:gap-4 sm:px-4 sm:py-3.5"
                  >
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[var(--brand-light)] text-[var(--brand)] sm:h-10 sm:w-10">
                      <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
                    </span>
                    <div className="min-w-0">
                      <div className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[var(--brand)] sm:text-[11px]">
                        {eyebrow}
                      </div>
                      <h2 className="mt-0.5 text-[14px] font-semibold text-[var(--text)] sm:text-[15px]">{title}</h2>
                      <p className="mt-1 text-[12px] leading-5 text-[var(--text-secondary)] sm:text-[13px] sm:leading-6">{description}</p>
                    </div>
                  </div>
                ))}
          </div>

          <div className="mt-6 flex items-center gap-2 sm:mt-8 sm:gap-3">
            <div className="mr-auto flex items-center gap-1 text-xs font-medium text-[var(--text-muted)] sm:gap-2">
              <button
                type="button"
                onClick={() => setPage(1)}
                disabled={page === 1}
                className="grid h-8 w-8 place-items-center rounded-md text-[var(--text-muted)] transition-colors hover:bg-white/70 hover:text-[var(--brand)] disabled:cursor-not-allowed disabled:opacity-35"
                aria-label="上一页"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="min-w-8 text-center tabular-nums">{page}/2</span>
              <button
                type="button"
                onClick={() => setPage(2)}
                disabled={page === 2}
                className="grid h-8 w-8 place-items-center rounded-md text-[var(--text-muted)] transition-colors hover:bg-white/70 hover:text-[var(--brand)] disabled:cursor-not-allowed disabled:opacity-35"
                aria-label="下一页"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
            {!isJourney && (
              <Button variant="ghost" size="sm" onClick={onClose}>
                跳过
              </Button>
            )}
            {isJourney ? (
              <Button size="sm" onClick={onClose}>
                开始使用<CheckCircle2 className="h-4 w-4" />
              </Button>
            ) : (
              <Button size="sm" onClick={() => setPage(2)}>
                下一步<ArrowRight className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

function PlatformPreview({
  page,
  navGroups,
}: {
  page: 1 | 2;
  navGroups: ReadonlyArray<{ label: string | null; items: readonly string[] }>;
}) {
  const flat = navGroups.flatMap((g) => [...g.items]);
  const active = page === 1 ? (flat.find((i) => /知识|技能|模型/.test(i)) ?? flat[0]) : (flat.find((i) => /智能体|协作/.test(i)) ?? flat[1] ?? flat[0]);
  return (
    <div className="relative hidden self-stretch overflow-hidden bg-[color-mix(in_srgb,var(--brand)_8%,#f8fafc)] p-3 sm:block sm:p-5 lg:p-7">
      <div className="flex h-full min-h-0 overflow-hidden rounded-2xl border border-white/90 bg-white/85 shadow-[0_16px_36px_rgba(79,70,229,0.10)]">
        <PreviewNavigation active={active} navGroups={navGroups} />
        <div className="min-w-0 flex-1 overflow-hidden p-3 sm:p-4 lg:p-5">
          {page === 1 ? (
            <>
              <PreviewHeader
                eyebrow="能力底座"
                title="智能体能力接入"
                detail="模型 / 知识 / 技能 / 记忆 / 渠道 统一接入"
                badge="已准入 12 项"
              />
              <CapabilitiesThumbnail />
            </>
          ) : (
            <>
              <PreviewHeader
                eyebrow="上岗闭环"
                title="智能体编排与运营"
                detail="角色编排 · 工作流 · 双重审批 · 持续验证"
                badge="生产"
              />
              <OrchestrationThumbnail />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function PreviewNavigation({
  active,
  navGroups,
}: {
  active: string;
  navGroups: ReadonlyArray<{ label: string | null; items: readonly string[] }>;
}) {
  return (
    <aside className="hidden w-[120px] shrink-0 flex-col border-r border-[color-mix(in_srgb,var(--brand)_12%,transparent)] bg-white/80 p-3 lg:flex lg:w-[148px]">
      <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[var(--brand)]">
        <span className="grid h-6 w-6 place-items-center rounded-md bg-gradient-to-br from-[var(--brand)] to-[var(--purple)] text-[9px] font-bold text-white">EA</span>
        <span className="hidden lg:inline">智能体平台</span>
      </div>
      <div className="mt-4 space-y-2.5">
        {navGroups.map((group) => (
          <div key={group.label ?? 'root'}>
            {group.label && (
              <div className="mb-1 px-1.5 text-[9px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                {group.label}
              </div>
            )}
            <div className="space-y-0.5">
              {group.items.map((item) => (
                <div
                  key={item}
                  className={cn(
                    'rounded-md px-1.5 py-1 text-[10px] leading-tight transition-colors',
                    item === active
                      ? 'bg-[var(--brand-light)] font-semibold text-[var(--brand)]'
                      : 'text-[var(--text-muted)]',
                  )}
                >
                  {item}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-auto rounded-md bg-[color-mix(in_srgb,var(--brand)_6%,white)] px-2 py-1.5 text-[9px] text-[var(--text-muted)]">
        平台设置 · 治理
      </div>
    </aside>
  );
}

function PreviewHeader({
  eyebrow,
  title,
  detail,
  badge,
}: {
  eyebrow: string;
  title: string;
  detail: string;
  badge: string;
}) {
  return (
    <div className="flex items-center justify-between gap-2 border-b border-[color-mix(in_srgb,var(--brand)_12%,transparent)] pb-2.5 sm:pb-3">
      <div className="min-w-0">
        <div className="text-[9px] font-semibold uppercase tracking-widest text-[var(--brand)] sm:text-[10px]">
          {eyebrow}
        </div>
        <div className="mt-0.5 text-[12px] font-semibold text-[var(--text)] sm:text-[13px]">{title}</div>
        <div className="mt-0.5 truncate text-[9px] text-[var(--text-muted)] sm:text-[10px]">{detail}</div>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        <span className="rounded-md border border-[color-mix(in_srgb,var(--brand)_22%,transparent)] bg-[var(--brand-light)] px-2 py-1 text-[9px] font-medium text-[var(--brand)]">
          {badge}
        </span>
        <span className="h-2 w-2 rounded-full bg-[var(--success)]" />
      </div>
    </div>
  );
}

function CapabilitiesThumbnail() {
  const capabilities = [
    { icon: Brain, label: '模型', value: '06' },
    { icon: BookOpen, label: '知识', value: '24' },
    { icon: BrainCircuit, label: '记忆', value: '18' },
    { icon: Send, label: '渠道', value: '05' },
  ];
  return (
    <div className="pt-3 sm:pt-4">
      <div className="grid grid-cols-2 gap-2 sm:gap-3">
        {capabilities.map(({ icon: Icon, label, value }) => (
          <div
            key={label}
            className="rounded-xl border border-[color-mix(in_srgb,var(--brand)_14%,transparent)] bg-white p-2.5 shadow-[0_4px_12px_rgba(79,70,229,0.05)] sm:p-3"
          >
            <Icon className="h-3.5 w-3.5 text-[var(--brand)]" />
            <div className="mt-2.5 text-lg font-semibold text-[var(--text)] sm:mt-3 sm:text-xl">{value}</div>
            <div className="mt-0.5 text-[9px] text-[var(--text-muted)] sm:text-[10px]">{label}</div>
          </div>
        ))}
      </div>
      <div className="mt-3 rounded-xl border border-[color-mix(in_srgb,var(--brand)_14%,transparent)] bg-white p-2.5 sm:p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[10px] font-medium text-[var(--text)] sm:text-xs">
            <Wrench className="h-3 w-3 text-[var(--brand)]" />
            智能体能力就绪
          </div>
          <span className="text-[9px] text-[var(--brand)]">12 项已准入</span>
        </div>
        <div className="mt-3 grid grid-cols-4 gap-1.5">
          <div className="h-1.5 rounded-full bg-[var(--brand)]" />
          <div className="h-1.5 rounded-full" style={{ background: 'color-mix(in srgb, var(--brand) 70%, white)' }} />
          <div className="h-1.5 rounded-full" style={{ background: 'color-mix(in srgb, var(--brand) 40%, white)' }} />
          <div className="h-1.5 rounded-full" style={{ background: 'color-mix(in srgb, var(--brand) 18%, white)' }} />
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between rounded-xl border border-[color-mix(in_srgb,var(--brand)_22%,transparent)] bg-[var(--brand-light)] px-2.5 py-2 text-[9px] text-[var(--brand)] sm:px-3 sm:py-2.5 sm:text-[10px]">
        <span className="inline-flex items-center gap-1"><ShieldCheck className="h-3 w-3" />持续验证</span>
        <span className="inline-flex items-center gap-1"><ClipboardCheck className="h-3 w-3" />审计已关联</span>
      </div>
    </div>
  );
}

function OrchestrationThumbnail() {
  const employees = [
    { name: '客服协同助理', state: '已上岗', icon: BriefcaseBusiness },
    { name: '合同审核员', state: '待审批', icon: ListChecks },
    { name: '知识运营员', state: '试运行', icon: Bot },
  ];
  return (
    <div className="pt-3 sm:pt-4">
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <PreviewMetric label="在岗" value="08" />
        <PreviewMetric label="待上岗" value="03" />
        <PreviewMetric label="任务中" value="12" />
      </div>
      <div className="mt-3 rounded-xl border border-[color-mix(in_srgb,var(--brand)_14%,transparent)] bg-white p-2.5 sm:p-3">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[10px] font-medium text-[var(--text)] sm:text-xs">智能体上岗队列</span>
          <Activity className="h-3.5 w-3.5 text-[var(--brand)]" />
        </div>
        <div className="space-y-2">
          {employees.map((item, index) => (
            <div key={item.name} className="flex items-center gap-2 rounded-md bg-[color-mix(in_srgb,var(--brand)_5%,white)] px-2 py-2">
              <span className="grid h-5 w-5 place-items-center rounded bg-[var(--brand-light)] text-[9px] font-semibold text-[var(--brand)]">
                {index + 1}
              </span>
              <item.icon className="hidden h-3 w-3 text-[var(--brand)] sm:block" />
              <span className="min-w-0 flex-1 truncate text-[9px] text-[var(--text)] sm:text-[10px]">{item.name}</span>
              <span className="text-[9px] text-[var(--brand)]">{item.state}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between rounded-xl border border-[color-mix(in_srgb,var(--brand)_22%,transparent)] bg-[var(--brand-light)] px-2.5 py-2 text-[9px] text-[var(--brand)] sm:px-3 sm:py-2.5 sm:text-[10px]">
        <span className="inline-flex items-center gap-1"><ShieldCheck className="h-3 w-3" />持续验证</span>
        <span className="inline-flex items-center gap-1"><ClipboardCheck className="h-3 w-3" />审计已关联</span>
      </div>
    </div>
  );
}

function PreviewMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[color-mix(in_srgb,var(--brand)_14%,transparent)] bg-white p-2 sm:p-3">
      <div className="text-[9px] text-[var(--text-muted)] sm:text-[10px]">{label}</div>
      <div className="mt-1 text-base font-semibold sm:mt-2 sm:text-lg" style={{ color: BRAND }}>{value}</div>
    </div>
  );
}