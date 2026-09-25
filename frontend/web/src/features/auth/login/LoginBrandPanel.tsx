/**
 * LoginBrandPanel — 左侧品牌展示区
 *
 * 三段式布局:brand mark(顶) + hero + bullets(中) + footnote(底)
 * 由父 LoginPage 用 `justify-between` 自动垂直分布
 */
import { Bot, ShieldCheck, Gauge, Sparkles } from 'lucide-react';

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

export function LoginBrandPanel(props: LoginBrandPanelProps) {
  return (
    <aside
      className="login-brand relative hidden flex-col justify-between items-center overflow-hidden
                 px-10 py-16
                 md:flex md:px-14 md:py-20
                 lg:px-20 lg:py-24
                 xl:px-24 xl:py-28"
      aria-label="产品介绍"
    >
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-br from-indigo-50 via-white to-violet-50
                   dark:from-indigo-950/40 dark:via-[var(--bg)] dark:to-violet-950/40"
      />
      {/* Dot grid texture overlay */}
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.35] dark:opacity-[0.18]
                   [background-image:radial-gradient(circle_at_1px_1px,rgba(79,70,229,0.18)_1px,transparent_0)]
                   [background-size:24px_24px]
                   animate-[loginDotDrift_12s_ease-in-out_infinite]"
      />
      <div
        aria-hidden
        className="absolute -right-24 -top-32 h-[420px] w-[420px] rounded-full
                   bg-indigo-200/50 blur-3xl dark:bg-indigo-800/30
                   animate-[loginFloat_18s_ease-in-out_infinite]"
      />
      <div
        aria-hidden
        className="absolute -bottom-24 -left-24 h-[360px] w-[360px] rounded-full
                   bg-violet-200/50 blur-3xl dark:bg-violet-800/30
                   animate-[loginFloat_22s_ease-in-out_infinite_reverse]"
      />
      <div
        aria-hidden
        className="absolute top-1/3 left-1/4 h-[260px] w-[260px] rounded-full
                   bg-fuchsia-200/30 blur-3xl dark:bg-fuchsia-800/20
                   animate-[loginFloat_26s_ease-in-out_infinite]"
      />

      {/* Top: brand mark */}
      <div className="relative flex w-full max-w-[520px] items-center gap-2.5">
        <div
          className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br
                      from-[var(--brand)] to-[var(--purple)] text-white shadow-sm"
          aria-hidden
        >
          <Bot className="h-4.5 w-4.5" />
        </div>
        <div className="leading-tight">
          <div className="text-[14px] font-semibold text-[var(--text)]">{props.product}</div>
          <div className="text-[11px] text-[var(--text-muted)]">{props.tagline}</div>
        </div>
      </div>

      {/* Middle: hero + bullets */}
      <div className="relative w-full max-w-[520px]">
        <div className="mb-3 inline-flex items-center gap-1.5 rounded-full
                        border border-[var(--border)] bg-[var(--surface-1)]/70 px-2.5 py-1
                        text-[10px] font-medium text-[var(--text-secondary)] backdrop-blur-sm">
          <Sparkles className="h-3 w-3 text-[var(--brand)]" />
          {props.badge} · v{props.buildVersion}
        </div>
        <h2 className="text-[28px] font-semibold leading-[1.2] tracking-tight text-[var(--text)] md:text-[32px] lg:text-[34px]">
          {props.title1}
          <br />
          <span className="bg-gradient-to-r from-[var(--brand)] to-[var(--purple)] bg-clip-text text-transparent">
            {props.title2}
          </span>
        </h2>
        <p className="mt-5 text-[13px] leading-[1.75] text-[var(--text-secondary)]">
          {props.subtitle}
        </p>

        <ul className="mt-9 space-y-4 text-[13px] text-[var(--text-secondary)]">
          {props.bullets.map((b) => (
            <li key={b.title} className="flex items-start gap-2.5">
              <span
                className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md ${toneClass[b.tone]}`}
              >
                <b.Icon className="h-3 w-3" />
              </span>
              <span className="leading-relaxed">
                <b className="text-[var(--text)]">{b.title}</b>
                <span className="text-[var(--text-muted)]"> · </span>
                {b.desc}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {/* Bottom: stats + footer */}
      <div className="relative w-full max-w-[520px]">
        <div className="grid grid-cols-3 gap-3">
          {props.stats.map((s) => (
            <div
              key={s.label}
              className="rounded-lg border border-[var(--border)] bg-[var(--surface-1)]/60 px-3 py-2.5 backdrop-blur-sm"
            >
              <Gauge className="mb-1 h-3.5 w-3.5 text-[var(--brand)]" />
              <div className="text-[15px] font-semibold leading-tight tracking-tight text-[var(--text)]">
                {s.value}
              </div>
              <div className="text-[10px] leading-tight text-[var(--text-muted)]">{s.label}</div>
            </div>
          ))}
        </div>

        <div className="mt-8 text-[11px] text-[var(--text-muted)]">{props.footnote}</div>
      </div>
    </aside>
  );
}