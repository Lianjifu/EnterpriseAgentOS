import { Building2, ChevronDown, ChevronUp, Languages, LogOut, Moon, Settings2, Sparkles, Sun } from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/features/auth';
import { useT } from '@/i18n';
import { useUiStore } from '@/stores/uiStore';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { adminUtilityNavigation, utilityNavigation } from './navigation';

function getInitials(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return 'U';
  return trimmed.charAt(0).toUpperCase();
}

function MenuRow({
  icon,
  label,
  value,
  onClick,
  href,
  danger = false,
  pressed,
  onNavigate,
}: {
  icon: ReactNode;
  label: string;
  value?: string;
  onClick?: () => void;
  href?: string;
  danger?: boolean;
  pressed?: boolean;
  onNavigate?: () => void;
}) {
  const className = `flex w-full items-center gap-2 rounded-lg px-1.5 py-1 text-left text-[13px] leading-5 transition hover:bg-[var(--bg-hover)] ${danger ? 'text-[var(--danger)]' : 'text-[var(--text)]'}`;
  const body = (
    <>
      <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-md bg-[var(--bg-elevated)] ${danger ? 'text-[var(--danger)]' : 'text-[var(--text-secondary)]'}`}>
        {icon}
      </span>
      <span className="min-w-0 flex-1 truncate font-medium">{label}</span>
      {value ? <span className="shrink-0 text-[11px] text-[var(--text-muted)]">{value}</span> : null}
    </>
  );
  if (href) {
    return (
      <NavLink to={href} onClick={onNavigate} className={className} role="menuitem">
        {body}
      </NavLink>
    );
  }
  if (!onClick) {
    return <div className={className}>{body}</div>;
  }
  return (
    <button type="button" onClick={onClick} className={className} role="menuitem" aria-pressed={pressed}>
      {body}
    </button>
  );
}

export function UserFooter({ collapsed, audience = 'user', onNavigate }: { collapsed: boolean; audience?: 'user' | 'admin'; onNavigate: () => void }) {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const workspaceName = useWorkspaceStore((state) => state.current?.name) ?? '默认工作区';
  const { theme, toggleTheme } = useUiStore();
  const { locale, setLocale, t } = useT();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [guideOn, setGuideOn] = useState(() => {
    try { return localStorage.getItem('de-onboarding') === '1'; } catch { return false; }
  });
  const containerRef = useRef<HTMLDivElement | null>(null);
  const utility = audience === 'admin' ? adminUtilityNavigation : utilityNavigation;
  const settings = utility[0];

  useEffect(() => {
    if (!open) return;
    const onDocClick = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const displayName = user?.name ?? user?.email ?? '未登录用户';
  const initials = getInitials(displayName);
  const roleLabel = user?.role === 'admin' ? t('role.admin') : user?.role === 'auditor' ? t('role.auditor') : t('role.user');
  const identity = `${roleLabel} · ${workspaceName}`;
  const themeLabel = theme === 'light' ? t('common.theme.light') : t('common.theme.dark');
  const languageLabel = locale === 'zh-CN' ? t('common.lang.zh') : t('common.lang.en');

  const closeAndLeave = () => {
    setOpen(false);
    onNavigate();
  };

  const toggleLanguage = () => setLocale(locale === 'zh-CN' ? 'en-US' : 'zh-CN');

  const toggleGuide = () => {
    setGuideOn((current) => {
      const next = !current;
      try { localStorage.setItem('de-onboarding', next ? '1' : '0'); } catch { /* 演示状态写不进去时忽略 */ }
      return next;
    });
  };

  const handleLogout = () => {
    logout();
    setOpen(false);
    onNavigate();
    navigate('/login', { replace: true });
  };

  const menu = (
    <div
      role="menu"
      aria-label="用户菜单"
      className={`absolute z-30 w-[15.5rem] rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-1.5 shadow-[var(--shadow-md)] ${
        collapsed ? 'bottom-0 left-[calc(100%+0.5rem)]' : 'bottom-[calc(100%+0.35rem)] left-0'
      }`}
    >
      <div className="flex items-center gap-2 rounded-lg bg-[var(--bg-elevated)] px-2 py-1.5">
        <span aria-hidden="true" className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#f472b6] to-[#8b5cf6] text-xs font-semibold text-white">
          {initials}
        </span>
        <span className="min-w-0">
          <span className="block truncate text-[13px] font-semibold leading-5 text-[var(--text)]">{displayName}</span>
          <span className="block truncate text-[11px] leading-4 text-[var(--text-muted)]">{identity}</span>
        </span>
      </div>

      <p className="mt-2 flex items-center gap-1.5 px-1.5 text-[11px] text-[var(--text-muted)]">
        <span aria-hidden="true" className="h-3 w-0.5 rounded-full bg-[var(--brand)]" />
        {t('account.preferences')}
      </p>

      <div className="mt-0.5">
        {settings ? (
          <MenuRow icon={<Settings2 className="h-3.5 w-3.5" />} label={audience === 'admin' ? t('account.platformSettings') : t('account.userSettings')} href={settings.href} onNavigate={closeAndLeave} />
        ) : null}
        <MenuRow icon={<Building2 className="h-3.5 w-3.5" />} label={t('workspace.manage')} value={workspaceName} />
        <MenuRow icon={<Sparkles className="h-3.5 w-3.5" />} label={t('account.onboarding')} onClick={toggleGuide} pressed={guideOn} />
        <MenuRow icon={<Languages className="h-3.5 w-3.5" />} label={t('account.language')} value={languageLabel} onClick={toggleLanguage} />
      </div>

      <div className="mx-1.5 my-1 border-t border-[var(--border)]" />
      <MenuRow
        icon={theme === 'light' ? <Moon className="h-3.5 w-3.5" /> : <Sun className="h-3.5 w-3.5" />}
        label={t('account.theme')}
        value={themeLabel}
        onClick={toggleTheme}
      />
      <div className="mx-1.5 my-1 border-t border-[var(--border)]" />
      <MenuRow icon={<LogOut className="h-3.5 w-3.5" />} label={t('account.signOut')} danger onClick={handleLogout} />
    </div>
  );

  return (
    <div ref={containerRef} className="relative">
      {open ? menu : null}
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={open ? '收起用户菜单' : `展开用户菜单，${identity}`}
        title={displayName}
        className={`flex w-full items-center gap-2.5 rounded-xl border bg-[var(--surface-1)] px-2.5 py-2 text-left transition hover:bg-[var(--bg-hover)] ${open ? 'border-[var(--brand)]' : 'border-[var(--border)]'} ${collapsed ? 'justify-center' : ''}`}
      >
        <span aria-hidden="true" className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#f472b6] to-[#8b5cf6] text-xs font-semibold text-white">
          {initials}
        </span>
        {!collapsed && (
          <>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium text-[var(--text)]">{displayName}</span>
              <span className="block truncate text-[11px] text-[var(--text-muted)]">{identity}</span>
            </span>
            {open ? <ChevronUp className="h-4 w-4 shrink-0 text-[var(--text-muted)]" aria-hidden="true" /> : <ChevronDown className="h-4 w-4 shrink-0 text-[var(--text-muted)]" aria-hidden="true" />}
          </>
        )}
      </button>
    </div>
  );
}
