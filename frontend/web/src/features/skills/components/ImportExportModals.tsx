import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, CircleAlert, Download, Upload } from 'lucide-react';
import { CenterModal } from '@/components/feedback/CenterModal';
import type { Skill, SkillExportField, SkillExportFormat } from '../schema';
import { DEFAULT_EXCHANGE_FIELDS, EXCHANGE_FIELDS, EXCHANGE_FORMATS } from './constants';
import { StepIndicator } from './StepIndicator';
import { parseImportRows, ImportRow } from './skill-io';

interface ImportModalProps {
  open: boolean;
  onClose: () => void;
  onImport: (rows: ImportRow[]) => void;
  existing: Skill[];
}

export function ImportSkillModal({ open, onClose, onImport, existing }: ImportModalProps) {
  const [step, setStep] = useState(1);
  const [format, setFormat] = useState<SkillExportFormat>('json');
  const [text, setText] = useState('');
  const [fileName, setFileName] = useState('');
  const [rows, setRows] = useState<ImportRow[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (open) {
      setStep(1);
      setFormat('json');
      setText('');
      setFileName('');
      setRows([]);
    }
  }, [open]);
  const handleFile = async (file: File) => {
    setFileName(file.name);
    const ext = file.name.split('.').pop()?.toLowerCase();
    const next: SkillExportFormat = ext === 'yaml' || ext === 'yml' ? 'yaml' : 'json';
    setFormat(next);
    const content = await file.text();
    setText(content);
  };
  const handlePreview = () => {
    const parsed = parseImportRows(text, format, existing);
    setRows(parsed);
    setStep(2);
  };
  const handleConfirm = () => {
    onImport(rows);
    onClose();
  };
  const okCount = rows.filter((r) => r.status === 'ok').length;
  return (
    <CenterModal
      open={open}
      onClose={onClose}
      ariaLabel="导入技能"
      panelClassName="max-w-2xl"
      title={<span className="flex items-center gap-2"><Upload className="h-5 w-5 text-[var(--brand)]" />导入技能</span>}
      description={step === 1 ? '选择 JSON / YAML 文件并预览解析结果' : '确认要导入的条目 · 仅 ok 状态会被加入'}
      footer={
        <>
          {step > 1 && <button type="button" onClick={() => setStep(1)} className="rounded-xl border border-[var(--border)] px-4 py-2 text-xs font-semibold">上一步</button>}
          {step === 1 && (
            <button type="button" onClick={handlePreview} disabled={text.trim().length === 0} className="rounded-xl bg-[var(--brand)] px-4 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40">
              预览解析
            </button>
          )}
          {step === 2 && (
            <button type="button" onClick={handleConfirm} disabled={okCount === 0} className="rounded-xl bg-[var(--brand)] px-4 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40">
              导入 {okCount} 条
            </button>
          )}
        </>
      }
    >
      <div className="mt-4 space-y-4">
        <StepIndicator current={step} total={2} labels={['选择文件', '预览确认']} />
        {step === 1 && (
          <>
            <div className="flex flex-wrap gap-2">
              {EXCHANGE_FORMATS.map((f) => (
                <button key={f.id} type="button" onClick={() => setFormat(f.id)} aria-pressed={format === f.id} className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition ${format === f.id ? 'border-[var(--brand)] bg-[var(--brand-light)] text-[var(--brand)]' : 'border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--brand)]'}`}>
                  <f.icon className="h-3.5 w-3.5" />{f.label}
                </button>
              ))}
            </div>
            <div
              className="rounded-2xl border-2 border-dashed border-[var(--border)] p-6 text-center"
              onDragOver={(e) => { e.preventDefault(); }}
              onDrop={(e) => {
                e.preventDefault();
                const file = e.dataTransfer.files?.[0];
                if (file) handleFile(file);
              }}
            >
              <Upload className="mx-auto h-6 w-6 text-[var(--text-muted)]" />
              <p className="mt-3 text-xs font-semibold">将文件拖到此处,或点击下方按钮选择</p>
              <p className="mt-1 text-[11px] text-[var(--text-muted)]">支持 .json / .yaml / .yml · 最大 1MB</p>
              <input ref={inputRef} type="file" accept=".json,.yaml,.yml" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
              <button type="button" onClick={() => inputRef.current?.click()} className="mt-4 inline-flex items-center gap-1.5 rounded-xl border border-[var(--brand)] bg-[var(--brand-light)] px-3 py-2 text-xs font-semibold text-[var(--brand)]">
                选择文件
              </button>
              {fileName && <p className="mt-3 text-[11px] text-[var(--text-muted)]">已选择:{fileName}</p>}
            </div>
            <details className="rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] p-3">
              <summary className="cursor-pointer text-[11px] font-semibold text-[var(--text-muted)]">或粘贴文件内容</summary>
              <textarea value={text} onChange={(e) => setText(e.target.value)} rows={6} placeholder="粘贴 JSON 或 YAML 内容..." className="mt-2 w-full rounded-lg border border-[var(--border-strong)] bg-[var(--surface-1)] px-3 py-2 font-mono text-[11px] leading-6 outline-none focus:border-[var(--brand)]" />
            </details>
          </>
        )}
        {step === 2 && (
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-4">
            <p className="text-xs font-semibold">解析结果 · 共 {rows.length} 行 · 可导入 {okCount} 条</p>
            <ul className="mt-3 max-h-72 space-y-1.5 overflow-y-auto">
              {rows.map((row, idx) => (
                <li key={idx} className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] px-3 py-2 text-[11px]">
                  {row.status === 'ok' && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />}
                  {row.status === 'duplicate' && <CircleAlert className="h-3.5 w-3.5 text-amber-500" />}
                  {row.status === 'missing' && <AlertTriangle className="h-3.5 w-3.5 text-rose-500" />}
                  <span className="font-semibold">{row.name}</span>
                  <span className="ml-auto text-[var(--text-muted)]">{row.message || (row.status === 'ok' ? '将创建为草稿' : '')}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </CenterModal>
  );
}

interface ExportModalProps {
  open: boolean;
  onClose: () => void;
  onExport: (format: SkillExportFormat, fields: Record<SkillExportField, boolean>) => void;
  total: number;
  selectedCount: number;
}

type ExchangeScope = 'all' | 'type' | 'selected';

export function ExportSkillModal({ open, onClose, onExport, total, selectedCount }: ExportModalProps) {
  const [step, setStep] = useState(1);
  const [scope, setScope] = useState<ExchangeScope>('all');
  const [format, setFormat] = useState<SkillExportFormat>('json');
  const [fields, setFields] = useState<Record<SkillExportField, boolean>>(DEFAULT_EXCHANGE_FIELDS);
  useEffect(() => {
    if (open) {
      setStep(1);
      setScope('all');
      setFormat('json');
      setFields(DEFAULT_EXCHANGE_FIELDS);
    }
  }, [open]);
  const handleConfirm = () => {
    onExport(format, fields);
    void scope;
    onClose();
  };
  const scopeLabel = scope === 'all' ? `全部 ${total} 个` : scope === 'selected' ? `已选 ${selectedCount} 个` : `当前类型结果`;
  return (
    <CenterModal
      open={open}
      onClose={onClose}
      ariaLabel="导出技能"
      panelClassName="max-w-2xl"
      title={<span className="flex items-center gap-2"><Download className="h-5 w-5 text-[var(--brand)]" />导出技能</span>}
      description={step === 1 ? '选择导出范围与字段' : '确认格式并触发下载'}
      footer={
        <>
          {step > 1 && <button type="button" onClick={() => setStep(1)} className="rounded-xl border border-[var(--border)] px-4 py-2 text-xs font-semibold">上一步</button>}
          {step === 2 && <button type="button" onClick={handleConfirm} className="rounded-xl bg-[var(--brand)] px-4 py-2 text-xs font-semibold text-white">开始导出</button>}
        </>
      }
    >
      <div className="mt-4 space-y-4">
        <StepIndicator current={step} total={2} labels={['范围与字段', '格式确认']} />
        {step === 1 && (
          <>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">导出范围</p>
              <div className="mt-2 grid gap-2 sm:grid-cols-3">
                {(['all', 'type', 'selected'] as const).map((s) => (
                  <button key={s} type="button" onClick={() => setScope(s)} aria-pressed={scope === s} className={`rounded-xl border p-3 text-left text-xs font-semibold transition ${scope === s ? 'border-[var(--brand)] bg-[var(--brand-light)] text-[var(--brand)]' : 'border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--brand)]'}`}>
                    {s === 'all' && `全部 · ${total} 个`}
                    {s === 'type' && `当前类型结果`}
                    {s === 'selected' && `已选 · ${selectedCount} 个`}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">导出字段</p>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {EXCHANGE_FIELDS.map((f) => (
                  <label key={f.id} className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition ${fields[f.id] ? 'border-[var(--brand)] bg-[var(--brand-light)]/40' : 'border-[var(--border)] bg-[var(--surface-1)]'}`}>
                    <input type="checkbox" checked={fields[f.id]} onChange={() => setFields((prev) => ({ ...prev, [f.id]: !prev[f.id] }))} className="mt-0.5 h-4 w-4 accent-[var(--brand)]" />
                    <div>
                      <p className="text-xs font-semibold">{f.label}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
            <p className="text-[11px] text-[var(--text-muted)]">本次将导出:<span className="font-semibold">{scopeLabel}</span></p>
            <button type="button" onClick={() => setStep(2)} className="w-full rounded-xl border border-[var(--brand)] bg-[var(--brand-light)] px-3 py-2 text-xs font-semibold text-[var(--brand)]">下一步</button>
          </>
        )}
        {step === 2 && (
          <div className="space-y-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">导出格式</p>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {EXCHANGE_FORMATS.map((f) => (
                  <button key={f.id} type="button" onClick={() => setFormat(f.id)} aria-pressed={format === f.id} className={`flex items-start gap-3 rounded-xl border p-3 text-left transition ${format === f.id ? 'border-[var(--brand)] bg-[var(--brand-light)]/40' : 'border-[var(--border)] hover:border-[var(--brand)]'}`}>
                    <span className="grid h-9 w-9 place-items-center rounded-lg bg-[var(--bg-elevated)]">
                      <f.icon className="h-4 w-4 text-[var(--brand)]" />
                    </span>
                    <div>
                      <p className="text-xs font-semibold">{f.label}</p>
                      <p className="mt-0.5 text-[11px] text-[var(--text-muted)]">{f.description}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">本次导出</p>
              <p className="mt-2 text-xs">{scopeLabel} · {Object.entries(fields).filter(([, v]) => v).map(([k]) => EXCHANGE_FIELDS.find((f) => f.id === k)?.label).join(' · ')} · {format.toUpperCase()}</p>
            </div>
          </div>
        )}
      </div>
    </CenterModal>
  );
}