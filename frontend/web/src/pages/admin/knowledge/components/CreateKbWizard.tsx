/**
 * 新建知识库 — 页面 body(由 KbCreatePage 包裹)。
 *
 * step state 受控于父页面(1|2|3),其它字段(name/description/scope/
 * pickedSources/retrieval/topK)留在内部 useState。
 * 3 步 — 基础信息 / 数据源 / 检索设置;无独立「确认」step,改由右侧
 * CreateKbPreview 实时汇总 + 集中「创建知识库」按钮。
 * 取消动作走顶部返回 Link,wizard 自身无取消按钮。
 */
import { useState } from 'react';
import type { Source, KbScope, CreateKbVars } from '@/api/admin/knowledge/schema';
import { SOURCE_TYPE_META } from './constants';
import CreateKbPreview, { type CreateKbDraft } from './CreateKbPreview';

type Step = 1 | 2 | 3;
type Retrieval = CreateKbVars['retrieval'];

const SCOPES: KbScope[] = ['公开', '部门', '个人'];
const RETRIEVALS: { id: Retrieval; label: string; hint: string }[] = [
  { id: 'hybrid', label: '混合检索', hint: '向量 + 关键词' },
  { id: 'semantic', label: '语义检索', hint: '仅向量' },
  { id: 'keyword', label: '关键词检索', hint: '仅 BM25' },
];

export default function CreateKbWizard({
  sources,
  controlledStep,
  onStepChange,
  onSubmit,
  isSubmitting,
}: {
  sources: Source[];
  controlledStep: Step;
  onStepChange: (next: Step) => void;
  onSubmit: (vars: CreateKbVars) => void;
  isSubmitting: boolean;
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [scope, setScope] = useState<KbScope>('部门');
  const [pickedSources, setPickedSources] = useState<string[]>([]);
  const [retrieval, setRetrieval] = useState<Retrieval>('hybrid');
  const [topK, setTopK] = useState(8);

  const canNext =
    controlledStep === 1
      ? name.trim().length > 0
      : controlledStep === 2
        ? pickedSources.length > 0
        : true;

  const toggleSource = (id: string) =>
    setPickedSources((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]));

  const draft: CreateKbDraft = { name, description, scope, pickedSources, retrieval, topK };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
      <div className="space-y-6">
        {controlledStep === 1 && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1 sm:col-span-2">
              <span className="text-xs font-semibold text-[var(--text-secondary)]">名称</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="例:产品手册 v4"
                className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] px-3 py-2 text-sm focus:border-[var(--brand)] focus:outline-none"
              />
            </label>
            <label className="flex flex-col gap-1 sm:col-span-2">
              <span className="text-xs font-semibold text-[var(--text-secondary)]">说明</span>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] px-3 py-2 text-sm focus:border-[var(--brand)] focus:outline-none"
              />
            </label>
            <div className="flex flex-col gap-1 sm:col-span-2">
              <span className="text-xs font-semibold text-[var(--text-secondary)]">可见范围</span>
              <p className="text-[11px] text-[var(--text-muted)]">决定谁能查看与检索这个知识库</p>
              <div className="flex flex-wrap gap-1.5">
                {SCOPES.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setScope(s)}
                    className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                      scope === s
                        ? 'border-[var(--brand)] bg-[var(--brand-light)] text-[var(--brand)]'
                        : 'border-[var(--border)] bg-[var(--surface-1)] text-[var(--text-secondary)] hover:border-[var(--brand)] hover:text-[var(--brand)]'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {controlledStep === 2 && (
          <div className="flex flex-col gap-3">
            <p className="text-xs text-[var(--text-muted)]">
              已选 {pickedSources.length} 个,至少 1 个
            </p>
            <ul className="flex flex-col divide-y divide-[var(--border)] rounded-2xl border border-[var(--border)]">
              {sources.map((s) => {
                const checked = pickedSources.includes(s.id);
                return (
                  <li key={s.id}>
                    <label
                      className={`flex cursor-pointer items-center gap-3 px-4 py-3 transition ${
                        checked ? 'bg-[var(--brand-light)]' : 'hover:bg-[var(--bg-hover)]'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleSource(s.id)}
                        className="h-4 w-4 rounded border-[var(--border-strong)] text-[var(--brand)] focus:ring-[var(--brand)]"
                      />
                      <span aria-hidden className="text-base leading-none">
                        {SOURCE_TYPE_META[s.type].icon}
                      </span>
                      <span className="flex-1">
                        <span className="block text-sm font-medium">{s.name}</span>
                        <span className="text-[10px] text-[var(--text-muted)]">
                          {SOURCE_TYPE_META[s.type].label}
                        </span>
                      </span>
                      <span className="text-[11px] text-[var(--text-muted)]">{s.schedule}</span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {controlledStep === 3 && (
          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <span className="text-xs font-semibold text-[var(--text-secondary)]">检索方式</span>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {RETRIEVALS.map((r) => {
                  const active = retrieval === r.id;
                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setRetrieval(r.id)}
                      className={`flex flex-col items-start gap-1 rounded-xl border p-4 text-left transition ${
                        active
                          ? 'border-[var(--brand)] bg-[var(--brand-light)]'
                          : 'border-[var(--border)] bg-[var(--surface-1)] hover:border-[var(--brand)]'
                      }`}
                    >
                      <span
                        className={`text-sm font-semibold ${
                          active ? 'text-[var(--brand)]' : 'text-[var(--text)]'
                        }`}
                      >
                        {r.label}
                      </span>
                      <span className="text-[11px] leading-4 text-[var(--text-muted)]">
                        {r.hint}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
              <label className="flex flex-col gap-1">
                <span className="text-xs font-semibold text-[var(--text-secondary)]">
                  Top K
                </span>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={topK}
                  onChange={(e) => setTopK(Math.min(20, Math.max(1, Number(e.target.value) || 1)))}
                  className="w-24 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] px-3 py-2 text-sm focus:border-[var(--brand)] focus:outline-none"
                />
              </label>
              <p className="text-[11px] text-[var(--text-muted)] sm:pb-2.5">1–20,默认 8</p>
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--border)] pt-4">
          {controlledStep > 1 ? (
            <button
              type="button"
              onClick={() => onStepChange((controlledStep - 1) as Step)}
              className="inline-flex items-center justify-center rounded-xl border border-[var(--border)] px-4 py-2 text-xs font-semibold text-[var(--text-secondary)] hover:border-[var(--brand)] hover:text-[var(--brand)]"
            >
              ← 上一步
            </button>
          ) : (
            <span />
          )}
          {controlledStep < 3 ? (
            <button
              type="button"
              disabled={!canNext}
              onClick={() => onStepChange((controlledStep + 1) as Step)}
              className="inline-flex items-center justify-center gap-1 rounded-xl bg-[var(--brand)] px-4 py-2 text-xs font-semibold text-white hover:bg-[var(--brand-hover)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              下一步 →
            </button>
          ) : (
            <span className="text-[11px] text-[var(--text-muted)]">请在右侧确认并创建</span>
          )}
        </div>
      </div>

      <CreateKbPreview
        draft={draft}
        sources={sources}
        isSubmitting={isSubmitting}
        onSubmit={() =>
          onSubmit({
            name: name.trim(),
            description,
            scope,
            boundSources: pickedSources,
            retrieval,
            topK,
          })
        }
      />
    </div>
  );
}