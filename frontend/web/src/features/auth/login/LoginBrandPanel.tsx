/**
 * LoginBrandPanel — 左侧品牌展示区
 *
 * 单内容块垂直居中:brand mark(顶) + hero 段(badge → title → subtitle
 *   → bullets → stats → footnote)
 * aside 用 `justify-center` 让内容块在视口高度中居中,避免上半部空白
 */
import { ShieldCheck, Gauge, Sparkles, Shield, Activity } from 'lucide-react';
import { BrandLogo } from '@/components/feedback/BrandLogo';

export interface LoginHeroStat {
  value: string;
  label: string;
}

export interface LoginHeroBullet {
  Icon: typeof ShieldCheck;
  tone: 'brand' | 'purple' | 'muted';
  title: string;
  desc: string;
}

interface LoginBrandPanelProps {
  product: string;
  tagline: string;
  badge: string;
  buildVersion: string;
  title1: string;
  title2: string;
  subtitle: string;
  bullets: LoginHeroBullet[];
  stats: LoginHeroStat[];
  footnote: string;
}

const toneClass: Record<LoginHeroBullet['tone'], string> = {
  brand: 'bg-[var(--brand-light)] text-[var(--brand)]',
  purple: 'bg-[var(--purple-bg)] text-[var(--purple)]',
  muted: 'bg-[var(--bg-hover)] text-[var(--text-secondary)]',
};

// 三个 stats 用不同色系形成视觉节奏:
//   1 智能体能力 → brand 紫
//   2 审计覆盖   → emerald(治理/审计)
//   3 鉴权响应   → amber(性能/响应)
const statIconClass = [
  'text-[var(--brand)]',
  'text-emerald-600 dark:text-emerald-400',
  'text-amber-600 dark:text-amber-400',
];

export function LoginBrandPanel(props: LoginBrandPanelProps) {
  return (
    <aside
      className="login-brand relative hidden flex-col items-stretch justify-center overflow-hidden
                 px-10 py-16
                 md:flex md:px-14 md:py-20
                 lg:px-20 lg:py-24
                 xl:px-24 xl:py-28"
      aria-label="产品介绍"
    >
      <div aria-hidden className="absolute inset-0 bg-slate-50 dark:bg-[#101827]" />
      {/* Dot grid texture overlay */}
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.5] dark:opacity-[0.22]
                   [background-image:linear-gradient(rgba(79,70,229,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(79,70,229,0.06)_1px,transparent_1px)]
                   dark:[background-image:linear-gradient(rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.06)_1px,transparent_1px)]
                   [background-size:24px_24px]
                   animate-[loginDotDrift_12s_ease-in-out_infinite]"
      />

      {/* Single centred content block — brand mark + hero段 stack together,
          wrapper vertically centres both so the panel has no giant top void */}
      <div className="relative mx-auto flex w-full max-w-[520px] flex-col text-left">
        {/* Top: brand mark */}
        <div className="relative flex items-center gap-2.5 self-start text-left">
          <BrandLogo size={40} className="text-[var(--brand)]" ariaLabel="企智搭 · 智能体平台" />
          <div className="leading-tight">
            <div className="text-[15px] font-semibold text-slate-900 dark:text-white">{props.product}</div>
            <div className="text-[12px] text-slate-500 dark:text-slate-400">{props.tagline}</div>
          </div>
        </div>

        {/* Middle: hero + bullets — text left-aligned */}
        <div className="relative mt-12 w-full">
        <div className="mb-4 inline-flex items-center gap-1.5 rounded-full
                        border border-[var(--border)] bg-[var(--surface-1)]/70 px-3 py-1
                        text-[11px] font-medium text-[var(--text-secondary)] backdrop-blur-sm">
          <Sparkles className="h-3 w-3 text-[var(--brand)]" />
          {props.badge}
        </div>
        <h2 className="text-[28px] font-semibold leading-[1.2] tracking-tight text-slate-900 dark:text-white md:text-[30px] lg:text-[32px]">
          {props.title1}
          <br />
          <span className="text-indigo-600 dark:text-indigo-300">
            {props.title2}
          </span>
        </h2>
        <p className="mt-6 text-[15px] leading-[1.75] text-slate-600 dark:text-slate-300">
          {props.subtitle}
        </p>

        <ul className="mt-8 space-y-4 text-[14px] text-slate-600 dark:text-slate-300">
          {props.bullets.map((b) => (
            <li key={b.title} className="flex items-start gap-3">
              <span
                className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-md ${toneClass[b.tone]}`}
              >
                <b.Icon className="h-3.5 w-3.5" />
              </span>
              <span className="leading-relaxed">
                <b className="text-slate-900 dark:text-white">{b.title}</b>
                <span className="text-slate-400 dark:text-[var(--text-muted)]"> · </span>
                {b.desc}
              </span>
            </li>
          ))}
        </ul>

        {/* Stats — grouped with hero block so the panel doesn't get a giant mid-section void */}
        <div className="mt-8 grid grid-cols-3 gap-3">
          {props.stats.map((s, idx) => {
            const Icon = idx === 1 ? Shield : idx === 2 ? Activity : Gauge;
            const iconClass = statIconClass[idx] ?? statIconClass[0];
            return (
              <div
                key={s.label}
                className="rounded-lg bg-white/80 ring-1 ring-slate-200
                           px-3.5 py-3 backdrop-blur-sm
                           dark:bg-white/5 dark:ring-white/10"
              >
                <Icon className={`mb-1.5 h-4 w-4 ${iconClass}`} />
                  <div className="text-[16px] font-semibold leading-tight tracking-tight text-slate-900 dark:text-white">
                  {s.value}
                </div>
                <div className="text-[11.5px] leading-tight text-slate-500 dark:text-slate-400">{s.label}</div>
              </div>
            );
          })}
        </div>

        <div className="mt-6 text-[12px] leading-relaxed text-slate-500 dark:text-slate-500">{props.footnote}</div>
        </div>
      </div>
    </aside>
  );
}
