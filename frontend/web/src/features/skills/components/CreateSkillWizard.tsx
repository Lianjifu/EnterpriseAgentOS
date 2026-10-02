import { useEffect, useState } from 'react';
import { BookOpen, Layers, Plus, ShieldCheck } from 'lucide-react';
import { CenterModal } from '@/components/feedback/CenterModal';
import type { RiskLevel, Skill, SkillType, SchemaField } from '../schema';
import { RISK_BADGE, TYPE_META } from './constants';
import { StepIndicator } from './StepIndicator';
import { buildSkillFromDraft, parseSchemaJson } from './skill-io';

interface CreateWizardProps {
  open: boolean;
  onClose: () => void;
  onCreate: (skill: Skill) => void;
  type: SkillType;
  lockType?: boolean;
  embedded?: boolean;
}

export function CreateSkillWizard({ open, onClose, onCreate, type: lockedType, lockType = true, embedded = false }: CreateWizardProps) {
  const [step, setStep] = useState(1);
  const [pickedType, setPickedType] = useState<SkillType>(lockedType);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [owner, setOwner] = useState('张敏');
  const [risk, setRisk] = useState<RiskLevel>('low');
  const [needConfirm, setNeedConfirm] = useState(false);
  const [inputJson, setInputJson] = useState('[{ "name": "input", "type": "string", "required": true, "description": "示例输入" }]');
  const [outputJson, setOutputJson] = useState('[{ "name": "result", "type": "string", "required": true, "description": "示例输出" }]');
  useEffect(() => {
    if (open) {
      setStep(1);
      setPickedType(lockedType);
      setName('');
      setDescription('');
      setOwner('张敏');
      setRisk('low');
      setNeedConfirm(false);
    }
  }, [open, lockedType]);
  const type = lockType ? lockedType : pickedType;
  const canNext1 = name.trim().length > 0;
  const canNext2 = (() => {
    try { JSON.parse(inputJson); JSON.parse(outputJson); return true; } catch { return false; }
  })();
  const handleSubmit = () => {
    const inputSchema: SchemaField[] = parseSchemaJson(inputJson);
    const outputSchema: SchemaField[] = parseSchemaJson(outputJson);
    const skill = buildSkillFromDraft(name.trim(), type, description.trim(), owner, risk);
    skill.inputSchema = inputSchema;
    skill.outputSchema = outputSchema;
    skill.needConfirm = needConfirm || risk !== 'low';
    onCreate(skill);
  };
  const title = type === 'Tool' ? '新建 Tool' : type === 'MCP' ? '新建 MCP' : '新建技能';
  const footer = (
    <>
      {step > 1 && <button type="button" onClick={() => setStep((s) => Math.max(1, s - 1))} className="rounded-xl border border-[var(--border)] px-4 py-2 text-xs font-semibold">上一步</button>}
      {step < 3 && (
        <button type="button" onClick={() => setStep((s) => s + 1)} disabled={(step === 1 && !canNext1) || (step === 2 && !canNext2)} className="rounded-xl bg-[var(--brand)] px-4 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40">
          下一步
        </button>
      )}
      {step === 3 && (
        <button type="button" onClick={handleSubmit} className="rounded-xl bg-[var(--brand)] px-4 py-2 text-xs font-semibold text-white">
          创建技能
        </button>
      )}
    </>
  );
  const stepBody = (
    <>
      {step === 1 && (
        <div className="space-y-4">
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">技能名称</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="例如:客户跟进建议" className="mt-1.5 h-10 w-full rounded-xl border border-[var(--border-strong)] bg-[var(--bg-elevated)] px-3 text-sm outline-none focus:border-[var(--brand)]" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">类型</label>
              <select
                aria-label="类型"
                value={type}
                disabled={lockType}
                onChange={(event) => setPickedType(event.target.value as SkillType)}
                className="mt-1.5 h-10 w-full rounded-xl border border-[var(--border-strong)] bg-[var(--bg-elevated)] px-3 text-sm outline-none disabled:opacity-70"
              >
                {(Object.keys(TYPE_META) as SkillType[]).map((item) => (
                  <option key={item} value={item}>{item} · {TYPE_META[item].label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">负责人</label>
              <input type="text" value={owner} onChange={(e) => setOwner(e.target.value)} className="mt-1.5 h-10 w-full rounded-xl border border-[var(--border-strong)] bg-[var(--bg-elevated)] px-3 text-sm outline-none focus:border-[var(--brand)]" />
            </div>
          </div>
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">描述</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="用一句话说清这个技能的作用" className="mt-1.5 w-full rounded-xl border border-[var(--border-strong)] bg-[var(--bg-elevated)] px-3 py-2 text-sm outline-none focus:border-[var(--brand)]" />
          </div>
        </div>
      )}
      {step === 2 && (
        <div className="space-y-4">
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">输入参数 (JSON 数组)</label>
            <textarea value={inputJson} onChange={(e) => setInputJson(e.target.value)} rows={6} className="mt-1.5 w-full rounded-xl border border-[var(--border-strong)] bg-[var(--bg-elevated)] px-3 py-2 font-mono text-xs leading-6 outline-none focus:border-[var(--brand)]" />
            {!canNext2 && <p className="mt-1 text-[11px] text-rose-600">JSON 格式无效,请检查括号或逗号。</p>}
          </div>
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">输出参数 (JSON 数组)</label>
            <textarea value={outputJson} onChange={(e) => setOutputJson(e.target.value)} rows={6} className="mt-1.5 w-full rounded-xl border border-[var(--border-strong)] bg-[var(--bg-elevated)] px-3 py-2 font-mono text-xs leading-6 outline-none focus:border-[var(--brand)]" />
          </div>
          <p className="text-[11px] text-[var(--text-muted)]">每个字段:name · type (string/number/boolean/object/array) · required · description。</p>
        </div>
      )}
      {step === 3 && (
        <div className="space-y-4">
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">风险等级</label>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {(['low', 'medium', 'high'] as const).map((level) => {
                const active = risk === level;
                return (
                  <button key={level} type="button" onClick={() => setRisk(level)} aria-pressed={active} className={`rounded-xl border p-3 text-left text-xs font-semibold transition ${active ? 'border-[var(--brand)] bg-[var(--brand-light)] text-[var(--brand)]' : 'border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--brand)]'}`}>
                    {RISK_BADGE[level].label}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="flex items-center justify-between rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-4">
            <div>
              <p className="text-xs font-semibold">需要二次确认</p>
              <p className="mt-0.5 text-[11px] text-[var(--text-muted)]">调用前用户需授权。</p>
            </div>
            <button type="button" role="switch" aria-checked={needConfirm} onClick={() => setNeedConfirm(!needConfirm)} className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${needConfirm ? 'bg-[var(--brand)]' : 'bg-[var(--bg-hover)]'}`}>
              <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${needConfirm ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </button>
          </div>
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">创建后</p>
            <p className="mt-2 text-xs text-[var(--text-secondary)]">技能将以 <span className="font-semibold">草稿</span> 状态加入总览,可继续完善输入输出,完成后走发布流程。</p>
          </div>
        </div>
      )}
    </>
  );
  const createSteps = [
    { index: 1, title: '基本信息', description: '名称、类型与负责人', icon: BookOpen },
    { index: 2, title: '输入输出', description: '用 JSON 描述字段', icon: Layers },
    { index: 3, title: '风险权限', description: '风险等级与二次确认', icon: ShieldCheck },
  ] as const;
  const currentStep = createSteps[step - 1];
  if (embedded) {
    return (
      <section className="flex min-h-[480px] flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] lg:flex-row">
        <aside aria-label="创建步骤" className="w-full shrink-0 border-b border-[var(--border)] bg-[var(--bg-elevated)] p-4 lg:w-[260px] lg:border-b-0 lg:border-r">
          <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">工作区</p>
          <ol className="space-y-1">
            {createSteps.map((item) => {
              const active = step === item.index;
              const done = step > item.index;
              const Icon = item.icon;
              return (
                <li key={item.index}>
                  <button
                    type="button"
                    onClick={() => setStep(item.index)}
                    aria-current={active ? 'step' : undefined}
                    className={`flex w-full items-start gap-3 rounded-xl px-3 py-3 text-left transition ${active ? 'bg-[var(--brand-light)]' : 'hover:bg-[var(--bg-hover)]'}`}
                  >
                    <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-full border-2 ${done ? 'border-[var(--brand)] bg-[var(--brand)] text-white' : active ? 'border-[var(--brand)] bg-[var(--surface-1)] text-[var(--brand)]' : 'border-[var(--border)] bg-[var(--surface-1)] text-[var(--text-muted)]'}`}>
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 pt-0.5">
                      <span className={`text-[11px] font-semibold uppercase tracking-wide ${active ? 'text-[var(--brand)]' : 'text-[var(--text-muted)]'}`}>第 {item.index} 步</span>
                      <span className={`mt-0.5 block text-sm font-semibold ${active ? 'text-[var(--text)]' : 'text-[var(--text-secondary)]'}`}>{item.title}</span>
                      <span className="mt-0.5 block text-[11px] leading-4 text-[var(--text-muted)]">{item.description}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        </aside>
        <main className="min-w-0 flex-1 overflow-auto bg-[var(--bg-app)] p-5">
          <div className="mb-5 flex items-center justify-between border-b border-[var(--border)] pb-4">
            <h2 className="text-sm font-semibold">{currentStep?.title}</h2>
            <span className="text-[11px] font-medium tabular-nums text-[var(--text-muted)]">{step} / 3</span>
          </div>
          {stepBody}
          <div className="mt-6 flex flex-wrap justify-end gap-2 border-t border-[var(--border)] pt-4">{footer}</div>
        </main>
      </section>
    );
  }
  return (
    <CenterModal
      open={open}
      onClose={onClose}
      ariaLabel={title}
      panelClassName="max-w-2xl"
      title={<span className="flex items-center gap-2"><Plus className="h-5 w-5 text-[var(--brand)]" />{title}</span>}
      description={step === 1 ? '设置技能的基本信息' : step === 2 ? '用 JSON 描述输入输出字段' : '设置风险等级与可见范围'}
      footer={footer}
    >
      <div className="mt-4 mb-5">
        <StepIndicator current={step} total={3} labels={['基本信息', '输入输出', '风险权限']} />
      </div>
      {stepBody}
    </CenterModal>
  );
}