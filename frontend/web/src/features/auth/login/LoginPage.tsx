/**
 * LoginPage — 企业级智能体操作系统登录页
 *
 * 现代 SaaS 风格:
 *  - 左:LoginBrandPanel(品牌 + hero + bullets + stats)
 *  - 右:CredentialsForm / MfaStep 二选一
 *  - 背景:渐变 + 3 个浮动模糊球 + 网点纹理 + 顶部品牌色细线
 *
 * 鉴权副作用(IME guard / 反向 redirect / users/me 回拉 / MFA 检测)
 * 全部委托给 useLogin hook;toast/i18n 通过 opts 回调注入本页。
 */
import { ShieldCheck, Sun, Moon, UserRound, Shield, ScrollText, Gauge, Lock, Bot } from 'lucide-react';
import { toast } from '@de/web-ui';
import { useUiStore } from '@/stores/uiStore';
import { useT } from '@/i18n';
import { TrustStrip } from '@/features/auth/TrustStrip';
import { useLogin } from './useLogin';
import { LoginBrandPanel, type LoginHeroBullet, type LoginHeroStat } from './LoginBrandPanel';
import { LoginCredentialsForm } from './LoginCredentialsForm';
import { LoginMfaStep } from './LoginMfaStep';
import type { LoginDemoRole } from './LoginDemoChips';

