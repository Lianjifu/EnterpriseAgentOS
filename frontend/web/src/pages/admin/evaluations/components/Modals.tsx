import {
  Download, FileCode, FileJson, Play, Plus, Trash2, Upload,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { CenterModal } from '@/components/feedback/CenterModal';
import type { EvalSuite, EvalSuiteType, ExchangeFormat } from '@/api/admin/evaluations/schema';
import { StepIndicator } from './Primitives';
import { EXCHANGE_FORMATS, TYPE_META, uid } from './constants';

interface CreateSuiteWizardProps {
  open: boolean;
  onClose: () => void;
  onCreate: (suite: EvalSuite) => void;
}

export function CreateSuiteWizard({ open, onClose, onCreate }: CreateSuiteWizardProps) {
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [type, setType] = useState<EvalSuiteType>('capability');
  const [target, setTarget] = useState('');
  const [description, setDescription] = useState('');
  const [owner, setOwner] = useState('张敏');
  const [schedule, setSchedule] = useState('每周一 09:00');
  const [criteriaText, setCriteriaText] = useState('意图分类准确率 ≥ 95%\n工具调用成功率 ≥ 90%');
  useEffect(() => {
    if (open) {
      setStep(1);
      setName('');
      setType('capability');
      setTarget('');
      setDescription('');
      setOwner('张敏');
      setSchedule('每周一 09:00');
      setCriteriaText('意图分类准确率 ≥ 95%\n工具调用成功率 ≥ 90%');
    }
  }, [open]);
  const canNext1 = name.trim().length > 0 && target.trim().length > 0;
  const handleSubmit = () => {
    const suite: EvalSuite = {
      id: uid('suite'),
      name: name.trim(),
      description: description.trim() || '新创建的评测套件',
      type,
      owner,
      status: 'queued',
      cases: 0,
      passRate: 0,
      avgScore: 0,
      lastRunAt: '排队中',
      schedule,
      target: target.trim(),
      starred: false,
      tags: [],
      trend: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      casesList: [],
      criteria: criteriaText.split('\n').map((s) => s.trim()).filter(Boolean),
      history: [],
    };
    onCreate(suite);
  };
  return (
    <CenterModal
      open={open}
      onClose={onClose}
      ariaLabel="新建评测套件"
      panelClassName="max-w-2xl"
      title={<span className="flex items-center gap-2"><Plus className="h-5 w-5 text-[var(--brand)]" />新建评测套件</span>}
      description={step === 1 ? '设置套件基本信息与评测对象' : step === 2 ? '设定调度计划与评分标准' : '确认后将以「排队中」状态加入列表'}
      footer={
        <>
          {step > 1 && <button type="button" onClick={() => setStep((s) => Math.max(1, s - 1))} className="rounded-xl border border-[var(--border)] px-4 py-2 text-xs font-semibold">上一步</button>}
          {step < 3 && <button type="button" onClick={() => setStep((s) => s + 1)} disabled={step === 1 && !canNext1} className="rounded-xl bg-[var(--brand)] px-4 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40">下一步</button>}
          {step === 3 && <button type="button" onClick={handleSubmit} className="rounded-xl bg-[var(--brand)] px-4 py-2 text-xs font-semibold text-white">创建套件</button>}
        </>
      }
    >
      <div className="mt-4 mb-5">
        <StepIndicator current={step} total={3} labels={['基本信息', '调度与标准', '确认']} />
      </div>
      {step === 1 && (
        <div className="space-y-4">
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">套件名称</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="例如:客户沟通能力评测" className="mt-1.5 h-10 w-full rounded-xl border border-[var(--border-strong)] bg-[var(--bg-elevated)] px-3 text-sm outline-none focus:border-[var(--brand)]" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">类型</label>
              <select value={type} onChange={(e) => setType(e.target.value as EvalSuiteType)} className="mt-1.5 h-10 w-full rounded-xl border border-[var(--border-strong)] bg-[var(--bg-elevated)] px-3 text-sm outline-none focus:border-[var(--brand)]">
                {(Object.keys(TYPE_META) as EvalSuiteType[]).map((t) => <option key={t} value={t}>{TYPE_META[t].label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">评测对象</label>
              <input type="text" value={target} onChange={(e) => setTarget(e.target.value)} placeholder="例如:客户沟通助手" className="mt-1.5 h-10 w-full rounded-xl border border-[var(--border-strong)] bg-[var(--bg-elevated)] px-3 text-sm outline-none focus:border-[var(--brand)]" />
            </div>
          </div>
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">负责人</label>
            <input type="text" value={owner} onChange={(e) => setOwner(e.target.value)} className="mt-1.5 h-10 w-full rounded-xl border border-[var(--border-strong)] bg-[var(--bg-elevated)] px-3 text-sm outline-none focus:border-[var(--brand)]" />
          </div>
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">描述</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="用一两句话说明套件目标" className="mt-1.5 w-full rounded-xl border border-[var(--border-strong)] bg-[var(--bg-elevated)] px-3 py-2 text-sm outline-none focus:border-[var(--brand)]" />
          </div>
        </div>
      )}
      {step === 2 && (
        <div className="space-y-4">
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">调度计划</label>
            <input type="text" value={schedule} onChange={(e) => setSchedule(e.target.value)} placeholder="例如:每周一 09:00" className="mt-1.5 h-10 w-full rounded-xl border border-[var(--border-strong)] bg-[var(--bg-elevated)] px-3 text-sm outline-none focus:border-[var(--brand)]" />
          </div>
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">评分标准 (每行一条)</label>
            <textarea value={criteriaText} onChange={(e) => setCriteriaText(e.target.value)} rows={6} className="mt-1.5 w-full rounded-xl border border-[var(--border-strong)] bg-[var(--bg-elevated)] px-3 py-2 text-xs leading-6 outline-none focus:border-[var(--brand)]" />
          </div>
        </div>
      )}
      {step === 3 && (
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-5 text-xs">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">确认信息</p>
          <ul className="mt-3 space-y-1">
            <li>· 名称:<span className="font-semibold">{name}</span></li>
            <li>· 类型:{TYPE_META[type].label}</li>
            <li>· 评测对象:<span className="font-semibold">{target}</span></li>
            <li>· 负责人:{owner}</li>
            <li>· 调度:{schedule}</li>
            <li>· 评分标准:{criteriaText.split('\n').filter(Boolean).length} 条</li>
          </ul>
        </div>
      )}
    </CenterModal>
  );
}

export function RunConfirmModal({ open, onClose, onConfirm, suite }: { open: boolean; onClose: () => void; onConfirm: () => void; suite: EvalSuite | null }) {
  if (!suite) return null;
  return (
    <CenterModal
      open={open}
      onClose={onClose}
      ariaLabel="运行评测套件"
      panelClassName="max-w-md"
      title={<span className="flex items-center gap-2"><Play className="h-5 w-5 text-[var(--brand)]" />立即运行:{suite.name}</span>}
      description="确认后将套件加入运行队列,运行期间状态切换为「运行中」。"
      footer={
        <>
          <button type="button" onClick={onClose} className="rounded-xl border border-[var(--border)] px-4 py-2 text-xs font-semibold">取消</button>
          <button type="button" onClick={onConfirm} className="rounded-xl bg-[var(--brand)] px-4 py-2 text-xs font-semibold text-white">确认运行</button>
        </>
      }
    >
      <div className="mt-4 space-y-3 rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-4 text-xs">
        <p>· 类型:{TYPE_META[suite.type].label}</p>
        <p>· 评测对象:{suite.target}</p>
        <p>· 用例数:{suite.casesList.length} 条</p>
        <p>· 上次通过:{suite.status === 'cancelled' || suite.status === 'queued' ? '—' : `${suite.passRate.toFixed(1)}%`}</p>
      </div>
    </CenterModal>
  );
}

export function DeleteSuiteModal({ open, onClose, onConfirm, suite }: { open: boolean; onClose: () => void; onConfirm: () => void; suite: EvalSuite | null }) {
  if (!suite) return null;
  return (
    <CenterModal
      open={open}
      onClose={onClose}
      ariaLabel="删除套件"
      panelClassName="max-w-md"
      title={<span className="flex items-center gap-2"><Trash2 className="h-5 w-5 text-rose-600" />删除套件:{suite.name}</span>}
      description="确认后将删除该套件及其历史运行记录,且无法恢复。"
      footer={
        <>
          <button type="button" onClick={onClose} className="rounded-xl border border-[var(--border)] px-4 py-2 text-xs font-semibold">取消</button>
          <button type="button" onClick={onConfirm} className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white">确认删除</button>
        </>
      }
    >
      <div className="mt-4 space-y-1 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-900 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200">
        <p>· 类型:{TYPE_META[suite.type].label}</p>
        <p>· 评测对象:{suite.target}</p>
        <p>· 历史运行:{suite.history.length} 次</p>
      </div>
    </CenterModal>
  );
}

interface ImportSuiteModalProps {
  open: boolean;
  onClose: () => void;
  onImport: (count: number) => void;
}

export function ImportSuiteModal({ open, onClose, onImport }: ImportSuiteModalProps) {
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
      ariaLabel="导入评测套件"
      panelClassName="max-w-2xl"
      title={<span className="flex items-center gap-2"><Upload className="h-5 w-5 text-[var(--brand)]" />导入评测套件</span>}
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
              {EXCHANGE_FORMATS.map((f) => (
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
            <p className="mt-2 text-[var(--text-muted)]">导入后将以「草稿」状态加入套件列表,可继续完善用例与评分标准。</p>
          </div>
        )}
      </div>
    </CenterModal>
  );
}

interface ExportSuiteModalProps {
  open: boolean;
  onClose: () => void;
  onExport: (format: ExchangeFormat) => void;
  total: number;
  selectedCount: number;
}

export function ExportSuiteModal({ open, onClose, onExport, total, selectedCount }: ExportSuiteModalProps) {
  const [format, setFormat] = useState<ExchangeFormat>('json');
  useEffect(() => { if (open) setFormat('json'); }, [open]);
  return (
    <CenterModal
      open={open}
      onClose={onClose}
      ariaLabel="导出评测套件"
      panelClassName="max-w-md"
      title={<span className="flex items-center gap-2"><Download className="h-5 w-5 text-[var(--brand)]" />导出评测套件</span>}
      description={`将导出${selectedCount > 0 ? `已选的 ${selectedCount} 条` : `全部 ${total} 条`}套件。`}
      footer={
        <>
          <button type="button" onClick={onClose} className="rounded-xl border border-[var(--border)] px-4 py-2 text-xs font-semibold">取消</button>
          <button type="button" onClick={() => { onExport(format); onClose(); }} className="rounded-xl bg-[var(--brand)] px-4 py-2 text-xs font-semibold text-white">开始导出</button>
        </>
      }
    >
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {EXCHANGE_FORMATS.map((f) => (
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