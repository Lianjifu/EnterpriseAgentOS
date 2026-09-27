import { Menu, Moon, PanelLeftClose, PanelLeftOpen, Sun, X } from 'lucide-react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { BrandLogo } from '@/components/feedback/BrandLogo';
import { useAuthStore } from '@/entities/auth';
import { useUiStore } from '@/stores/uiStore';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { adminNavigationSections, workspaceNavigation, type NavigationItem } from './navigation';
import { UserFooter } from './UserFooter';

function NavigationLink({ item, collapsed, onNavigate }: { item: NavigationItem; collapsed: boolean; onNavigate: () => void }) {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.href}
      onClick={onNavigate}
      title={collapsed ? `${item.label}：${item.description}` : item.description}
      className={({ isActive }) => `group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
        isActive ? 'bg-[var(--brand-light)] font-semibold text-[var(--brand)]' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text)]'
      }`}
    >
      <Icon className="h-[18px] w-[18px] shrink-0" />
      <span className={collapsed ? 'sr-only' : 'truncate'}>{item.label}</span>
    </NavLink>
  );
}

export function WorkspaceShell() {
  const location = useLocation();
  const user = useAuthStore((state) => state.user);
  const workspace = useWorkspaceStore((state) => state.current);
  const { theme, toggleTheme, sidebarCollapsed, toggleSidebar, mobileDrawerOpen, closeMobileDrawer, openMobileDrawer } = useUiStore();
  const isAdmin = user?.role === 'admin';
  const adminItems = adminNavigationSections.flatMap((section) => section.items);
  const currentItem = [...workspaceNavigation, ...adminItems].find((item) => location.pathname.startsWith(item.href));
  const workspaceName = workspace?.name ?? '默认工作空间';
  const isAdminArea = isAdmin && location.pathname.startsWith('/admin');
  const flatNav = isAdminArea ? adminNavigationSections.flatMap((section) => section.items) : workspaceNavigation;

  const sidebar = (
    <aside className={`flex h-full flex-col border-r border-[var(--border)] bg-[var(--surface-1)] px-3 py-4 ${sidebarCollapsed ? 'w-[76px]' : 'w-[248px]'}`}>
      <div className={`flex items-center ${sidebarCollapsed ? 'justify-center' : 'justify-between'} px-2`}>
        <NavLink to="/home" className="flex items-center gap-2.5" aria-label="返回首页">
          {sidebarCollapsed ? (
            <BrandLogo size={36} className="text-[var(--brand)]" ariaLabel="企智搭 · 智能体平台" />
          ) : (
            <BrandLogo size={36} withWordmark className="text-[var(--brand)]" />
          )}
        </NavLink>
        <button type="button" onClick={toggleSidebar} className="hidden rounded-md p-1.5 text-[var(--text-muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--text)] lg:block" aria-label={sidebarCollapsed ? '展开侧栏' : '收起侧栏'} title={sidebarCollapsed ? '展开侧栏' : '收起侧栏'}>
          {sidebarCollapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
        </button>
      </div>
      <nav className="mt-7 flex-1 overflow-y-auto" aria-label="智能体工作台导航">
        {isAdminArea ? (
          <div className="space-y-5">
            {adminNavigationSections.map((section, index) => (
              <div key={section.title} className={`${index === 0 ? '' : 'border-t border-[var(--border)] pt-4'} space-y-1`}>
                {!sidebarCollapsed && (
                  <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">{section.title}</p>
                )}
                {section.items.map((item) => <NavigationLink key={item.href} item={item} collapsed={sidebarCollapsed} onNavigate={closeMobileDrawer} />)}
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-1">
            {workspaceNavigation.map((item) => <NavigationLink key={item.href} item={item} collapsed={sidebarCollapsed} onNavigate={closeMobileDrawer} />)}
          </div>
        )}
      </nav>
      <div className="mt-3 border-t border-[var(--border)] pt-3">
        <UserFooter collapsed={sidebarCollapsed} audience={isAdminArea ? 'admin' : 'user'} onNavigate={closeMobileDrawer} />
      </div>
    </aside>
  );

  return (
    <div className="flex min-h-screen bg-[var(--bg-elevated)] text-[var(--text)]">
      <div className="hidden lg:block">{sidebar}</div>
      {mobileDrawerOpen ? <div className="fixed inset-0 z-40 bg-slate-950/40 lg:hidden" onClick={closeMobileDrawer} aria-hidden="true" /> : null}
      <div className={`fixed inset-y-0 left-0 z-50 transition-transform lg:hidden ${mobileDrawerOpen ? 'translate-x-0' : '-translate-x-full'}`}>{sidebar}</div>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-[var(--border)] bg-[var(--surface-1)] px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <button type="button" className="rounded-md p-2 text-[var(--text-muted)] hover:bg-[var(--bg-hover)] lg:hidden" onClick={openMobileDrawer} aria-label="打开导航菜单"><Menu className="h-5 w-5" /></button>
            <div className="min-w-0">
              <div className="truncate text-xs text-[var(--text-muted)]">企业空间 / {workspaceName}</div>
              <h1 className="truncate text-base font-semibold">{currentItem?.label ?? '首页'}</h1>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <button type="button" onClick={toggleTheme} className="rounded-md p-2 text-[var(--text-muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--text)]" aria-label={theme === 'light' ? '切换深色模式' : '切换浅色模式'} title={theme === 'light' ? '切换深色模式' : '切换浅色模式'}>{theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}</button>
            <button type="button" className="rounded-md p-1 text-[var(--text-muted)] hover:bg-[var(--bg-hover)] lg:hidden" onClick={closeMobileDrawer} aria-label="关闭导航菜单"><X className="h-4 w-4" /></button>
          </div>
        </header>
        <main id="main-content" className="flex-1 overflow-auto"><Outlet /></main>
      </div>
    </div>
  );
}
