import { useState } from 'react';
import { X } from 'lucide-react';
import type { Source, KbScope, CreateKbVars } from '@/api/admin/knowledge/schema';
import StepIndicator from './StepIndicator';

type Retrieval = CreateKbVars['retrieval'];

const SCOPES: KbScope[] = ['公开', '部门', '个人'];
const RETRIEVALS: { id: Retrieval; label: string; hint: string }[] = [
  { id: 'hybrid', label: '混合检索', hint: '向量 + 关键词' },
  { id: 'semantic', label: '语义检索', hint: '仅向量' },
  { id: 'keyword', label: '关键词检索', hint: '仅 BM25' },
];

export default function CreateKbWizard({
  sources,
  onClose,
  onSubmit,
  isPending,
}: {
  sources: Source[];
  onClose: () => void;
  onSubmit: (vars: CreateKbVars) => void;
  isPending: boolean;
}) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [scope, setScope] = useState<KbScope>('部门');
  const [pickedSources, setPickedSources] = useState<string[]>([]);
  const [retrieval, setRetrieval] = useState<Retrieval>('hybrid');
  const [topK, setTopK] = useState(8);

  const canNext = step === 0
    ? name.trim().length > 0
    : step === 1
      ? pickedSources.length > 0
      : true;

  const toggleSource = (id: string) =>
    setPickedSources((prev) => prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-[var(--bg)]/80 p-4 sm:items-center sm:p-8 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="新建知识库" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="w-full max-w-[640px] rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] shadow-[var(--shadow-lg)]">
        <header className="flex items-center justify-between border-b border-[var(--border)] px-6 py-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--brand)]">知识库</p>
            <h3 className="mt-1 text-base font-semibold">新建知识库</h3>
          </div>
          <button type="button" onClick={onClose} aria-label="关闭" className="grid h-8 w-8 place-items-center rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--brand)]">
            <X className="h-4 w-4" />
          </button>
        </header>
        <div className="border-b border-[var(--border)] px-6 py-4">
          <StepIndicator active={step} />
        </div>
        <div className="px-6 py-5">
          {step === 0 && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="flex flex-col gap-1 sm:col-span-2">
                <span className="text-xs font-semibold text-[var(--text-secondary)]">名称</span>
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="例:产品手册 v4" className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] px-3 py-2 text-sm focus:border-[var(--brand)] focus:outline-none" />
              </label>
              <label className="flex flex-col gap-1 sm:col-span-2">
                <span className="text-xs font-semibold text-[var(--text-secondary)]">说明</span>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] px-3 py-2 text-sm focus:border-[var(--brand)] focus:outline-none" />
              </label>
              <div className="flex flex-col gap-1 sm:col-span-2">
                <span className="text-xs font-semibold text-[var(--text-secondary)]">可见范围</span>
                <div className="flex flex-wrap gap-1.5">
                  {SCOPES.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setScope(s)}
                      className={`rounded-full border px-3 py-1 text-xs font-medium transition ${scope === s ? 'border-[var(--brand)] bg-[var(--brand-light)] text-[var(--brand)]' : 'border-[var(--border)] bg-[var(--surface-1)] text-[var(--text-secondary)] hover:border-[var(--brand)] hover:text-[var(--brand)]'}`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
          {step === 1 && (
            <div className="flex flex-col gap-3">
              <p className="text-xs text-[var(--text-muted)]">选择至少一个数据源</p>
              <ul className="flex flex-col divide-y divide-[var(--border)] rounded-2xl border border-[var(--border)]">
                {sources.map((s) => (
                  <li key={s.id}>
                    <label className="flex cursor-pointer items-center gap-3 px-4 py-3 hover:bg-[var(--bg-hover)]">
                      <input type="checkbox" checked={pickedSources.includes(s.id)} onChange={() => toggleSource(s.id)} className="h-4 w-4 rounded border-[var(--border-strong)] text-[var(--brand)] focus:ring-[var(--brand)]" />
                      <span className="flex-1 text-sm font-medium">{s.name}</span>
                      <span className="text-[11px] text-[var(--text-muted)]">{s.schedule}</span>
                    </label>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {step === 2 && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1 sm:col-span-2">
                <span className="text-xs font-semibold text-[var(--text-secondary)]">检索方式</span>
                <div className="flex flex-wrap gap-1.5">
                  {RETRIEVALS.map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setRetrieval(r.id)}
                      className={`rounded-full border px-3 py-1 text-xs font-medium transition ${retrieval === r.id ? 'border-[var(--brand)] bg-[var(--brand-light)] text-[var(--brand)]' : 'border-[var(--border)] bg-[var(--surface-1)] text-[var(--text-secondary)] hover:border-[var(--brand)] hover:text-[var(--brand)]'}`}
                    >
                      {r.label} <span className="text-[10px] opacity-70">({r.hint})</span>
                    </button>
                  ))}
                </div>
              </div>
              <label className="flex flex-col gap-1">
                <span className="text-xs font-semibold text-[var(--text-secondary)]">Top K</span>
                <input type="number" min={1} max={20} value={topK} onChange={(e) => setTopK(Number(e.target.value) || 1)} className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] px-3 py-2 text-sm focus:border-[var(--brand)] focus:outline-none" />
              </label>
            </div>
          )}
          {step === 3 && (
            <dl className="grid grid-cols-1 gap-3 rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-5 text-sm sm:grid-cols-2">
              <Row label="名称" value={name} />
              <Row label="说明" value={description || '—'} />
              <Row label="可见范围" value={scope} />
              <Row label="数据源" value={`${pickedSources.length} 个`} />
              <Row label="检索" value={`${retrieval} · Top ${topK}`} full />
            </dl>
          )}
        </div>
        <footer className="flex justify-end gap-2 border-t border-[var(--border)] px-6 py-3">
          <button type="button" onClick={onClose} className="inline-flex items-center justify-center rounded-xl border border-[var(--border)] px-4 py-2 text-xs font-semibold text-[var(--text-secondary)] hover:border-[var(--brand)] hover:text-[var(--brand)]">
            取消
          </button>
          {step > 0 && (
            <button type="button" onClick={() => setStep(step - 1)} className="inline-flex items-center justify-center rounded-xl border border-[var(--border)] px-4 py-2 text-xs font-semibold text-[var(--text-secondary)] hover:border-[var(--brand)] hover:text-[var(--brand)]">
              上一步
            </button>
          )}
          {step < 3 && (
            <button type="button" disabled={!canNext} onClick={() => setStep(step + 1)} className="inline-flex items-center justify-center rounded-xl bg-[var(--brand)] px-4 py-2 text-xs font-semibold text-white hover:bg-[var(--brand-hover)] disabled:cursor-not-allowed disabled:opacity-50">
              下一步
            </button>
          )}
          {step === 3 && (
            <button
              type="button"
              disabled={isPending}
              onClick={() => onSubmit({ name: name.trim(), description, scope, boundSources: pickedSources, retrieval, topK })}
              className="inline-flex items-center justify-center rounded-xl bg-[var(--brand)] px-4 py-2 text-xs font-semibold text-white hover:bg-[var(--brand-hover)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isPending ? '创建中…' : '创建'}
            </button>
          )}
        </footer>
      </section>
    </div>
  );
}

function Row({ label, value, full }: { label: string; value: string; full?: boolean }) {
  return (
    <div className={full ? 'sm:col-span-2' : undefined}>
      <dt className="text-[10px] uppercase tracking-wide text-[var(--text-muted)]">{label}</dt>
      <dd className="mt-1 font-semibold">{value}</dd>
    </div>
  );
}