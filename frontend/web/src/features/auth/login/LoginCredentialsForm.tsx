/**
 * LoginCredentialsForm — Step 1: 邮箱 / 密码 / MFA(可选) + 演示角色
 */
import { Building2, KeyRound, Sparkles } from 'lucide-react';
import { Button, Input } from '@de/web-ui';
import type { ComponentProps } from 'react';
import { LoginDemoChips, type LoginDemoRole } from './LoginDemoChips';

interface LoginCredentialsFormProps {
  email: string;
  setEmail: (v: string) => void;
  password: string;
  setPassword: (v: string) => void;
  mfa: string;
  setMfa: (v: string) => void;
  compositionHandlers: {
    onCompositionStart: () => void;
    onCompositionEnd: () => void;
  };
  submit: (e?: React.FormEvent) => void;
  isPending: boolean;
  rememberLabel: string;
  forgotLabel: string;
  emailLabel: string;
  emailPlaceholder: string;
  passwordLabel: string;
  passwordPlaceholder: string;
  mfaLabel: string;
  mfaHint: string;
  mfaPlaceholder: string;
  submitLabel: string;
  submittingLabel: string;
  ssoLabel: string;
  ssoTooltip: string;
  soonLabel: string;
  demoTitle: string;
  demoRoles: LoginDemoRole[];
  onChooseRole: (email: string) => void;
  termsPrefix: string;
  termsTos: string;
  termsPrivacy: string;
}

type InputProps = ComponentProps<typeof Input>;

export function LoginCredentialsForm(props: LoginCredentialsFormProps) {
  return (
    <div className="animate-[loginSlideUp_350ms_ease-out]">
      <form noValidate onSubmit={props.submit} className="space-y-4">
        <div>
          <label className="mb-1.5 block text-[12px] font-medium text-[var(--text-secondary)]">
            {props.emailLabel}
          </label>
          <div className="relative">
            <Building2 className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--text-muted)]" />
            <Input
              value={props.email}
              onChange={(e) => props.setEmail(e.target.value)}
              placeholder={props.emailPlaceholder}
              autoComplete="username"
              inputMode="email"
              className="pl-9"
              {...(props.compositionHandlers as InputProps)}
            />
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-[12px] font-medium text-[var(--text-secondary)]">
            {props.passwordLabel}
          </label>
          <div className="relative">
            <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--text-muted)]" />
            <Input
              type="password"
              value={props.password}
              onChange={(e) => props.setPassword(e.target.value)}
              placeholder={props.passwordPlaceholder}
              autoComplete="current-password"
              className="pl-9"
              {...(props.compositionHandlers as InputProps)}
            />
          </div>
        </div>

        <div>
          <label className="mb-1.5 flex items-center justify-between text-[12px] font-medium text-[var(--text-secondary)]">
            <span>{props.mfaLabel}</span>
            <span className="text-[10px] font-normal text-[var(--text-muted)]">{props.mfaHint}</span>
          </label>
          <Input
            value={props.mfa}
            onChange={(e) => props.setMfa(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder={props.mfaPlaceholder}
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            className="font-mono text-center"
            {...(props.compositionHandlers as InputProps)}
          />
        </div>

        <div className="flex items-center justify-between pt-1 text-[12px]">
          <label className="flex cursor-pointer items-center gap-1.5 text-[var(--text-muted)]">
            <input
              type="checkbox"
              defaultChecked
              className="h-3.5 w-3.5 rounded border-[var(--border)] accent-[var(--brand)]"
            />
            {props.rememberLabel}
          </label>
          <a className="text-[var(--brand)] hover:underline" href="#">
            {props.forgotLabel}
          </a>
        </div>

        <Button
          type="submit"
          loading={props.isPending}
          size="lg"
          className="login-cta mt-2 w-full text-[14px] font-semibold"
        >
          {props.isPending ? props.submittingLabel : props.submitLabel}
        </Button>

        <div className="relative my-5 flex items-center text-[10px] uppercase tracking-widest text-[var(--text-muted)]">
          <div className="h-px flex-1 bg-[var(--border)]" />
          <span className="px-3">OR</span>
          <div className="h-px flex-1 bg-[var(--border)]" />
        </div>

        <button
          type="button"
          disabled
          aria-disabled="true"
          title={props.ssoTooltip}
          className="login-sso flex w-full items-center justify-center gap-2 rounded-md
                     border border-[var(--border)] bg-[var(--surface-1)] px-4 py-2.5
                     text-[13px] font-medium text-[var(--text-secondary)]
                     hover:bg-[var(--bg-hover)]
                     disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Sparkles className="h-4 w-4 text-[var(--brand)]" />
          {props.ssoLabel}
          <span className="ml-1 rounded bg-[var(--bg-hover)] px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-[var(--text-muted)]">
            {props.soonLabel}
          </span>
        </button>

        <LoginDemoChips title={props.demoTitle} roles={props.demoRoles} onChoose={props.onChooseRole} />
      </form>

      <div className="mt-6 text-center text-[10px] leading-relaxed text-[var(--text-muted)]">
        {props.termsPrefix}{' '}
        <a className="text-[var(--brand)] hover:underline" href="#">
          {props.termsTos}
        </a>{' '}
        &{' '}
        <a className="text-[var(--brand)] hover:underline" href="#">
          {props.termsPrivacy}
        </a>
      </div>
    </div>
  );
}