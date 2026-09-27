import { Bell, LogOut, Palette, ShieldCheck, UserRound } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/entities/auth';
import { useUiStore } from '@/stores/uiStore';

export default function Settings() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const { theme, toggleTheme } = useUiStore();
  const handleLogout = () => { logout(); navigate('/login', { replace: true }); };
  return (
    <div className="mx-auto max-w-4xl space-y-6 p-5 sm:p-8">
      <section><h2 className="text-2xl font-semibold tracking-tight">设置</h2><p className="mt-2 text-sm text-[var(--text-muted)]">管理用户信息、账号安全和企智搭偏好。</p></section>
      <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-6 shadow-[var(--shadow-sm)]"><div className="flex items-center gap-4"><span className="grid h-14 w-14 place-items-center rounded-full bg-[var(--brand-light)] text-lg font-semibold text-[var(--brand)]">{(user?.name || '成').slice(0, 1)}</span><div><h3 className="text-base font-semibold">{user?.name || '平台成员'}</h3><p className="mt-1 text-sm text-[var(--text-muted)]">{user?.email || '当前账户'}</p></div></div><div className="mt-6 grid gap-3 sm:grid-cols-2"><div className="rounded-xl border border-[var(--border)] p-4"><UserRound className="h-5 w-5 text-[var(--brand)]" /><p className="mt-3 text-sm font-medium">用户信息</p><p className="mt-1 text-xs text-[var(--text-muted)]">姓名、邮箱和工作空间身份</p></div><div className="rounded-xl border border-[var(--border)] p-4"><ShieldCheck className="h-5 w-5 text-emerald-600" /><p className="mt-3 text-sm font-medium">账号安全</p><p className="mt-1 text-xs text-[var(--text-muted)]">密码、多因素验证和登录记录</p></div></div></section>
      <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] divide-y divide-[var(--border)]"><button type="button" onClick={toggleTheme} className="flex w-full items-center gap-4 p-5 text-left hover:bg-[var(--bg-hover)]"><Palette className="h-5 w-5 text-[var(--brand)]" /><span className="flex-1"><span className="block text-sm font-medium">外观主题</span><span className="mt-1 block text-xs text-[var(--text-muted)]">当前：{theme === 'light' ? '浅色模式' : '深色模式'}</span></span><span className="text-xs text-[var(--brand)]">切换</span></button><button type="button" className="flex w-full items-center gap-4 p-5 text-left hover:bg-[var(--bg-hover)]"><Bell className="h-5 w-5 text-[var(--brand)]" /><span className="flex-1"><span className="block text-sm font-medium">通知设置</span><span className="mt-1 block text-xs text-[var(--text-muted)]">管理任务、流程和系统通知</span></span><span className="text-xs text-[var(--text-muted)]">即将支持</span></button></section>
      <section className="rounded-2xl border border-red-200 bg-red-50/50 p-5 dark:border-red-900/50 dark:bg-red-950/20"><div className="flex items-center gap-4"><LogOut className="h-5 w-5 text-[var(--danger)]" /><div className="flex-1"><p className="text-sm font-medium">退出当前账号</p><p className="mt-1 text-xs text-[var(--text-muted)]">退出后需要重新登录才能访问工作台。</p></div><button type="button" onClick={handleLogout} className="rounded-lg border border-red-200 bg-white px-3.5 py-2 text-sm font-medium text-[var(--danger)] hover:bg-red-50 dark:border-red-900/60 dark:bg-transparent">退出登录</button></div></section>
    </div>
  );
}
