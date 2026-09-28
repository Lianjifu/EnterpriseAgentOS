/**
 * AdminFeedback — 弹窗合集。
 * CreateTicketModal (3-step) / CreateRuleModal (单页) /
 * ImportFeedbackModal (2-step) / ExportFeedbackModal / DeleteFeedbackModal。
 */
import { Download, FileCode, FileJson, Plus, Trash2, Upload, Workflow } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { CenterModal } from '@/components/feedback/CenterModal';
import type { ExchangeFormat, Feedback, FeedbackPriority, FeedbackSentiment, RoutingAction, RoutingRule, Ticket } from '@/api/admin/feedback/schema';
import { PRIORITY_BADGE, ROUTING_ACTION_LABEL, SENTIMENT_META, uid } from './constants';
import { StepIndicator } from './Primitives';

interface CreateTicketModalProps {
  open: boolean;
  onClose: () => void;
  onCreate: (ticket: Ticket) => void;
}

export function CreateTicketModal({ open, onClose, onCreate }: CreateTicketModalProps) {
  const [step, setStep] = useState(1);
  const [title, setTitle] = useState('');
  const [topic, setTopic] = useState('');
  const [priority, setPriority] = useState<FeedbackPriority>('medium');
  const [owner, setOwner] = useState('张敏');
  const [description, setDescription] = useState('');
  const [dueAt, setDueAt] = useState('本周内');
  useEffect(() => {
    if (open) {
      setStep(1);
      setTitle('');
      setTopic('');
      setPriority('medium');
      setOwner('张敏');
      setDescription('');
      setDueAt('本周内');
    }
  }, [open]);
  const canNext = title.trim().length > 0 && topic.trim().length > 0;
  const handleSubmit = () => {
    const ticket: Ticket = {
      id: uid('tk'),
      title: title.trim(),
      feedbackIds: [],
      owner,
      priority,
      status: 'triaged',
      topic: topic.trim(),
      description: description.trim() || '由管理员手动创建',
      createdAt: '今天',
      dueAt,
    };
    onCreate(ticket);
  };
  return (
    <CenterModal
      open={open}
      onClose={onClose}
      ariaLabel="新建工单"
      panelClassName="max-w-2xl"
      title={<span className="flex items-center gap-2"><Plus className="h-5 w-5 text-[var(--brand)]" />新建工单</span>}
      description={step === 1 ? '工单基本信息' : step === 2 ? '处理人与时限' : '确认创建'}
      footer={
        <>
          {step > 1 && <button type="button" onClick={() => setStep((s) => Math.max(1, s - 1))} className="rounded-xl border border-[var(--border)] px-4 py-2 text-xs font-semibold">上一步</button>}
          {step < 3 && <button type="button" onClick={() => setStep((s) => s + 1)} disabled={step === 1 && !canNext} className="rounded-xl bg-[var(--brand)] px-4 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40">下一步</button>}
          {step === 3 && <button type="button" onClick={handleSubmit} className="rounded-xl bg-[var(--brand)] px-4 py-2 text-xs font-semibold text-white">创建工单</button>}
        </>
      }
    >
      <div className="mt-4 mb-5"><StepIndicator current={step} total={3} labels={['基本信息', '处理人与时限', '确认']} /></div>
      {step === 1 && (
        <div className="space-y-4">
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">工单标题</label>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="例如:PII 越权反馈" className="mt-1.5 h-10 w-full rounded-xl border border-[var(--border-strong)] bg-[var(--bg-elevated)] px-3 text-sm outline-none focus:border-[var(--brand)]" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">主题</label>
              <input type="text" value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="例如:PII 越权" className="mt-1.5 h-10 w-full rounded-xl border border-[var(--border-strong)] bg-[var(--bg-elevated)] px-3 text-sm outline-none focus:border-[var(--brand)]" />
            </div>
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">优先级</label>
              <select value={priority} onChange={(e) => setPriority(e.target.value as FeedbackPriority)} className="mt-1.5 h-10 w-full rounded-xl border border-[var(--border-strong)] bg-[var(--bg-elevated)] px-3 text-sm outline-none focus:border-[var(--brand)]">
                {(Object.keys(PRIORITY_BADGE) as FeedbackPriority[]).map((p) => <option key={p} value={p}>{PRIORITY_BADGE[p].label}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">描述</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="mt-1.5 w-full rounded-xl border border-[var(--border-strong)] bg-[var(--bg-elevated)] px-3 py-2 text-sm outline-none focus:border-[var(--brand)]" />
          </div>
        </div>
      )}
      {step === 2 && (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">处理人</label>
              <input type="text" value={owner} onChange={(e) => setOwner(e.target.value)} className="mt-1.5 h-10 w-full rounded-xl border border-[var(--border-strong)] bg-[var(--bg-elevated)] px-3 text-sm outline-none focus:border-[var(--brand)]" />
            </div>
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">截止时间</label>
              <input type="text" value={dueAt} onChange={(e) => setDueAt(e.target.value)} placeholder="例如:本周内 / 今天 18:00" className="mt-1.5 h-10 w-full rounded-xl border border-[var(--border-strong)] bg-[var(--bg-elevated)] px-3 text-sm outline-none focus:border-[var(--brand)]" />
            </div>
          </div>
        </div>
      )}
      {step === 3 && (
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-5 text-xs">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">确认信息</p>
          <ul className="mt-3 space-y-1">
            <li>· 标题:<span className="font-semibold">{title}</span></li>
            <li>· 主题:{topic}</li>
            <li>· 优先级:{PRIORITY_BADGE[priority].label}</li>
            <li>· 处理人:{owner}</li>
            <li>· 截止:{dueAt}</li>
          </ul>
        </div>
      )}
    </CenterModal>
  );
}

interface CreateRuleModalProps {
  open: boolean;
  onClose: () => void;
  onCreate: (rule: RoutingRule) => void;
}

export function CreateRuleModal({ open, onClose, onCreate }: CreateRuleModalProps) {
  const [name, setName] = useState('');
  const [topic, setTopic] = useState('');
  const [sentiment, setSentiment] = useState<FeedbackSentiment | 'all'>('all');
  const [action, setAction] = useState<RoutingAction>('create-ticket');
  const [target, setTarget] = useState('内容团队');
  const [description, setDescription] = useState('');
  useEffect(() => {
    if (open) {
      setName('');
      setTopic('');
      setSentiment('all');
      setAction('create-ticket');
      setTarget('内容团队');
      setDescription('');
    }
  }, [open]);
  const canSubmit = name.trim().length > 0 && topic.trim().length > 0;
  const handleSubmit = () => {
    onCreate({
      id: uid('rl'),
      name: name.trim(),
      matchTopic: topic.trim(),
      matchSentiment: sentiment,
      action,
      target: target.trim(),
      enabled: true,
      description: description.trim() || '管理员手动创建',
    });
  };
  return (
    <CenterModal
      open={open}
      onClose={onClose}
      ariaLabel="新建规则模板"
      panelClassName="max-w-2xl"
      title={<span className="flex items-center gap-2"><Workflow className="h-5 w-5 text-[var(--brand)]" />新建规则模板</span>}
      description="设置主题、情感、动作与目标团队"
      footer={
        <>
          <button type="button" onClick={onClose} className="rounded-xl border border-[var(--border)] px-4 py-2 text-xs font-semibold">取消</button>
          <button type="button" onClick={handleSubmit} disabled={!canSubmit} className="rounded-xl bg-[var(--brand)] px-4 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40">创建规则</button>
        </>
      }
    >
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">规则名称</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="例如:PII 越权自动派单" className="mt-1.5 h-10 w-full rounded-xl border border-[var(--border-strong)] bg-[var(--bg-elevated)] px-3 text-sm outline-none focus:border-[var(--brand)]" />
        </div>
        <div>
          <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">匹配主题</label>
          <input type="text" value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="例如:PII 越权" className="mt-1.5 h-10 w-full rounded-xl border border-[var(--border-strong)] bg-[var(--bg-elevated)] px-3 text-sm outline-none focus:border-[var(--brand)]" />
        </div>
        <div>
          <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">情感</label>
          <select value={sentiment} onChange={(e) => setSentiment(e.target.value as FeedbackSentiment | 'all')} className="mt-1.5 h-10 w-full rounded-xl border border-[var(--border-strong)] bg-[var(--bg-elevated)] px-3 text-sm outline-none focus:border-[var(--brand)]">
            <option value="all">全部</option>
            <option value="positive">正面</option>
            <option value="neutral">中性</option>
            <option value="negative">负面</option>
          </select>
        </div>
        <div>
          <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">动作</label>
          <select value={action} onChange={(e) => setAction(e.target.value as RoutingAction)} className="mt-1.5 h-10 w-full rounded-xl border border-[var(--border-strong)] bg-[var(--bg-elevated)] px-3 text-sm outline-none focus:border-[var(--brand)]">
            {(Object.keys(ROUTING_ACTION_LABEL) as RoutingAction[]).map((a) => <option key={a} value={a}>{ROUTING_ACTION_LABEL[a]}</option>)}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">目标团队</label>
          <input type="text" value={target} onChange={(e) => setTarget(e.target.value)} className="mt-1.5 h-10 w-full rounded-xl border border-[var(--border-strong)] bg-[var(--bg-elevated)] px-3 text-sm outline-none focus:border-[var(--brand)]" />
        </div>
        <div className="sm:col-span-2">
          <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">说明</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="mt-1.5 w-full rounded-xl border border-[var(--border-strong)] bg-[var(--bg-elevated)] px-3 py-2 text-sm outline-none focus:border-[var(--brand)]" />
        </div>
      </div>
    </CenterModal>
  );
}

interface ImportFeedbackModalProps {
  open: boolean;
  onClose: () => void;
  onImport: (count: number) => void;
}

export function ImportFeedbackModal({ open, onClose, onImport }: ImportFeedbackModalProps) {
  const [step, setStep] = useState(1);
  const [format, setFormat] = useState<ExchangeFormat>('json');
  const [text, setText] = useState('');
  const [fileName, setFileName] = useState('');
  const [parsedCount, setParsedCount] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { if (open) { setStep(1); setFormat('json'); setText(''); setFileName(''); setParsedCount(0); } }, [open]);
  const handleFile = async (file: File) => {
    setFileName(file.name);
    const ext = file.name.split('.').pop()?.toLowerCase();
    setFormat(ext === 'yaml' || ext === 'yml' ? 'yaml' : 'json');
    setText(await file.text());
  };
  const handlePreview = () => {
    if (format === 'json') {
      try {
        const arr = JSON.parse(text);
        setParsedCount(Array.isArray(arr) ? arr.length : 1);
      } catch { setParsedCount(0); }
    } else {
      setParsedCount(text.split(/\n-\s/).filter((s) => s.trim().length > 0).length);
    }
    setStep(2);
  };
  return (
    <CenterModal
      open={open}
      onClose={onClose}
      ariaLabel="导入反馈"
      panelClassName="max-w-2xl"
      title={<span className="flex items-center gap-2"><Upload className="h-5 w-5 text-[var(--brand)]" />导入反馈</span>}
      description={step === 1 ? '选择 JSON / YAML 文件' : '确认条目并导入'}
      footer={
        <>
          {step > 1 && <button type="button" onClick={() => setStep(1)} className="rounded-xl border border-[var(--border)] px-4 py-2 text-xs font-semibold">上一步</button>}
          {step === 1 && <button type="button" onClick={handlePreview} disabled={text.trim().length === 0} className="rounded-xl bg-[var(--brand)] px-4 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40">预览解析</button>}
          {step === 2 && <button type="button" onClick={() => { onImport(parsedCount); onClose(); }} disabled={parsedCount === 0} className="rounded-xl bg-[var(--brand)] px-4 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40">导入 {parsedCount} 条</button>}
        </>
      }
    >
      <div className="mt-4 space-y-4">
        <StepIndicator current={step} total={2} labels={['选择文件', '预览确认']} />
        {step === 1 && (
          <>
            <div className="flex flex-wrap gap-2">
              {(['json', 'yaml'] as const).map((f) => (
                <button key={f} type="button" onClick={() => setFormat(f)} aria-pressed={format === f} className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition ${format === f ? 'border-[var(--brand)] bg-[var(--brand-light)] text-[var(--brand)]' : 'border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--brand)]'}`}>
                  {f === 'json' ? <FileJson className="h-3.5 w-3.5" /> : <FileCode className="h-3.5 w-3.5" />}{f.toUpperCase()}
                </button>
              ))}
            </div>
            <div className="rounded-2xl border-2 border-dashed border-[var(--border)] p-6 text-center" onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) handleFile(f); }}>
              <Upload className="mx-auto h-6 w-6 text-[var(--text-muted)]" />
              <p className="mt-3 text-xs font-semibold">将文件拖到此处,或点击下方按钮选择</p>
              <p className="mt-1 text-[11px] text-[var(--text-muted)]">支持 .json / .yaml / .yml</p>
              <input ref={inputRef} type="file" accept=".json,.yaml,.yml" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
              <button type="button" onClick={() => inputRef.current?.click()} className="mt-4 inline-flex items-center gap-1.5 rounded-xl border border-[var(--brand)] bg-[var(--brand-light)] px-3 py-2 text-xs font-semibold text-[var(--brand)]">选择文件</button>
              {fileName && <p className="mt-3 text-[11px] text-[var(--text-muted)]">已选择:{fileName}</p>}
            </div>
            <details className="rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] p-3">
              <summary className="cursor-pointer text-[11px] font-semibold text-[var(--text-muted)]">或粘贴文件内容</summary>
              <textarea value={text} onChange={(e) => setText(e.target.value)} rows={6} className="mt-2 w-full rounded-lg border border-[var(--border-strong)] bg-[var(--surface-1)] px-3 py-2 font-mono text-[11px] leading-6 outline-none focus:border-[var(--brand)]" />
            </details>
          </>
        )}
        {step === 2 && (
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-4 text-xs">
            <p className="font-semibold">解析结果 · 共 {parsedCount} 条</p>
            <p className="mt-2 text-[var(--text-muted)]">导入后将以「新反馈」状态加入列表,等待分诊。</p>
          </div>
        )}
      </div>
    </CenterModal>
  );
}

interface ExportFeedbackModalProps {
  open: boolean;
  onClose: () => void;
  onExport: (format: ExchangeFormat) => void;
  total: number;
  selectedCount: number;
}

export function ExportFeedbackModal({ open, onClose, onExport, total, selectedCount }: ExportFeedbackModalProps) {
  const [format, setFormat] = useState<ExchangeFormat>('json');
  useEffect(() => { if (open) setFormat('json'); }, [open]);
  return (
    <CenterModal
      open={open}
      onClose={onClose}
      ariaLabel="导出反馈"
      panelClassName="max-w-md"
      title={<span className="flex items-center gap-2"><Download className="h-5 w-5 text-[var(--brand)]" />导出反馈</span>}
      description={`将导出${selectedCount > 0 ? `已选的 ${selectedCount} 条` : `全部 ${total} 条`}反馈。`}
      footer={
        <>
          <button type="button" onClick={onClose} className="rounded-xl border border-[var(--border)] px-4 py-2 text-xs font-semibold">取消</button>
          <button type="button" onClick={() => { onExport(format); onClose(); }} className="rounded-xl bg-[var(--brand)] px-4 py-2 text-xs font-semibold text-white">开始导出</button>
        </>
      }
    >
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {(['json', 'yaml'] as const).map((f) => (
          <button key={f} type="button" onClick={() => setFormat(f)} aria-pressed={format === f} className={`flex items-start gap-3 rounded-xl border p-3 text-left transition ${format === f ? 'border-[var(--brand)] bg-[var(--brand-light)]/40' : 'border-[var(--border)] hover:border-[var(--brand)]'}`}>
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-[var(--bg-elevated)]">{f === 'json' ? <FileJson className="h-4 w-4 text-[var(--brand)]" /> : <FileCode className="h-4 w-4 text-[var(--brand)]" />}</span>
            <div>
              <p className="text-xs font-semibold">{f.toUpperCase()}</p>
              <p className="mt-0.5 text-[11px] text-[var(--text-muted)]">{f === 'json' ? '结构化数组' : '缩进式清单'}</p>
            </div>
          </button>
        ))}
      </div>
    </CenterModal>
  );
}

interface DeleteFeedbackModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  fb: Feedback | null;
}

export function DeleteFeedbackModal({ open, onClose, onConfirm, fb }: DeleteFeedbackModalProps) {
  if (!fb) return null;
  return (
    <CenterModal
      open={open}
      onClose={onClose}
      ariaLabel="删除反馈"
      panelClassName="max-w-md"
      title={<span className="flex items-center gap-2"><Trash2 className="h-5 w-5 text-rose-600" />删除反馈:{fb.id}</span>}
      description="确认后将删除该反馈记录,且无法恢复。"
      footer={
        <>
          <button type="button" onClick={onClose} className="rounded-xl border border-[var(--border)] px-4 py-2 text-xs font-semibold">取消</button>
          <button type="button" onClick={onConfirm} className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white">确认删除</button>
        </>
      }
    >
      <div className="mt-4 space-y-1 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-900 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200">
        <p>· 用户:{fb.user}</p>
        <p>· 主题:{fb.topic}</p>
        <p>· 情感:{SENTIMENT_META[fb.sentiment].label}</p>
      </div>
    </CenterModal>
  );
}