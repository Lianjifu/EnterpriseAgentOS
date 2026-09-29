/**
 * 新建知识库 — 实时预览面板(由 CreateKbWizard 内嵌)。
 *
 * 受控组件:接 draft 快照(只读) + 单 onSubmit 回调;
 * 内部不持有任何 state,纯展示 + 创建按钮 disabled 派生。
 * 「创建」按钮集中在此,wizard 底部不再重复。
 */
import { Plus } from 'lucide-react';
import type { Source, KbScope, Retrieval } from '@/api/admin/knowledge/schema';
import { SOURCE_TYPE_META } from './constants';

const RETRIEVAL_LABEL: Record<Retrieval, string> = {
  hybrid: '混合检索',
  semantic: '语义检索',
  keyword: '关键词检索',
};

export type CreateKbDraft = {
  name: string;
  description: string;
  scope: KbScope;
  pickedSources: string[];
  retrieval: Retrieval;
  topK: number;
};

export default function CreateKbPreview({
  draft,
  sources,
  isSubmitting,
  onSubmit,
}: {
  draft: CreateKbDraft;
  sources: Source[];
  isSubmitting: boolean;
  onSubmit: () => void;
}) {
  const pickedNames = draft.pickedSources
    .map((id) => sources.find((s) => s.id === id))
    .filter((s): s is Source => Boolean(s));

  const canSubmit = draft.name.trim().length > 0 && draft.pickedSources.length > 0;

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-5 lg:sticky lg:top-5">
      <header>
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--brand)]">
          实时预览
        </p>
        <p className="mt-1 text-[11px] leading-4 text-[var(--text-muted)]">
          填写的信息会实时汇总在这里
        </p>
      </header>

      <dl className="mt-4 grid grid-cols-2 gap-3 text-xs">
        <Field label="名称" value={draft.name.trim() || '—'} full />
        <Field label="说明" value={draft.description.trim() || '—'} full />
        <Field label="可见范围" value={draft.scope} />
        <Field label="数据源" value={`${draft.pickedSources.length} 个`} />
        <Field
          label="检索"
          value={`${RETRIEVAL_LABEL[draft.retrieval]} · Top ${draft.topK}`}
          full
        />
      </dl>

      {pickedNames.length > 0 && (
        <ul className="mt-4 flex flex-wrap gap-1.5">
          {pickedNames.map((s) => (
            <li
              key={s.id}
              className="inline-flex items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--bg-elevated)] px-2 py-0.5 text-[10px] font-medium text-[var(--text-secondary)]"
            >
              <span aria-hidden>{SOURCE_TYPE_META[s.type].icon}</span>
              <span>{s.name}</span>
            </li>
          ))}
        </ul>
      )}

      <button
        type="button"
        onClick={onSubmit}
        disabled={isSubmitting || !canSubmit}
        className="mt-5 inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-[var(--brand)] px-4 py-2 text-xs font-semibold text-white hover:bg-[var(--brand-hover)] disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Plus className="h-3.5 w-3.5" />
        {isSubmitting ? '创建中…' : '创建知识库'}
      </button>
    </div>
  );
}

function Field({ label, value, full }: { label: string; value: string; full?: boolean }) {
  return (
    <div className={full ? 'col-span-2' : undefined}>
      <dt className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
        {label}
      </dt>
      <dd className="mt-1 truncate font-semibold text-[var(--text)]">{value}</dd>
    </div>
  );
}