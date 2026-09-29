/**
 * 新建智能体 — 独立页面 /admin/agents/new
 *
 * 历史上 WizardModal 是 CenterModal 弹窗。改造为页面后:
 *   - 顶部返回按钮回 /admin/agents
 *   - 中部 4 步向导 body(WizardBody)
 *   - 底部提交按钮调 useCreateAgent + 导航到 /admin/agents/:newId
 */
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus } from 'lucide-react';
import { useCreateAgent } from '@/api/admin/agents/useAgents';
import { buildPrompts, toolsFromNames } from '@/mock/admin/agents.fixtures';
import { INITIAL_WIZARD_DRAFT } from './components/constants';
import { WizardBody } from './components/WizardModal';
import type { WizardDraft } from '@/api/admin/agents/schema';

export default function AgentCreatePage() {
  const navigate = useNavigate();
  const createAgent = useCreateAgent();

  const handleSubmit = (draft: WizardDraft) => {
    const today = new Date().toISOString().slice(0, 10);
    createAgent.mutate({
      id: `a-${Date.now()}`,
      name: draft.name,
      description: draft.description,
      category: draft.category,
      owner: draft.owner,
      tags: draft.tags ?? [],
      tone: 'info',
      status: 'draft',
      version: 'v0.1',
      createdAt: today,
      tools: toolsFromNames(draft.defaultSkills),
      visibleScope: [draft.visibleScope],
      dataAccess: '基础数据',
      prompts: buildPrompts(draft.name, draft.category, draft.owner),
      customPrompts: [],
      knowledgeRefs: [],
      memoryPolicy: { enabled: false, retentionDays: 30, scope: 'user', autoSummarize: false },
      flowRefs: [],
    }, {
      onSuccess: (created) => {
        navigate(`/admin/agents/${created.id}`);
      },
    });
  };

  return (
    <div className="mx-auto w-full max-w-[1440px] space-y-6 p-5 pb-16 sm:p-8 xl:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          to="/admin/agents"
          className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium text-[var(--text-muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--brand)]"
        >
          <ArrowLeft className="h-3.5 w-3.5" />返回智能体管理
        </Link>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--brand-light)] px-3 py-1 text-[11px] font-semibold text-[var(--brand)]">
          <Plus className="h-3 w-3" />新建智能体
        </span>
      </div>

      <header className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-5">
        <h1 className="text-lg font-semibold tracking-tight">新建智能体</h1>
        <p className="mt-1 text-xs text-[var(--text-muted)]">
          跟随向导完成 4 个步骤 — 基本信息、模板选择、快速配置、确认创建。创建后将自动进入编辑器继续完善。
        </p>
      </header>

      <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-5">
        <WizardBody
          initialDraft={INITIAL_WIZARD_DRAFT}
          onSubmit={handleSubmit}
        />
      </section>
    </div>
  );
}
