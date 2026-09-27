import { Navigate, Route, Routes } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { ToastHost, Spinner } from '@de/web-ui';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { WorkspaceShell } from '@/widgets/app-shell';
import WorkspacePlaceholder from '@/pages/WorkspacePlaceholder';
import Home from '@/pages/Home';
import Agents from '@/pages/Agents';
import Copilot from '@/pages/Copilot';

const Login = lazy(() => import('./pages/Login'));
const MyKnowledge = lazy(() => import('@/pages/MyKnowledge'));
const MyAutomations = lazy(() => import('@/pages/MyAutomations'));
const MyTeam = lazy(() => import('@/pages/MyTeam'));
const MySkills = lazy(() => import('@/pages/MySkills'));
const MyTasks = lazy(() => import('@/pages/MyTasks'));
const HelpCenter = lazy(() => import('@/pages/HelpCenter'));
const AccountSettings = lazy(() => import('@/pages/AccountSettings'));
const AdminOverview = lazy(() => import('@/pages/AdminOverview'));
const AdminAgents = lazy(() => import('@/pages/AdminAgents'));

function PageFallback() {
  return (
    <div className="flex h-full items-center justify-center" role="status" aria-live="polite">
      <Spinner size={28} className="text-[var(--brand)]" />
    </div>
  );
}

function RebuildPlaceholder() {
  return (
    <main id="main-content" className="grid min-h-screen place-items-center bg-[var(--bg-elevated)] p-6 text-center">
      <div>
        <p className="text-sm font-medium text-[var(--brand)]">DaAgent</p>
        <h1 className="mt-3 text-2xl font-semibold text-[var(--text)]">智能体工作台正在重建</h1>
        <p className="mt-2 text-sm text-[var(--text-muted)]">登录能力已就绪，新工作台即将开放。</p>
      </div>
    </main>
  );
}

function NotFound() {
  return (
    <main id="main-content" className="grid min-h-screen place-items-center bg-[var(--bg-elevated)] p-6 text-center">
      <div>
        <h1 className="text-2xl font-semibold text-[var(--text)]">页面不存在</h1>
        <p className="mt-2 text-sm text-[var(--text-muted)]">请返回登录页继续。</p>
        <a className="mt-5 inline-block text-sm text-[var(--brand)] hover:underline" href="/login">返回登录</a>
      </div>
    </main>
  );
}

export default function App() {
  return (
    <ErrorBoundary fallbackTitle="应用遇到问题">
      <a href="#main-content" className="skip-link">跳转到主内容</a>
      <Suspense fallback={<PageFallback />}>
        <Routes>
          <Route path="/login" element={<ErrorBoundary><Login /></ErrorBoundary>} />
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route element={<WorkspaceShell />}>
            <Route path="/home" element={<Home />} />
            <Route path="/agents" element={<Agents />} />
            <Route path="/agents/new" element={<Navigate to="/agents" replace />} />
            <Route path="/agents/templates" element={<Navigate to="/agents" replace />} />
            <Route path="/agents/mine" element={<Navigate to="/agents" replace />} />
            <Route path="/team/agents" element={<Agents />} />
            <Route path="/copilot/*" element={<Copilot />} />
            <Route path="/tasks/*" element={<MyTasks />} />
            <Route path="/knowledge/*" element={<MyKnowledge />} />
            <Route path="/skills/*" element={<MySkills />} />
            <Route path="/automations/*" element={<MyAutomations />} />
            <Route path="/team/*" element={<MyTeam />} />
            <Route path="/insights" element={<Navigate to="/home" replace />} />
            <Route path="/account" element={<AccountSettings />} />
            <Route path="/help" element={<HelpCenter />} />
            <Route path="/admin/help" element={<HelpCenter audience="admin" />} />
            <Route path="/admin/settings" element={<AccountSettings audience="admin" />} />
            <Route path="/admin/overview" element={<AdminOverview />} />
            <Route path="/admin/agents" element={<AdminAgents />} />
            <Route path="/admin/*" element={<WorkspacePlaceholder />} />
          </Route>
          <Route path="/app" element={<RebuildPlaceholder />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
      <ToastHost />
    </ErrorBoundary>
  );
}
