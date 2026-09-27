/**
 * useLogin — Login 鉴权逻辑单一所有者
 *
 * 集中 4 件事:
 *  1. 反向 redirect(已登录用户访问 /login → 跳走)
 *  2. IME guard(中文输入法回车不触发提交)
 *  3. `users/me` 回拉(adaptLogin 把 user 折成空串后,补一次真实用户信息)
 *  4. MFA step-2 骨架(URL `?step=mfa` 或 `_mfa@acme.com` 触发)
 *
 * Toast/i18n 副作用通过 opts.onXxx 回调抛给调用方(LoginPage),
 * 保持 hook 与 UI 文案解耦。
 */
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { useApiMutation, useApiQuery } from '@/services/query';
import { useAuthStore } from '@/stores/authStore';
import type { User } from '@de/web-types';

export interface LoginMutationOutput {
  token: string;
  user: User;
  expiresAt?: string;
}

export type LoginStep = 'credentials' | 'mfa';

export interface UseLoginOpts {
  /** 登录成功、跳转前 */
  onAuthenticated?: (data: LoginMutationOutput) => void;
  /** 检测到 MFA 流程(URL 或邮箱 pattern) */
  onMfaRequired?: () => void;
  /** credentials 步骤空提交 */
  onEmptyCredentials?: () => void;
  /** MFA 步骤 code 格式错 */
  onInvalidMfa?: () => void;
  /** 真实后端错误 */
  onLoginError?: (message?: string) => void;
  /** MFA 暂未实现,占位提示 */
  onMfaSoon?: () => void;
}

const MFA_EMAIL_PATTERN = /_mfa@acme\.com$/i;
const MFA_CODE_PATTERN = /^\d{6}$/;

function defaultRouteForRole(role?: User['role']): string {
  if (role === 'admin') return '/admin/overview';
  if (role === 'auditor') return '/audit-center';
  return '/home';
}

function readBuildVersion(): string {
  return ((import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env
    ?.VITE_BUILD_VERSION) ?? 'dev';
}

export function useLogin(opts: UseLoginOpts = {}) {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const authLogin = useAuthStore((s) => s.login);
  const isAuthed = useAuthStore((s) => s.isAuthed);
  const user = useAuthStore((s) => s.user);

  const initialStep: LoginStep = searchParams.get('step') === 'mfa' ? 'mfa' : 'credentials';

  const [step, setStep] = useState<LoginStep>(initialStep);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mfa, setMfa] = useState('');

  const compositionRef = useRef(false);
  const compositionHandlers = useMemo(
    () => ({
      onCompositionStart: () => {
        compositionRef.current = true;
      },
      onCompositionEnd: () => {
        compositionRef.current = false;
      },
    }),
    [],
  );

  const meQuery = useApiQuery<User | null>(
    ['identity', 'me'],
    '/api/auth/me',
    undefined,
    { enabled: false, retry: false },
  );

  const mut = useApiMutation<LoginMutationOutput, { email: string; password: string }>(
    '/api/auth/login',
    {
      onSuccess: (data) => {
        const looksLikeMfa =
          MFA_EMAIL_PATTERN.test(data?.user?.email ?? email) ||
          searchParams.get('step') === 'mfa';
        if (looksLikeMfa && !data?.user?.id) {
          setStep('mfa');
          opts.onMfaRequired?.();
          return;
        }
        authLogin(data.user, data.token);
        opts.onAuthenticated?.(data);
        const fetched = meQuery.data;
        if (fetched && (fetched.id || fetched.email)) {
          authLogin({ ...data.user, ...fetched }, data.token);
        } else {
          void meQuery
            .refetch()
            .then((me) => {
              if (me.data && (me.data.id || me.data.email)) {
                authLogin({ ...data.user, ...me.data }, data.token);
              }
            })
            .catch(() => {
              /* mock 模式下 users/me 无 handler,静默忽略 */
            });
        }
        const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname;
        navigate(from ?? defaultRouteForRole(data.user.role), { replace: true });
      },
      onError: (err: unknown) => {
        const message =
          err && typeof err === 'object' && 'message' in err
            ? (err as { message?: string }).message
            : undefined;
        opts.onLoginError?.(message);
      },
    },
  );

  useEffect(() => {
    if (!isAuthed) return;
    const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname;
    navigate(from ?? defaultRouteForRole(user?.role), { replace: true });
  }, [isAuthed, navigate, location.state, user?.role]);

  const submit = useCallback(
    (e?: FormEvent) => {
      e?.preventDefault();
      if (compositionRef.current) return;
      if (step === 'credentials') {
        if (!email || !password) {
          opts.onEmptyCredentials?.();
          return;
        }
        mut.mutate({ email, password });
      } else {
        if (!MFA_CODE_PATTERN.test(mfa)) {
          opts.onInvalidMfa?.();
          return;
        }
        opts.onMfaSoon?.();
      }
    },
    [step, email, password, mfa, mut, opts],
  );

  const chooseRole = useCallback((nextEmail: string) => {
    setEmail(nextEmail);
    setPassword('dev-admin-password-change-me');
    setMfa('');
  }, []);

  const goBack = useCallback(() => {
    setStep('credentials');
    setMfa('');
  }, []);

  return {
    step,
    setStep,
    goBack,
    email,
    setEmail,
    password,
    setPassword,
    mfa,
    setMfa,
    compositionHandlers,
    submit,
    isPending: mut.isPending,
    chooseRole,
    buildVersion: readBuildVersion(),
  };
}