export default function LoginPage() {
  const { theme, toggleTheme } = useUiStore();
  const { t } = useT();

  const {
    step,
    goBack,
    email,
    setEmail,
    password,
    setPassword,
    mfa,
    setMfa,
    compositionHandlers,
    submit,
    isPending,
    chooseRole,
    buildVersion,
  } = useLogin({
    onAuthenticated: (data) => {
      const name = data.user.name || data.user.email || '';
      toast.success(t('login.welcomeToastPrefix') + name);
    },
    onMfaRequired: () => {
      toast.info(t('login.mfa.requiredHint'));
    },
    onEmptyCredentials: () => {
      toast.warn(t('login.error.empty'));
    },
    onInvalidMfa: () => {
      toast.warn(t('login.mfa.codeLength'));
    },
    onLoginError: (message) => {
      toast.error(message ?? t('login.error.generic'));
    },
    onMfaSoon: () => {
      toast.info(t('login.mfa.soon'));
    },
  });

  const trustItems = [
    { label: t('login.trust.grade'), sub: t('login.trust.gradeSub'), icon: <ShieldCheck className="h-3 w-3" /> },
    { label: t('login.trust.soc'), sub: t('login.trust.socSub'), icon: <Shield className="h-3 w-3" /> },
    { label: t('login.trust.private'), sub: t('login.trust.privateSub'), icon: <Lock className="h-3 w-3" /> },
    { label: t('login.trust.audit'), sub: t('login.trust.auditSub'), icon: <ScrollText className="h-3 w-3" /> },
  ];

  const demoRoles: LoginDemoRole[] = [
    {
      email: 'user@acme.com',
      label: t('login.demoRoleUser'),
      sub: t('login.demoRoleUserSub'),
      Icon: UserRound,
    },
    {
      email: 'admin@acme.com',
      label: t('login.demoRoleAdmin'),
      sub: t('login.demoRoleAdminSub'),
      Icon: Shield,
    },
  ];

  const heroBullets: LoginHeroBullet[] = [
    {
      Icon: ShieldCheck,
      tone: 'brand',
      title: t('login.hero.bullet1Title'),
      desc: t('login.hero.bullet1Desc'),
    },
    {
      Icon: Bot,
      tone: 'purple',
      title: t('login.hero.bullet2Title'),
      desc: t('login.hero.bullet2Desc'),
    },
    {
      Icon: Gauge,
      tone: 'muted',
      title: t('login.hero.bullet3Title'),
      desc: t('login.hero.bullet3Desc'),
    },
  ];

  const heroStats: LoginHeroStat[] = [
    { value: t('login.hero.stat1Value'), label: t('login.hero.stat1Label') },
    { value: t('login.hero.stat2Value'), label: t('login.hero.stat2Label') },
    { value: t('login.hero.stat3Value'), label: t('login.hero.stat3Label') },
  ];

  return (
    <div className="login-page relative min-h-screen w-screen overflow-hidden bg-[var(--bg-elevated)] dark:bg-[var(--bg)]">
      {/* Top brand-color accent line */}
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 z-20 h-[2px] bg-gradient-to-r from-transparent via-[var(--brand)] to-transparent opacity-80"
      />

      {/* Theme toggle (top-right of right panel) */}
      <button
        onClick={toggleTheme}
        aria-label={theme === 'light' ? t('login.theme.lightTip') : t('login.theme.darkTip')}
        title={theme === 'light' ? t('login.theme.lightTip') : t('login.theme.darkTip')}
        className="absolute right-5 top-5 z-30 grid h-9 w-9 place-items-center rounded-md
                   border border-[var(--border)] bg-[var(--surface-1)] text-[var(--text-muted)]
                   hover:bg-[var(--bg-hover)] hover:text-[var(--text)]
                   focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)]/30"
      >
        {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
      </button>

      <div className="grid min-h-screen grid-cols-1 md:grid-cols-[2fr_1fr]">
        {/* ── Left: brand panel ── */}
        <LoginBrandPanel
          product={t('login.brand.product')}
          tagline={t('login.brand.tagline')}
          badge={t('login.hero.badge')}
          buildVersion={buildVersion}
          title1={t('login.hero.title1')}
          title2={t('login.hero.title2')}
          subtitle={t('login.hero.subtitle')}
          bullets={heroBullets}
          stats={heroStats}
          footnote={t('login.hero.footnote')}
        />

        {/* ── Right: form panel ── */}
        <main
          className="login-form relative flex flex-col
                     md:items-center md:justify-center md:bg-transparent
                     px-6 py-6
                     sm:px-10 sm:py-8
                     md:px-8 md:py-8
                     lg:px-10
                     md:border-l md:border-[var(--border)]"
        >
          {/* Subtle radial highlight on right panel */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 hidden md:block
                       bg-[radial-gradient(ellipse_at_top_right,rgba(79,70,229,0.06),transparent_60%)]
                       dark:bg-[radial-gradient(ellipse_at_top_right,rgba(99,102,241,0.08),transparent_60%)]"
          />

          <div className="relative w-full max-w-[440px] m-auto md:m-0">
            {step === 'credentials' ? (
              <LoginCredentialsForm
                email={email}
                setEmail={setEmail}
                password={password}
                setPassword={setPassword}
                mfa={mfa}
                setMfa={setMfa}
                compositionHandlers={compositionHandlers}
                submit={submit}
                isPending={isPending}
                rememberLabel={t('login.rememberMe')}
                forgotLabel={t('login.forgotPassword')}
                emailLabel={t('login.emailLabel')}
                emailPlaceholder={t('login.emailPlaceholder')}
                passwordLabel={t('login.passwordLabel')}
                passwordPlaceholder={t('login.passwordPlaceholder')}
                mfaLabel={t('login.mfaLabel')}
                mfaHint={t('login.mfaHint')}
                mfaPlaceholder={t('login.mfaPlaceholder')}
                submitLabel={t('login.submit')}
                submittingLabel={t('login.submitting')}
                ssoLabel={t('login.sso')}
                ssoTooltip={t('login.sso.tooltip')}
                soonLabel={t('login.mfa.soon')}
                demoTitle={t('login.demoTitle')}
                demoRoles={demoRoles}
                onChooseRole={chooseRole}
                termsPrefix={t('login.termsPrefix')}
                termsTos={t('login.terms.tos')}
                termsPrivacy={t('login.terms.privacy')}
              />
            ) : (
              <LoginMfaStep
                mfa={mfa}
                setMfa={setMfa}
                compositionHandlers={compositionHandlers}
                submit={submit}
                isPending={isPending}
                goBack={goBack}
                title={t('login.mfa.title')}
                subtitle={t('login.mfa.subtitle')}
                mfaLabel={t('login.mfaLabel')}
                mfaPlaceholder={t('login.mfaPlaceholder')}
                submitLabel={t('login.submit')}
                submittingLabel={t('login.submitting')}
                backLabel={t('login.mfa.back')}
                resendLabel={t('login.mfa.resend')}
                soonLabel={t('login.mfa.soon')}
              />
            )}

            {/* TrustStrip — sits directly under the form, no card chrome around either */}
            <div className="mt-8 sm:mt-10">
              <TrustStrip items={trustItems} tone="light" />
            </div>
          </div>
        </main>
      </div>

      {/* Build version chip (bottom-right, subtle) */}
      <div className="absolute bottom-4 right-5 z-10 select-none font-mono text-[10px]
                      tracking-widest text-[var(--text-muted)]">
        {t('login.buildLabel')} {buildVersion}
      </div>
    </div>
  );
}