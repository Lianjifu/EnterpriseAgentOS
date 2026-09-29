/**
 * 新建智能体 — 独立页面 /admin/agents/new
 *
 * 顶部返回按钮回 /admin/agents;主区域左 1/3 纵向 stepper,右 2/3 工作区。
 * Stepper 与工作区通过受控 step state 联动,4 步完成调 useCreateAgent
 * 然后导航到新 agent 详情页。
 */
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Bot, BookOpen, FileCheck2, Info, Sparkles, Wand2 } from 'lucide-react';
import { useCreateAgent } from '@/api/admin/agents/useAgents';
import { buildPrompts, toolsFromNames } from '@/mock/admin/agents.fixtures';
import { INITIAL_WIZARD_DRAFT } from './components/constants';
import { WizardBody } from './components/WizardModal';
import type { WizardDraft } from '@/api/admin/agents/schema';

type StepKey = 'basic' | 'template' | 'config' | 'review';
interface StepDef {
  key: StepKey;
  index: 1 | 2 | 3 | 4;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

const STEPS: StepDef[] = [
  { key: 'basic', index: 1, title: '基本信息', description: '命名、归属与外观', icon: Bot },
  { key: 'template', index: 2, title: '模板选择', description: '从预设开始或空白起步', icon: Wand2 },
  { key: 'config', index: 3, title: '快速配置', description: '模型、技能、可见范围', icon: Sparkles },
  { key: 'review', index: 4, title: '确认创建', description: '核对信息后写入工作台', icon: FileCheck2 },
];

export default function AgentCreatePage() {
  const navigate = useNavigate();
  const createAgent = useCreateAgent();
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

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
      <Link
        to="/admin/agents"
        className="inline-flex w-fit items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium text-[var(--text-muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--brand)]"
      >
        <ArrowLeft className="h-3.5 w-3.5" />返回智能体管理
      </Link>

      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--brand)]">智能体工作台</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">新建智能体</h1>
        </div>
        <p className="max-w-sm text-xs leading-5 text-[var(--text-muted)]">
          跟随向导完成 4 个步骤 — 命名、模板、配置与确认。创建后将自动进入编辑器继续完善。
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        {/* 左 1/3 — 纵向 stepper */}
        <aside aria-label="创建步骤" className="lg:sticky lg:top-5 lg:self-start">
          <ol className="relative space-y-1">
            {STEPS.map((s) => {
              const active = step === s.index;
              const done = step > s.index;
              const Icon = s.icon;
              return (
                <li key={s.key} className="relative">
                  <button
                    type="button"
                    onClick={() => setStep(s.index)}
                    aria-current={active ? 'step' : undefined}
                    className={`flex w-full items-start gap-3 rounded-xl px-3 py-3 text-left transition ${
                      active
                        ? 'bg-[var(--brand-light)]'
                        : 'hover:bg-[var(--bg-hover)]'
                    }`}
                  >
                    <span
                      className={`grid h-10 w-10 shrink-0 place-items-center rounded-full border-2 transition ${
                        done
                          ? 'border-[var(--brand)] bg-[var(--brand)] text-white'
                          : active
                            ? 'border-[var(--brand)] bg-[var(--surface-1)] text-[var(--brand)]'
                            : 'border-[var(--border)] bg-[var(--surface-1)] text-[var(--text-muted)]'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1 pt-0.5">
                      <span className="flex items-center gap-1.5">
                        <span className={`text-[11px] font-semibold uppercase tracking-wide ${active ? 'text-[var(--brand)]' : 'text-[var(--text-muted)]'}`}>
                          第 {s.index} 步
                        </span>
                      </span>
                      <span className={`mt-0.5 block text-sm font-semibold ${active ? 'text-[var(--text)]' : 'text-[var(--text-secondary)]'}`}>
                        {s.title}
                      </span>
                      <span className="mt-0.5 block text-[11px] leading-4 text-[var(--text-muted)]">
                        {s.description}
                      </span>
                    </span>
                    {active && <ArrowRight className="mt-3 h-3.5 w-3.5 shrink-0 text-[var(--brand)]" />}
                  </button>
                </li>
              );
            })}
          </ol>

          <div className="mt-2 flex items-start gap-2 rounded-xl border border-dashed border-[var(--border)] p-3 text-[11px] leading-4 text-[var(--text-muted)]">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--brand)]" />
            <span>
              草稿状态可随时修改,所有面板(技能/知识/记忆/流程等)可在编辑器中继续完善。
            </span>
          </div>
        </aside>

        {/* 右 2/3 — 工作区 */}
        <section
          aria-labelledby="create-step-title"
          className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-5 sm:p-6"
        >
          <div className="mb-5 flex items-center justify-between border-b border-[var(--border)] pb-4">
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-[var(--brand)]" />
              <h2 id="create-step-title" className="text-sm font-semibold">
                {STEPS.find((s) => s.index === step)?.title}
              </h2>
            </div>
            <span className="text-[11px] font-medium tabular-nums text-[var(--text-muted)]">
              {step} / 4
            </span>
          </div>

          <WizardBody
            initialDraft={INITIAL_WIZARD_DRAFT}
            onSubmit={handleSubmit}
            controlledStep={step}
            onStepChange={setStep}
          />
        </section>
      </div>
    </div>
  );
}
