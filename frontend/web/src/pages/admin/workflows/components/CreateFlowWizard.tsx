/**
 * CreateFlowWizard — 三步新建流程向导(基本信息 → 选模板 → 确认)。
 */
import { ArrowRight, Save } from 'lucide-react';
import { CenterModal } from '@/components/feedback/CenterModal';
import { TEMPLATE_CHOICES, TRIGGER_BADGE, TRIGGERS } from './constants';
import type { TriggerType } from '@/api/admin/workflows/schema';
import { AlertCircle, History, Sparkles, Workflow } from 'lucide-react';

const ICONS: Record<string, typeof Workflow> = { Workflow, AlertCircle, Sparkles, History };

interface CreateFlowWizardProps {
  open: boolean;
  onClose: () => void;
  step: number;
  setStep: (n: number) => void;
  name: string; setName: (s: string) => void;
  desc: string; setDesc: (s: string) => void;
  trigger: TriggerType; setTrigger: (t: TriggerType) => void;
  template: string; setTemplate: (s: string) => void;
  onSubmit: () => void;
}

export function CreateFlowWizard({ open, onClose, step, setStep, name, setName, desc, setDesc, trigger, setTrigger, template, setTemplate, onSubmit }: CreateFlowWizardProps) {
  return (
    <CenterModal
      open={open}
      onClose={onClose}
      ariaLabel="新建流程"
      title={`新建流程 · 第 ${step} / 3 步`}
      description={step === 1 ? '设置流程名称、描述与触发方式' : step === 2 ? '从模板开始或留白' : '确认后进入编辑器'}
      panelClassName="max-w-2xl"
      footer={
        <div className="flex w-full items-center justify-between">
          <button type="button" onClick={() => setStep(Math.max(1, step - 1))} disabled={step === 1} className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-3 py-2 text-xs font-semibold text-[var(--text-secondary)] disabled:cursor-not-allowed disabled:opacity-50 hover:border-[var(--brand)] hover:text-[var(--brand)]">
            <ArrowRight className="h-3.5 w-3.5 rotate-180" />上一步
          </button>
          {step < 3 ? (
            <button type="button" onClick={() => setStep(step + 1)} className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--brand)] px-4 py-2 text-xs font-semibold text-white hover:bg-[var(--brand-hover)]">
              下一步 <ArrowRight className="h-3.5 w-3.5" />
            </button>
          ) : (
            <button type="button" onClick={onSubmit} className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--brand)] px-4 py-2 text-xs font-semibold text-white hover:bg-[var(--brand-hover)]">
              <Save className="h-3.5 w-3.5" />进入编辑器
            </button>
          )}
        </div>
      }
    >
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          {[1, 2, 3].map((n) => (
            <div key={n} className="flex flex-1 items-center gap-2">
              <span className={`grid h-7 w-7 place-items-center rounded-full text-[11px] font-semibold ${n <= step ? 'bg-[var(--brand)] text-white' : 'bg-[var(--bg-elevated)] text-[var(--text-muted)]'}`}>{n}</span>
              <span className={`text-xs font-semibold ${n <= step ? 'text-[var(--text)]' : 'text-[var(--text-muted)]'}`}>{n === 1 ? '基本信息' : n === 2 ? '选模板' : '进入编辑器'}</span>
              {n < 3 && <div className={`h-px flex-1 ${n < step ? 'bg-[var(--brand)]' : 'bg-[var(--border)]'}`} />}
            </div>
          ))}
        </div>
        {step === 1 && (
          <div className="space-y-3">
            <label className="block">
              <span className="text-xs font-semibold text-[var(--text-secondary)]">流程名称</span>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="例如:客户投诉自动分流" className="mt-1 h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-1)] px-3 text-sm outline-none focus:border-[var(--brand)]" />
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-[var(--text-secondary)]">描述</span>
              <textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={3} placeholder="简要说明这个流程解决什么问题" className="mt-1 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-1)] px-3 py-2 text-sm outline-none focus:border-[var(--brand)]" />
            </label>
            <div>
              <span className="text-xs font-semibold text-[var(--text-secondary)]">触发器类型</span>
              <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {TRIGGERS.map((t) => {
                  const Icon = TRIGGER_BADGE[t].icon;
                  return (
                    <button key={t} type="button" onClick={() => setTrigger(t)} aria-pressed={trigger === t} className={`rounded-xl border p-3 text-left transition ${trigger === t ? 'border-[var(--brand)] bg-[var(--brand-light)]' : 'border-[var(--border)] hover:border-[var(--brand)]'}`}>
                      <Icon className="h-4 w-4 text-[var(--brand)]" />
                      <p className="mt-2 text-xs font-semibold">{TRIGGER_BADGE[t].label}</p>
                      <p className="text-[10px] text-[var(--text-muted)]">{t}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
        {step === 2 && (
          <div className="grid grid-cols-2 gap-3">
            {TEMPLATE_CHOICES.map((tpl) => {
              const Icon = ICONS[tpl.icon] ?? Workflow;
              return (
                <button key={tpl.id} type="button" onClick={() => setTemplate(tpl.id)} aria-pressed={template === tpl.id} className={`rounded-2xl border p-4 text-left transition ${template === tpl.id ? 'border-[var(--brand)] bg-[var(--brand-light)]' : 'border-[var(--border)] hover:border-[var(--brand)]'}`}>
                  <span className="grid h-9 w-9 place-items-center rounded-lg bg-[var(--bg-elevated)]"><Icon className="h-4 w-4 text-[var(--brand)]" /></span>
                  <p className="mt-3 text-sm font-semibold">{tpl.name}</p>
                  <p className="mt-1 text-[11px] text-[var(--text-muted)]">{tpl.desc}</p>
                </button>
              );
            })}
          </div>
        )}
        {step === 3 && (
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-5">
            <p className="text-xs text-[var(--text-muted)]">已准备好以下流程</p>
            <p className="mt-2 text-base font-semibold">{name || '未命名流程'}</p>
            <p className="mt-1 text-xs text-[var(--text-muted)]">{desc || '尚未填写描述'}</p>
            <div className="mt-3 flex flex-wrap gap-2 text-[10px]">
              <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 font-semibold ${TRIGGER_BADGE[trigger].className}`}>
                {(() => { const Icon = TRIGGER_BADGE[trigger].icon; return <Icon className="h-3 w-3" />; })()}触发器: {trigger}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-[var(--bg-elevated)] px-2 py-1 font-semibold text-[var(--text-secondary)]">模板: {TEMPLATE_CHOICES.find((t) => t.id === template)?.name}</span>
            </div>
            <p className="mt-3 text-[11px] text-[var(--text-muted)]">点击「进入编辑器」会自动跳转到画布视图,可在画布上继续调整。</p>
          </div>
        )}
      </div>
    </CenterModal>
  );
}