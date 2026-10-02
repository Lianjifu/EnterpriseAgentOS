/**
 * 新建知识库 — 实时预览面板(由 CreateKbWizard 内嵌)。
 *
 * 受控只读组件:接 draft 快照(只读),无任何操作按钮;
 * 创建动作走 wizard 底部按钮。
 */
import type { Source, KbScope, CreateKbVars } from '../schema';
import { SOURCE_TYPE_META } from './constants';

type Retrieval = CreateKbVars['retrieval'];

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
}: {
  draft: CreateKbDraft;
  sources: Source[];
}) {
  const pickedNames = draft.pickedSources
    .map((id) => sources.find((s) => s.id === id))
    .filter((s): s is Source => Boolean(s));

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