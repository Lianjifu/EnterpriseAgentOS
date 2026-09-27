import { ChevronUp, CircleHelp, Settings2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuthStore } from '@/entities/auth';
import { adminUtilityNavigation, utilityNavigation, type NavigationItem } from './navigation';

function getInitials(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return 'U';
  const first = trimmed.charAt(0);
  return first.toUpperCase();
}

function FooterItem({ item, collapsed, onNavigate }: { item: NavigationItem; collapsed: boolean; onNavigate: () => void }) {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.href}
      onClick={onNavigate}
      title={collapsed ? `${item.label}：${item.description}` : item.description}
      className={({ isActive }) => `flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors ${
        isActive ? 'bg-[var(--brand-light)] font-semibold text-[var(--brand)]' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text)]'
      }`}
    >
      <Icon className="h-[16px] w-[16px] shrink-0" />
      <span className={collapsed ? 'sr-only' : 'truncate'}>{item.label}</span>
    </NavLink>
  );
}

export function UserFooter({ collapsed, audience = 'user', onNavigate }: { collapsed: boolean; audience?: 'user' | 'admin'; onNavigate: () => void }) {
  const user = useAuthStore((state) => state.user);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const utility = audience === 'admin' ? adminUtilityNavigation : utilityNavigation;
  const help = utility[0];
  const settings = utility[1];
  const HelpIcon = help?.icon ?? CircleHelp;
  const SettingsIcon = settings?.icon ?? Settings2;

  useEffect(() => {
    if (!open) return;
    const onDocClick = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
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
  const triggerLabel = audience === 'admin' ? '展开用户菜单，查看管理员帮助与平台设置' : '展开用户菜单，查看帮助与设置';

  const handleNavigate = () => {
    setOpen(false);
    onNavigate();
  };

  return (
    <div ref={containerRef} className="relative">
      {open && !collapsed && (
        <div role="menu" aria-label="用户菜单" className="absolute inset-x-0 bottom-[calc(100%+0.5rem)] z-10 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-1.5 shadow-[var(--shadow-md)]">
          {help && <FooterItem item={help} collapsed={false} onNavigate={handleNavigate} />}
          {settings && <FooterItem item={settings} collapsed={false} onNavigate={handleNavigate} />}
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={open ? '收起用户菜单' : triggerLabel}
        title={displayName}
        className={`flex w-full items-center gap-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] px-2.5 py-2 text-left transition hover:border-[var(--brand)] hover:bg-[var(--bg-hover)] ${collapsed ? 'justify-center' : ''}`}
      >
        <span aria-hidden="true" className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[var(--brand-light)] text-xs font-semibold text-[var(--brand)]">
          {initials}
        </span>
        {!collapsed && (
          <>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium text-[var(--text)]">{displayName}</span>
              <span className="block truncate text-[11px] text-[var(--text-muted)]">点击查看{audience === 'admin' ? '管理员帮助与平台设置' : '帮助与设置'}</span>
            </span>
            <ChevronUp className={`h-4 w-4 shrink-0 text-[var(--text-muted)] transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
          </>
        )}
      </button>

      {collapsed && open && (
        <div role="menu" aria-label="用户菜单" className="absolute bottom-[calc(100%+0.5rem)] left-1/2 z-10 w-56 -translate-x-1/2 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-1.5 shadow-[var(--shadow-md)]">
          <a href={help?.href ?? '#'} onClick={handleNavigate} className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text)]">
            <HelpIcon className="h-[16px] w-[16px]" />{help?.label ?? '帮助'}
          </a>
          <a href={settings?.href ?? '#'} onClick={handleNavigate} className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text)]">
            <SettingsIcon className="h-[16px] w-[16px]" />{settings?.label ?? '设置'}
          </a>
        </div>
      )}
    </div>
  );
}