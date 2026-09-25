/**
 * LoginMfaStep — Step 2: 多因素验证(占位骨架)
 */
import { ArrowLeft, RotateCw } from 'lucide-react';
import { Button, Input, toast } from '@de/web-ui';
import type { ComponentProps } from 'react';

interface LoginMfaStepProps {
  mfa: string;
  setMfa: (v: string) => void;
  compositionHandlers: {
    onCompositionStart: () => void;
    onCompositionEnd: () => void;
  };
  submit: (e?: React.FormEvent) => void;
  isPending: boolean;
  goBack: () => void;
  title: string;
  subtitle: string;
  mfaLabel: string;
  mfaPlaceholder: string;
  submitLabel: string;
  submittingLabel: string;
  backLabel: string;
  resendLabel: string;
  soonLabel: string;
}

type InputProps = ComponentProps<typeof Input>;

export function LoginMfaStep(props: LoginMfaStepProps) {
  return (
    <div className="animate-[loginSlideUp_350ms_ease-out]">
      <button
        type="button"
        onClick={props.goBack}
        className="mb-3 inline-flex items-center gap-1 text-[11px] text-[var(--text-muted)]
                   hover:text-[var(--text)]"
      >
        <ArrowLeft className="h-3 w-3" />
        {props.backLabel}
      </button>

      <h1 className="text-[22px] font-semibold tracking-tight text-[var(--text)]">{props.title}</h1>
      <p className="mt-1.5 text-[13px] text-[var(--text-muted)]">{props.subtitle}</p>

      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          props.submit();
        }}
        className="mt-7 space-y-4"
      >
        <div>
          <label className="mb-1.5 block text-[12px] font-medium text-[var(--text-secondary)]">
            {props.mfaLabel}
          </label>
          <Input
            value={props.mfa}
            onChange={(e) => props.setMfa(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder={props.mfaPlaceholder}
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            className="text-center font-mono text-lg tracking-[0.4em]"
            autoFocus
            {...(props.compositionHandlers as InputProps)}
          />
        </div>

        <Button
          type="submit"
          loading={props.isPending}
          size="lg"
          className="login-cta w-full text-[14px] font-semibold"
        >
          {props.isPending ? props.submittingLabel : props.submitLabel}
        </Button>

        <button
          type="button"
          onClick={() => toast.info(props.soonLabel)}
          className="inline-flex w-full items-center justify-center gap-1.5
                     text-[11px] text-[var(--text-muted)] hover:text-[var(--text)]"
        >
          <RotateCw className="h-3 w-3" />
          {props.resendLabel}
        </button>
      </form>
    </div>
  );
}