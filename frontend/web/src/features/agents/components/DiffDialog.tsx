/**
 * 版本对比对话框 — 基于 LCS 的行级 diff;支持 5 个 Prompt 子文档(PROMPT.md / SOUL.md / AGENTS.md / USER.md / TOOLS.md)切换。
 */
import { useMemo, useState } from 'react';
import { ChevronDown, GitCompare } from 'lucide-react';
import { CenterModal } from '@/components/feedback/CenterModal';
import type { PromptKey } from '../schema';
import { PROMPT_DOCS } from './constants';

export interface VersionPairOption {
  id: string;
  label: string;
}

export interface DiffPair {
  base: VersionPairOption;
  target: VersionPairOption;
}

type DiffLine = { type: 'ctx' | 'add' | 'del'; text: string };

function lcsDiff(a: string[], b: string[]): DiffLine[] {
  const n = a.length;
  const m = b.length;
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const out: DiffLine[] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      out.push({ type: 'ctx', text: a[i] });
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      out.push({ type: 'del', text: a[i] });
      i++;
    } else {
      out.push({ type: 'add', text: b[j] });
      j++;
    }
  }
  while (i < n) out.push({ type: 'del', text: a[i++] });
  while (j < m) out.push({ type: 'add', text: b[j++] });
  return out;
}

export function DiffDialog({
  open, onClose, pair, baseContent, targetContent, onChangePair,
}: {
  open: boolean;
  onClose: () => void;
  pair: DiffPair;
  baseContent: Record<PromptKey, string>;
  targetContent: Record<PromptKey, string>;
  onChangePair: (next: DiffPair) => void;
}) {
  const [doc, setDoc] = useState<PromptKey>('prompt');
  const baseLines = useMemo(() => (baseContent[doc] ?? '').split('\n'), [baseContent, doc]);
  const targetLines = useMemo(() => (targetContent[doc] ?? '').split('\n'), [targetContent, doc]);
  const diff = useMemo(() => lcsDiff(baseLines, targetLines), [baseLines, targetLines]);
  const addCount = diff.filter((l) => l.type === 'add').length;
  const delCount = diff.filter((l) => l.type === 'del').length;
  const modCount = Math.min(addCount, delCount);

  const title = (
    <span className="flex items-center gap-2">
      <GitCompare className="h-5 w-5 text-[var(--brand)]" />Prompt 版本对比 · {doc}
    </span>
  );
  const description = `${pair.base.label} → ${pair.target.label} · ${addCount} 新增 · ${delCount} 删除 · ${modCount} 修改`;

  const footer = (
    <button type="button" onClick={onClose} className="rounded-xl border border-[var(--border)] px-4 py-2 text-xs font-semibold text-[var(--text-secondary)] hover:border-[var(--brand)]">关闭</button>
  );

  return (
    <CenterModal
      open={open}
      onClose={onClose}
      ariaLabel="Prompt 版本对比"
      title={title}
      description={description}
      panelClassName="max-w-4xl"
      footer={footer}
    >
      <div className="mt-5 space-y-4">
        <div className="grid gap-2 sm:grid-cols-[1fr_auto_1fr]">
          <label className="flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] px-3 py-2">
            <span className="text-[11px] font-semibold text-[var(--text-muted)]">基线</span>
            <select
              value={pair.base.id}
              onChange={(event) => onChangePair({ ...pair, base: { id: event.target.value, label: event.target.options[event.target.selectedIndex].text } })}
              className="flex-1 bg-transparent text-xs font-medium outline-none"
            >
              <option value={pair.base.id}>{pair.base.label}</option>
            </select>
            <ChevronDown className="h-3.5 w-3.5 text-[var(--text-muted)]" />
          </label>
          <div className="grid place-items-center text-xs text-[var(--text-muted)]">→</div>
          <label className="flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] px-3 py-2">
            <span className="text-[11px] font-semibold text-[var(--text-muted)]">目标</span>
            <select
              value={pair.target.id}
              onChange={(event) => onChangePair({ ...pair, target: { id: event.target.value, label: event.target.options[event.target.selectedIndex].text } })}
              className="flex-1 bg-transparent text-xs font-medium outline-none"
            >
              <option value={pair.target.id}>{pair.target.label}</option>
            </select>
            <ChevronDown className="h-3.5 w-3.5 text-[var(--text-muted)]" />
          </label>
        </div>

        <div className="flex flex-wrap gap-2">
          {PROMPT_DOCS.map((d) => {
            const active = doc === d.key;
            return (
              <button
                key={d.key}
                type="button"
                onClick={() => setDoc(d.key)}
                aria-pressed={active}
                className={`rounded-full border px-3 py-1 text-[11px] font-semibold transition ${active ? 'border-[var(--brand)] bg-[var(--brand-light)] text-[var(--brand)]' : 'border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--brand)] hover:text-[var(--brand)]'}`}
              >
                {d.file}
              </button>
            );
          })}
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          <div className="overflow-hidden rounded-xl border border-[var(--border)]">
            <div className="border-b border-[var(--border)] bg-[var(--bg-elevated)] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
              基线 · {pair.base.label}
            </div>
            <pre className="max-h-80 overflow-auto bg-[var(--danger-bg)]/30 p-3 font-mono text-[11px] leading-5">
              {baseLines.length ? baseLines.map((line, idx) => (
                <div key={idx} className="whitespace-pre-wrap">
                  <span className="mr-2 inline-block w-4 select-none text-right text-[var(--text-muted)]">{idx + 1}</span>
                  {line}
                </div>
              )) : <span className="text-[var(--text-muted)]">（空）</span>}
            </pre>
          </div>
          <div className="overflow-hidden rounded-xl border border-[var(--border)]">
            <div className="border-b border-[var(--border)] bg-[var(--bg-elevated)] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
              目标 · {pair.target.label}
            </div>
            <pre className="max-h-80 overflow-auto bg-[var(--success-bg)]/30 p-3 font-mono text-[11px] leading-5">
              {targetLines.length ? targetLines.map((line, idx) => (
                <div key={idx} className="whitespace-pre-wrap">
                  <span className="mr-2 inline-block w-4 select-none text-right text-[var(--text-muted)]">{idx + 1}</span>
                  {line}
                </div>
              )) : <span className="text-[var(--text-muted)]">（空）</span>}
            </pre>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-[var(--border)]">
          <div className="border-b border-[var(--border)] bg-[var(--bg-elevated)] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
            合并视图 · {addCount} 新增 · {delCount} 删除 · {modCount} 修改
          </div>
          <div className="max-h-80 overflow-auto bg-[var(--bg-elevated)] p-3 font-mono text-[11px] leading-5">
            {diff.map((line, idx) => {
              const prefix = line.type === 'add' ? '+' : line.type === 'del' ? '−' : ' ';
              const bg = line.type === 'add' ? 'bg-[var(--success-bg)] text-[var(--success)]' :
                line.type === 'del' ? 'bg-[var(--danger-bg)] text-[var(--danger)]' :
                  'text-[var(--text-secondary)]';
              return (
                <div key={idx} className={`whitespace-pre-wrap px-2 ${bg}`}>
                  <span className="mr-2 inline-block w-3 select-none text-right text-[var(--text-muted)]">{prefix}</span>
                  {line.text || ' '}
                </div>
              );
            })}
            {diff.length === 0 && <span className="text-[var(--text-muted)]">两个版本完全相同。</span>}
          </div>
        </div>
      </div>
    </CenterModal>
  );
}