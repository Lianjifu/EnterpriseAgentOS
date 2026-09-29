import { Navigate, Route, Routes } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { ToastHost, Spinner } from '@de/web-ui';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { WorkspaceShell } from '@/widgets/app-shell';
import WorkspacePlaceholder from '@/pages/shared/WorkspacePlaceholder';
import Home from '@/pages/user/home/Home';
import Agents from '@/pages/user/agents';
import Copilot from '@/pages/user/copilot';

const Login = lazy(() => import('./pages/Login'));
const MyKnowledge = lazy(() => import('@/pages/user/knowledge'));
const MyAutomations = lazy(() => import('@/pages/user/automations'));
const MyTeam = lazy(() => import('@/pages/user/team'));
const MySkills = lazy(() => import('@/pages/user/skills'));
const MyTasks = lazy(() => import('@/pages/user/tasks'));
const HelpCenter = lazy(() => import('@/pages/user/help'));
const AccountSettings = lazy(() => import('@/pages/user/account'));
const AdminHelp = lazy(() => import('@/pages/admin/help'));
const AdminSettings = lazy(() => import('@/pages/admin/settings'));
const AdminOverview = lazy(() => import('@/pages/admin/overview'));
const AdminAgents = lazy(() => import('@/pages/admin/agents'));
const AdminAgentDetail = lazy(() => import('@/pages/admin/agents/AgentDetailPage'));
const AdminAgentCreate = lazy(() => import('@/pages/admin/agents/AgentCreatePage'));
const AdminKnowledge = lazy(() => import('@/pages/admin/knowledge'));
const AdminKnowledgeKbDetail = lazy(() => import('@/pages/admin/knowledge/KbDetailPage'));
const AdminKnowledgeDocDetail = lazy(() => import('@/pages/admin/knowledge/DocDetailPage'));
const AdminKnowledgeSourceDetail = lazy(() => import('@/pages/admin/knowledge/SourceDetailPage'));
const AdminKnowledgeKbCreate = lazy(() => import('@/pages/admin/knowledge/KbCreatePage'));
const AdminKnowledgeSourceCreate = lazy(() => import('@/pages/admin/knowledge/SourceCreatePage'));
const AdminMemory = lazy(() => import('@/pages/admin/memory'));
const AdminMemoryPolicyDetail = lazy(() => import('@/pages/admin/memory/PolicyDetailPage'));
const AdminMemoryL1Detail = lazy(() => import('@/pages/admin/memory/L1DetailPage'));
const AdminMemoryL2Detail = lazy(() => import('@/pages/admin/memory/L2DetailPage'));
const AdminMemoryL3Detail = lazy(() => import('@/pages/admin/memory/L3DetailPage'));
const AdminWorkflows = lazy(() => import('@/pages/admin/workflows'));
const AdminWorkflowCreate = lazy(() => import('@/pages/admin/workflows/WorkflowCreatePage'));
const AdminWorkflowDetail = lazy(() => import('@/pages/admin/workflows/WorkflowDetailPage'));
const AdminSkills = lazy(() => import('@/pages/admin/skills'));
const AdminSkillDetail = lazy(() => import('@/pages/admin/skills/SkillDetailPage'));
const AdminEvaluations = lazy(() => import('@/pages/admin/evaluations'));
const AdminEvaluationDetail = lazy(() => import('@/pages/admin/evaluations/EvaluationDetailPage'));
const AdminRegressions = lazy(() => import('@/pages/admin/regressions'));
const AdminRegressionDetail = lazy(() => import('@/pages/admin/regressions/RegressionDetailPage'));
const AdminRegressionCreate = lazy(() => import('@/pages/admin/regressions/RegressionCreatePage'));
const AdminFeedback = lazy(() => import('@/pages/admin/feedback'));
const AdminFeedbackDetail = lazy(() => import('@/pages/admin/feedback/FeedbackDetailPage'));
const AdminFeedbackCreate = lazy(() => import('@/pages/admin/feedback/FeedbackCreatePage'));
const AdminFeedbackRuleCreate = lazy(() => import('@/pages/admin/feedback/FeedbackRuleCreatePage'));
const AdminModels = lazy(() => import('@/pages/admin/models'));
const AdminQuotas = lazy(() => import('@/pages/admin/quotas'));
const AdminNotifications = lazy(() => import('@/pages/admin/notifications'));
const AdminOperations = lazy(() => import('@/pages/admin/operations'));
const AdminToolAudit = lazy(() => import('@/pages/admin/audit'));
const AdminMetrics = lazy(() => import('@/pages/admin/metrics'));

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
            <Route path="/admin/help" element={<AdminHelp />} />
            <Route path="/admin/settings" element={<AdminSettings />} />
            <Route path="/admin/overview" element={<AdminOverview />} />
            <Route path="/admin/agents" element={<AdminAgents />} />
            <Route path="/admin/agents/new" element={<AdminAgentCreate />} />
            <Route path="/admin/agents/:id" element={<AdminAgentDetail />} />
            <Route path="/admin/knowledge" element={<AdminKnowledge />} />
            <Route path="/admin/knowledge/kbs/new" element={<AdminKnowledgeKbCreate />} />
            <Route path="/admin/knowledge/kbs/:id" element={<AdminKnowledgeKbDetail />} />
            <Route path="/admin/knowledge/docs/:id" element={<AdminKnowledgeDocDetail />} />
            <Route path="/admin/knowledge/sources/new" element={<AdminKnowledgeSourceCreate />} />
            <Route path="/admin/knowledge/sources/:id" element={<AdminKnowledgeSourceDetail />} />
            <Route path="/admin/memory" element={<AdminMemory />} />
            <Route path="/admin/memory/policies/:id" element={<AdminMemoryPolicyDetail />} />
            <Route path="/admin/memory/l1/:id" element={<AdminMemoryL1Detail />} />
            <Route path="/admin/memory/l2/:id" element={<AdminMemoryL2Detail />} />
            <Route path="/admin/memory/l3/:id" element={<AdminMemoryL3Detail />} />
            <Route path="/admin/workflows" element={<AdminWorkflows />} />
            <Route path="/admin/workflows/new" element={<AdminWorkflowCreate />} />
            <Route path="/admin/workflows/:id" element={<AdminWorkflowDetail />} />
            <Route path="/admin/tools" element={<AdminSkills />} />
            <Route path="/admin/tools/:id" element={<AdminSkillDetail />} />
            <Route path="/admin/evaluations" element={<AdminEvaluations />} />
            <Route path="/admin/evaluations/:id" element={<AdminEvaluationDetail />} />
            <Route path="/admin/regressions" element={<AdminRegressions />} />
            <Route path="/admin/regressions/new" element={<AdminRegressionCreate />} />
            <Route path="/admin/regressions/:id" element={<AdminRegressionDetail />} />
            <Route path="/admin/feedback" element={<AdminFeedback />} />
            <Route path="/admin/feedback/new" element={<AdminFeedbackCreate />} />
            <Route path="/admin/feedback/rules/new" element={<AdminFeedbackRuleCreate />} />
            <Route path="/admin/feedback/:id" element={<AdminFeedbackDetail />} />
            <Route path="/admin/models" element={<AdminModels />} />
            <Route path="/admin/quotas" element={<AdminQuotas />} />
            <Route path="/admin/notifications" element={<AdminNotifications />} />
            <Route path="/admin/operations" element={<AdminOperations />} />
            <Route path="/admin/tool-audit" element={<AdminToolAudit />} />
            <Route path="/admin/metrics" element={<AdminMetrics />} />
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
