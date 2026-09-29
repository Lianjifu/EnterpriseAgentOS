/**
 * 4 步新建智能体向导(页面体) — 由 AgentCreatePage 包裹使用。
 *
 * 历史上曾是 CenterModal 弹窗;现已迁到独立页面 /admin/agents/new。
 * step 由父页面受控(垂直 stepper 共享同一 state),本组件只负责渲染
 * 当前 step 的表单 + 上一步/下一步/创建按钮。
 */
import { useState, useEffect } from 'react';
import { CheckCircle2, ChevronLeft, ChevronRight, Info, Plus, Square, CheckSquare } from 'lucide-react';
import type { WizardDraft } from '@/api/admin/agents/schema';
import { SCENES, WIZARD_TEMPLATES, WIZARD_ICONS, WIZARD_MODELS, WIZARD_SKILLS, INITIAL_WIZARD_DRAFT } from './constants';
import { toneClass } from './constants';

export type WizardStep = 1 | 2 | 3 | 4;

export function WizardBody({
  initialDraft,
  onSubmit,
  controlledStep,
  onStepChange,
}: {
  initialDraft?: WizardDraft;
  onSubmit: (draft: WizardDraft) => void;
  controlledStep?: WizardStep;
  onStepChange?: (next: WizardStep) => void;
}) {
  const [internalStep, setInternalStep] = useState<WizardStep>(1);
  const step = controlledStep ?? internalStep;
  const setStep = (next: WizardStep) => {
    if (onStepChange) onStepChange(next);
    if (controlledStep === undefined) setInternalStep(next);
  };
  const [draft, setDraft] = useState<WizardDraft>(initialDraft ?? INITIAL_WIZARD_DRAFT);

  useEffect(() => {
    if (controlledStep !== undefined) setInternalStep(controlledStep);
  }, [controlledStep]);

  const canNext =
    step === 1 ? draft.name.trim().length > 0
      : step === 2 ? true
        : step === 3 ? draft.defaultSkills.length > 0
          : true;
  const isLast = step === 4;

  return (
    <div className="space-y-6">
      {step === 1 && (
        <div className="space-y-4">
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">名称 *</label>
            <input
              type="text"
              value={draft.name}
              onChange={(event) => setDraft((d) => ({ ...d, name: event.target.value }))}
              placeholder="例如:差旅助手"
              className="mt-1.5 h-10 w-full rounded-xl border border-[var(--border-strong)] bg-[var(--bg-elevated)] px-3 text-sm outline-none focus:border-[var(--brand)]"
            />
          </div>
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">描述</label>
            <textarea
              value={draft.description}
              onChange={(event) => setDraft((d) => ({ ...d, description: event.target.value }))}
              rows={3}
              placeholder="一句话说明这个智能体解决什么问题"
              className="mt-1.5 w-full rounded-xl border border-[var(--border-strong)] bg-[var(--bg-elevated)] px-3 py-2 text-sm outline-none focus:border-[var(--brand)]"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">场景分类</label>
              <select
                value={draft.category}
                onChange={(event) => setDraft((d) => ({ ...d, category: event.target.value }))}
                className="mt-1.5 h-10 w-full rounded-xl border border-[var(--border-strong)] bg-[var(--bg-elevated)] px-3 text-sm outline-none focus:border-[var(--brand)]"
              >
                {SCENES.filter((s) => s !== '全部场景').map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">负责人</label>
              <input
                type="text"
                value={draft.owner}
                onChange={(event) => setDraft((d) => ({ ...d, owner: event.target.value }))}
                className="mt-1.5 h-10 w-full rounded-xl border border-[var(--border-strong)] bg-[var(--bg-elevated)] px-3 text-sm outline-none focus:border-[var(--brand)]"
              />
            </div>
          </div>
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">头像图标</label>
            <div className="mt-2 flex flex-wrap gap-2">
              {WIZARD_ICONS.map(({ name, Icon }) => {
                const active = draft.icon === name;
                return (
                  <button
                    key={name}
                    type="button"
                    onClick={() => setDraft((d) => ({ ...d, icon: name }))}
                    aria-pressed={active}
                    className={`grid h-10 w-10 place-items-center rounded-xl border ${active ? 'border-[var(--brand)] bg-[var(--brand-light)] text-[var(--brand)]' : 'border-[var(--border)] bg-[var(--bg-elevated)] text-[var(--text-muted)] hover:border-[var(--brand)] hover:text-[var(--brand)]'}`}
                  >
                    <Icon className="h-5 w-5" />
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-3">
          {WIZARD_TEMPLATES.map((tpl) => {
            const active = draft.template === tpl.id;
            const Icon = tpl.icon;
            return (
              <button
                key={tpl.id}
                type="button"
                onClick={() => setDraft((d) => ({ ...d, template: tpl.id }))}
                aria-pressed={active}
                className={`flex w-full items-start gap-3 rounded-xl border p-4 text-left transition ${active ? 'border-[var(--brand)] bg-[var(--brand-light)]' : 'border-[var(--border)] hover:border-[var(--brand)]'}`}
              >
                <span className={`grid h-10 w-10 place-items-center rounded-lg ${toneClass[tpl.tone]}`}>
                  <Icon className="h-5 w-5" />
                </span>
                <div className="flex-1">
                  <p className="text-sm font-semibold">{tpl.title}</p>
                  <p className="mt-1 text-[11px] text-[var(--text-muted)]">{tpl.description}</p>
                </div>
                <span className={`grid h-5 w-5 place-items-center rounded-full border ${active ? 'border-[var(--brand)] bg-[var(--brand)] text-white' : 'border-[var(--border)]'}`}>
                  {active && <CheckCircle2 className="h-3.5 w-3.5" />}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {step === 3 && (
        <div className="space-y-5">
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">默认模型</label>
            <select
              value={draft.model}
              onChange={(event) => setDraft((d) => ({ ...d, model: event.target.value }))}
              className="mt-1.5 h-10 w-full rounded-xl border border-[var(--border-strong)] bg-[var(--bg-elevated)] px-3 text-sm outline-none focus:border-[var(--brand)]"
            >
              {WIZARD_MODELS.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">默认技能 (至少选 1 个)</label>
            <div className="mt-2 flex flex-wrap gap-2">
              {WIZARD_SKILLS.map((skill) => {
                const active = draft.defaultSkills.includes(skill);
                return (
                  <button
                    key={skill}
                    type="button"
                    onClick={() => setDraft((d) => ({ ...d, defaultSkills: active ? d.defaultSkills.filter((s) => s !== skill) : [...d.defaultSkills, skill] }))}
                    aria-pressed={active}
                    className={`inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-[11px] font-medium transition ${active ? 'border-[var(--brand)] bg-[var(--brand-light)] text-[var(--brand)]' : 'border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--brand)] hover:text-[var(--brand)]'}`}
                  >
                    {active ? <CheckSquare className="h-3 w-3" /> : <Square className="h-3 w-3" />}
                    {skill}
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">可见范围</label>
            <div className="mt-2 flex gap-2">
              {(['公开', '部门', '个人'] as const).map((scope) => {
                const active = draft.visibleScope === scope;
                return (
                  <button
                    key={scope}
                    type="button"
                    onClick={() => setDraft((d) => ({ ...d, visibleScope: scope }))}
                    aria-pressed={active}
                    className={`flex-1 rounded-xl border px-3 py-2 text-xs font-semibold transition ${active ? 'border-[var(--brand)] bg-[var(--brand-light)] text-[var(--brand)]' : 'border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--brand)] hover:text-[var(--brand)]'}`}
                  >
                    {scope}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--brand)]">基本信息</p>
            <dl className="mt-3 grid gap-2 text-xs">
              <div className="flex justify-between"><dt className="text-[var(--text-muted)]">名称</dt><dd className="font-medium">{draft.name || '—'}</dd></div>
              <div className="flex justify-between"><dt className="text-[var(--text-muted)]">场景</dt><dd className="font-medium">{draft.category}</dd></div>
              <div className="flex justify-between"><dt className="text-[var(--text-muted)]">负责人</dt><dd className="font-medium">{draft.owner}</dd></div>
              <div className="flex justify-between"><dt className="text-[var(--text-muted)]">图标</dt><dd className="font-medium">{draft.icon}</dd></div>
              {draft.description && <p className="text-[var(--text-muted)]">{draft.description}</p>}
            </dl>
          </div>
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--brand)]">模板</p>
            <p className="mt-2 text-xs">{WIZARD_TEMPLATES.find((t) => t.id === draft.template)?.title}</p>
          </div>
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--brand)]">快速配置</p>
            <dl className="mt-3 grid gap-2 text-xs">
              <div className="flex justify-between"><dt className="text-[var(--text-muted)]">模型</dt><dd className="font-medium">{draft.model}</dd></div>
              <div><dt className="text-[var(--text-muted)]">技能</dt><dd className="mt-1 flex flex-wrap gap-1">{draft.defaultSkills.length ? draft.defaultSkills.map((s) => <span key={s} className="rounded-full bg-[var(--surface-1)] px-2 py-0.5 text-[10px]">{s}</span>) : <span className="text-[var(--text-muted)]">—</span>}</dd></div>
              <div className="flex justify-between"><dt className="text-[var(--text-muted)]">可见范围</dt><dd className="font-medium">{draft.visibleScope}</dd></div>
            </dl>
          </div>
          <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50/50 p-3 text-[11px] text-amber-700 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200">
            <Info className="mt-0.5 h-3.5 w-3.5" />
            <span>智能体创建后将进入「草稿」状态,你可以在编辑器中继续完善 Prompt、技能、知识、流程等。</span>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--border)] pt-4">
        {step > 1 ? (
          <button type="button" onClick={() => setStep((step - 1) as WizardStep)} className="inline-flex items-center gap-1 rounded-xl border border-[var(--border)] px-4 py-2 text-xs font-semibold text-[var(--text-secondary)] hover:border-[var(--brand)] hover:text-[var(--brand)]">
            <ChevronLeft className="h-3.5 w-3.5" />上一步
          </button>
        ) : (
          <span />
        )}
        {isLast ? (
          <button type="button" onClick={() => onSubmit(draft)} disabled={!canNext} className="inline-flex items-center gap-2 rounded-xl bg-[var(--brand)] px-4 py-2 text-xs font-semibold text-white shadow-[var(--shadow-sm)] hover:bg-[var(--brand-hover)] disabled:cursor-not-allowed disabled:opacity-50">
            <Plus className="h-3.5 w-3.5" />创建并进入编辑器
          </button>
        ) : (
          <button type="button" onClick={() => setStep((step + 1) as WizardStep)} disabled={!canNext} className="inline-flex items-center gap-1 rounded-xl bg-[var(--brand)] px-4 py-2 text-xs font-semibold text-white shadow-[var(--shadow-sm)] hover:bg-[var(--brand-hover)] disabled:cursor-not-allowed disabled:opacity-50">
            下一步<ChevronRight className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
