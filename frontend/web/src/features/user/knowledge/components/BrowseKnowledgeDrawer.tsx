import { BookOpen, Check, FilePlus2, FileText, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { SideDrawer } from '@/components/feedback/SideDrawer';
import type { KnowledgeKind, KnowledgeResource } from '../schema';

const KIND_LABEL: Record<'all' | KnowledgeKind, string> = {
  all: '全部类型', 制度: '制度', 项目: '项目', 指南: '指南',
};

interface BrowseKnowledgeDrawerProps {
  open: boolean;
  resources: KnowledgeResource[];
  chosenIds: string[];
  loading?: boolean;
  onClose: () => void;
  onToggleChosen: (id: string) => void;
  onUse: (resource: KnowledgeResource) => void;
}

export function BrowseKnowledgeDrawer({
  open,
  resources,
  chosenIds,
  loading = false,
  onClose,
  onToggleChosen,
  onUse,
}: BrowseKnowledgeDrawerProps) {
  const [query, setQuery] = useState('');
  const [kind, setKind] = useState<'all' | KnowledgeKind>('all');

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return resources.filter((item) => {
      const matchesKind = kind === 'all' || item.kind === kind;
      const matchesQuery = !needle
        || `${item.title} ${item.description} ${item.owner} ${item.tags.join(' ')}`.toLowerCase().includes(needle);
      return matchesKind && matchesQuery;
    });
  }, [resources, query, kind]);

  const handleClose = () => {
    setQuery('');
    setKind('all');
    onClose();
  };

  return (
    <SideDrawer
      open={open}
      onClose={handleClose}
      ariaLabel="浏览并选用资料"
      eyebrow={<p className="text-[11px] font-semibold text-[var(--brand)]">知识管理 · 已开放</p>}
      closeLabel="关闭浏览资料"
      panelClassName="flex max-w-xl flex-col"
    >
      <div className="mt-6">
        <h2 className="text-xl font-semibold">浏览资料</h2>
        <p className="mt-2 text-xs leading-6 text-[var(--text-muted)]">
          列表来自知识管理中已索引、并对工作区开放的文档。加入后会出现在「我的知识」。
        </p>
      </div>

      <div className="mt-5 flex flex-col gap-2 sm:flex-row">
        <label className="relative min-w-0 flex-1">
          <span className="sr-only">搜索可选用资料</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索标题、团队或标签"
            className="h-9 w-full rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] pl-9 pr-3 text-sm outline-none focus:border-[var(--brand)]"
          />
        </label>
        <label className="shrink-0">
          <span className="sr-only">资料类型</span>
          <select
            aria-label="资料类型筛选"
            value={kind}
            onChange={(event) => setKind(event.target.value as 'all' | KnowledgeKind)}
            className="h-9 w-full rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] px-3 text-sm outline-none focus:border-[var(--brand)] sm:w-32"
          >
            {(Object.keys(KIND_LABEL) as Array<'all' | KnowledgeKind>).map((item) => (
              <option key={item} value={item}>{KIND_LABEL[item]}</option>
            ))}
          </select>
        </label>
      </div>

      <p className="mt-3 text-[11px] tabular-nums text-[var(--text-muted)]">
        {loading ? '同步中…' : `${visible.length} 项可浏览 · 已加入 ${chosenIds.length}`}
      </p>

      <ul className="mt-4 flex-1 space-y-3 overflow-y-auto pb-24">
        {visible.length === 0 ? (
          <li className="rounded-xl border border-dashed border-[var(--border)] px-4 py-10 text-center text-xs text-[var(--text-muted)]">
            {resources.length === 0 ? '管理员尚未开放资料' : '没有符合条件的资料'}
          </li>
        ) : (
          visible.map((item) => {
            const chosen = chosenIds.includes(item.id);
            return (
              <li key={item.id} className="rounded-xl border border-[var(--border)] p-4">
                <div className="flex items-start gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[var(--brand-light)] text-[var(--brand)]">
                    {item.kind === '指南' ? <BookOpen className="h-4 w-4" /> : item.kind === '项目' ? <FilePlus2 className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] text-[var(--text-muted)]">{item.kind} · {item.owner}</p>
                    <p className="mt-1 text-sm font-semibold">{item.title}</p>
                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-[var(--text-muted)]">{item.description}</p>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    aria-pressed={chosen}
                    onClick={() => onToggleChosen(item.id)}
                    className={`inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold transition ${
                      chosen
                        ? 'bg-[var(--brand-light)] text-[var(--brand)]'
                        : 'border border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--brand)] hover:text-[var(--brand)]'
                    }`}
                  >
                    {chosen ? <Check className="h-3.5 w-3.5" /> : null}
                    {chosen ? '已加入我的知识' : '加入我的知识'}
                  </button>
                  <button
                    type="button"
                    onClick={() => onUse(item)}
                    className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-[var(--brand)] px-3 text-xs font-semibold text-white hover:bg-[var(--brand-hover)]"
                  >
                    带入对话
                  </button>
                </div>
              </li>
            );
          })
        )}
      </ul>

      <div className="sticky bottom-0 -mx-6 mt-auto border-t border-[var(--border)] bg-[var(--surface-1)] px-6 py-4 sm:-mx-8 sm:px-8">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-[var(--text-muted)]">
            {chosenIds.length > 0 ? `已加入 ${chosenIds.length} 份到我的知识` : '选择后会出现在我的知识'}
          </p>
          <button
            type="button"
            onClick={handleClose}
            className="inline-flex h-9 items-center rounded-lg bg-[var(--brand)] px-4 text-xs font-semibold text-white hover:bg-[var(--brand-hover)]"
          >
            完成
          </button>
        </div>
      </div>
    </SideDrawer>
  );
}
