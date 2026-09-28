/**
 * Drawer 9 个子面板 — basic / prompt / skills / knowledge / memory / flow / versions / evaluation / permission。
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import {
  AlertTriangle, Beaker, Brain, CheckCircle2, Copy, Download, Edit3, FileText,
  FolderTree, GitBranch, Hash, History, Layers, Play, Plus, RotateCcw,
  Save, ShieldCheck, Sparkles, Tag, Workflow, X,
} from 'lucide-react';
import type { AgentEntry, KnowledgeRef, MemoryPolicy, FlowRef, PromptDocs, PromptKey, EvalCase, CustomPromptDoc } from '@/api/admin/agents/schema';
import { KNOWN_TONES, formatCalls, buildPrompts } from '@/mock/admin/agents.fixtures';
import { EvalProgress } from './Primitives';
import { MarkdownView } from './MarkdownView';
import {
  DOCUMENT_TARGET_LIMITS, MEMORY_RETENTION_OPTIONS, MEMORY_SCOPE_OPTIONS,
  PROMPT_DOCS, PROMPT_SNIPPETS, statusBadge, toneClass,
} from './constants';

export function DrawerPanelBasic({ draft, onChange }: { draft: AgentEntry; onChange: (patch: Partial<AgentEntry>) => void }) {
  const update = (patch: Partial<AgentEntry>) => onChange(patch);
  const [tagDraft, setTagDraft] = useState('');
  const badge = statusBadge[draft.status];
  const tags = draft.tags ?? [];

  const handleAddTag = () => {
    const t = tagDraft.trim();
    if (!t || tags.includes(t)) return;
    update({ tags: [...tags, t] });
    setTagDraft('');
  };

  const handleRemoveTag = (t: string) => {
    update({ tags: tags.filter((x) => x !== t) });
  };

  const handleTagKey = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault();
      handleAddTag();
    } else if (event.key === 'Backspace' && tagDraft === '' && tags.length > 0) {
      update({ tags: tags.slice(0, -1) });
    }
  };

  return (
    <div className="space-y-6">
      {/* 基础身份 */}
      <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-5">
        <header className="mb-4 flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">基础身份</h3>
          <span className="text-[10px] font-mono text-[var(--text-muted)]">ID · {draft.id}</span>
        </header>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">名称</span>
            <input
              type="text"
              value={draft.name}
              onChange={(event) => update({ name: event.target.value })}
              className="mt-1.5 h-10 w-full rounded-xl border border-[var(--border-strong)] bg-[var(--bg-elevated)] px-3 text-sm outline-none focus:border-[var(--brand)]"
            />
          </label>
          <label className="block">
            <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">场景分类</span>
            <input
              type="text"
              value={draft.category}
              onChange={(event) => update({ category: event.target.value })}
              className="mt-1.5 h-10 w-full rounded-xl border border-[var(--border-strong)] bg-[var(--bg-elevated)] px-3 text-sm outline-none focus:border-[var(--brand)]"
            />
          </label>
          <label className="block sm:col-span-2">
            <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">描述</span>
            <textarea
              value={draft.description}
              onChange={(event) => update({ description: event.target.value })}
              rows={3}
              className="mt-1.5 w-full rounded-xl border border-[var(--border-strong)] bg-[var(--bg-elevated)] px-3 py-2 text-sm outline-none focus:border-[var(--brand)]"
            />
          </label>
          <label className="block">
            <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">负责人</span>
            <input
              type="text"
              value={draft.owner}
              onChange={(event) => update({ owner: event.target.value })}
              className="mt-1.5 h-10 w-full rounded-xl border border-[var(--border-strong)] bg-[var(--bg-elevated)] px-3 text-sm outline-none focus:border-[var(--brand)]"
            />
          </label>
          <label className="block">
            <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">主题色</span>
            <div className="mt-1.5 flex flex-wrap gap-2">
              {KNOWN_TONES.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => update({ tone: t })}
                  aria-pressed={draft.tone === t}
                  aria-label={`主题色 ${t}`}
                  className={`grid h-9 w-9 place-items-center rounded-lg border transition ${draft.tone === t ? 'border-[var(--brand)] ring-2 ring-[var(--brand)]/30' : 'border-[var(--border)] hover:border-[var(--brand)]'}`}
                >
                  <span className={`h-5 w-5 rounded-full ${toneClass[t]}`} />
                </button>
              ))}
            </div>
          </label>
        </div>
      </section>

      {/* 标签 */}
      <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-5">
        <header className="mb-4 flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">标签</h3>
          <span className="text-[10px] text-[var(--text-muted)]">{tags.length} 个</span>
        </header>
        <div className="flex flex-wrap items-center gap-2">
          {tags.map((t) => (
            <span key={t} className="inline-flex items-center gap-1 rounded-full bg-[var(--brand-light)] px-2.5 py-1 text-[11px] font-semibold text-[var(--brand)]">
              <Tag className="h-3 w-3" />{t}
              <button
                type="button"
                onClick={() => handleRemoveTag(t)}
                aria-label={`移除标签 ${t}`}
                className="ml-0.5 grid h-3.5 w-3.5 place-items-center rounded-full text-[var(--brand)] hover:bg-[var(--brand)] hover:text-white"
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </span>
          ))}
          <input
            type="text"
            value={tagDraft}
            onChange={(event) => setTagDraft(event.target.value)}
            onKeyDown={handleTagKey}
            onBlur={handleAddTag}
            placeholder={tags.length === 0 ? '输入标签后按回车' : '+ 添加'}
            aria-label="添加标签"
            className="h-7 min-w-[140px] flex-1 rounded-full border border-dashed border-[var(--border)] bg-transparent px-3 text-[11px] outline-none focus:border-[var(--brand)] focus:bg-[var(--bg-elevated)]"
          />
        </div>
        <p className="mt-2 text-[10px] text-[var(--text-muted)]">回车或逗号确认 · Backspace 删除上一个</p>
      </section>

      {/* 版本与状态 */}
      <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-5">
        <header className="mb-4 flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">版本与状态</h3>
          <span className="text-[10px] text-[var(--text-muted)]">最近更新 · {draft.lastUpdate}</span>
        </header>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">版本号</span>
            <input
              type="text"
              value={draft.version}
              onChange={(event) => update({ version: event.target.value })}
              className="mt-1.5 h-10 w-full rounded-xl border border-[var(--border-strong)] bg-[var(--bg-elevated)] px-3 text-sm font-mono outline-none focus:border-[var(--brand)]"
            />
          </label>
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">当前状态</span>
            <div className="mt-1.5 flex h-10 items-center gap-2 rounded-xl border border-[var(--border-strong)] bg-[var(--bg-elevated)] px-3 text-xs">
              <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 font-semibold ${badge.className}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${badge.dot}`} aria-hidden="true" />
                {badge.label}
              </span>
              <span className="text-[var(--text-muted)]">· 由发布流程控制,不能在编辑器直接修改。</span>
            </div>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
          <KPI label="总调用" value={formatCalls(draft.calls)} />
          <KPI label="成功率" value={`${draft.successRate.toFixed(2)}%`} tone="success" />
          <KPI label="错误率" value={`${draft.errorRate.toFixed(2)}%`} tone={draft.errorRate > 1 ? 'danger' : 'muted'} />
          <KPI label="平均延迟" value={`${(draft.avgLatencyMs / 1000).toFixed(2)}s`} />
          <KPI label="评分" value={draft.rating > 0 ? draft.rating.toFixed(1) : '—'} tone="warn" />
        </div>
        {draft.trend.length > 0 && (
          <div className="mt-4">
            <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--text-muted)]">最近 12 期调用趋势</p>
            <TrendBars values={draft.trend} />
          </div>
        )}
      </section>

      {/* 可见性与访问 */}
      <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-5">
        <header className="mb-4">
          <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">可见性与数据访问</h3>
          <p className="mt-1 text-[11px] text-[var(--text-muted)]">详细权限配置请前往「权限」面板。</p>
        </header>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">可见范围</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {(['公开', '部门', '个人'] as const).map((scope) => {
              const active = draft.visibleScope.includes(scope);
              return (
                <button
                  key={scope}
                  type="button"
                  onClick={() => update({
                    visibleScope: active
                      ? draft.visibleScope.filter((s) => s !== scope)
                      : [...draft.visibleScope, scope],
                  })}
                  aria-pressed={active}
                  className={`rounded-full border px-3 py-1.5 text-[11px] font-medium transition ${active ? 'border-[var(--brand)] bg-[var(--brand-light)] text-[var(--brand)]' : 'border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--brand)] hover:text-[var(--brand)]'}`}
                >
                  {scope}
                </button>
              );
            })}
          </div>
        </div>
        <label className="mt-4 block">
          <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">数据访问范围</span>
          <input
            type="text"
            value={draft.dataAccess}
            onChange={(event) => update({ dataAccess: event.target.value })}
            placeholder="例如:客户档案 · 订单系统"
            className="mt-1.5 h-10 w-full rounded-xl border border-[var(--border-strong)] bg-[var(--bg-elevated)] px-3 text-sm outline-none focus:border-[var(--brand)]"
          />
        </label>
      </section>
    </div>
  );
}

function KPI({ label, value, tone }: { label: string; value: string; tone?: 'success' | 'danger' | 'warn' | 'muted' }) {
  const toneClass = tone === 'success'
    ? 'text-[var(--success)]'
    : tone === 'danger'
      ? 'text-[var(--danger)]'
      : tone === 'warn'
        ? 'text-[var(--warning)]'
        : tone === 'muted'
          ? 'text-[var(--text-muted)]'
          : 'text-[var(--text)]';
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] px-3 py-2.5">
      <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--text-muted)]">{label}</p>
      <p className={`mt-1 text-base font-semibold tabular-nums ${toneClass}`}>{value}</p>
    </div>
  );
}

function TrendBars({ values }: { values: number[] }) {
  const max = Math.max(...values, 1);
  return (
    <div className="mt-2 flex h-16 items-end gap-1">
      {values.map((v, idx) => {
        const h = Math.max(4, Math.round((v / max) * 56));
        return (
          <div
            key={idx}
            className="flex-1 rounded-t bg-gradient-to-t from-[var(--brand)]/30 to-[var(--brand)]"
            style={{ height: `${h}px` }}
            title={`第 ${idx + 1} 期 · ${v.toLocaleString()}`}
            aria-label={`第 ${idx + 1} 期 ${v.toLocaleString()}`}
          />
        );
      })}
    </div>
  );
}

export function DrawerPanelVersions({ draft, onOpenDiff }: { draft: AgentEntry; onOpenDiff?: () => void }) {
  if (draft.versions.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-[var(--border)] p-6 text-center">
        <GitBranch className="mx-auto h-6 w-6 text-[var(--text-muted)]" />
        <p className="mt-3 text-sm font-semibold">暂无历史版本</p>
        <p className="mt-1 text-xs text-[var(--text-muted)]">提交审核后将自动记录每个发布版本与发布时间。</p>
      </div>
    );
  }
  const current = draft.versions.find((v) => v.current);
  const previous = draft.versions.filter((v) => !v.current).slice(-1)[0];
  const defaultLeft = previous?.version ?? draft.versions[draft.versions.length - 1].version;
  const defaultRight = current?.version ?? draft.versions[0].version;
  return (
    <div className="space-y-3">
      {draft.versions.map((version) => (
        <div key={version.version} className={`flex items-center gap-3 rounded-xl border p-4 ${version.current ? 'border-[var(--success)]/30 bg-[var(--success-bg)]/40' : 'border-[var(--border)]'}`}>
          <span className={`grid h-10 w-10 place-items-center rounded-lg ${version.current ? 'bg-[var(--success-bg)] text-[var(--success)]' : 'bg-[var(--bg-elevated)] text-[var(--text-muted)]'}`}>
            <GitBranch className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold">{version.version}</p>
              {version.current && <span className="rounded-full bg-[var(--success-bg)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--success)]">当前</span>}
            </div>
            <p className="mt-0.5 text-xs text-[var(--text-muted)]">{version.publisher} · 发布于 {version.releasedAt}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onOpenDiff?.()}
              className="rounded-lg border border-[var(--border)] px-2.5 py-1 text-[11px] font-semibold hover:border-[var(--brand)]"
            >
              查看 diff
            </button>
            {!version.current && <button type="button" className="rounded-lg border border-[var(--border)] px-2.5 py-1 text-[11px] font-semibold hover:border-[var(--brand)]">回滚</button>}
          </div>
        </div>
      ))}
      {draft.versions.length > 1 && (
        <p className="px-1 text-[11px] text-[var(--text-muted)]">共 {draft.versions.length} 个版本 · 默认对比 {defaultLeft} → {defaultRight}。</p>
      )}
    </div>
  );
}

export function DrawerPanelSkills({ draft }: { draft: AgentEntry }) {
  if (draft.tools.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-[var(--border)] p-6 text-center">
        <Layers className="mx-auto h-6 w-6 text-[var(--text-muted)]" />
        <p className="mt-3 text-sm font-semibold">暂未绑定技能</p>
        <p className="mt-1 text-xs text-[var(--text-muted)]">在智能体编辑器中关联 Skill / Tool / MCP。</p>
      </div>
    );
  }
  return (
    <div>
      <p className="text-xs text-[var(--text-muted)]">当前智能体可调用的技能能力,修改后将随下次版本发布生效。</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {draft.tools.map((tool) => (
          <span key={tool} className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] px-3 py-2 text-xs font-medium">
            <Layers className="h-3.5 w-3.5 text-[var(--brand)]" />
            {tool}
          </span>
        ))}
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-[var(--border)] p-4">
          <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--text-muted)]">Skill</p>
          <p className="mt-2 text-base font-semibold">{Math.ceil(draft.tools.length / 2)}</p>
        </div>
        <div className="rounded-xl border border-[var(--border)] p-4">
          <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--text-muted)]">Tool</p>
          <p className="mt-2 text-base font-semibold">{Math.floor(draft.tools.length / 2)}</p>
        </div>
        <div className="rounded-xl border border-[var(--border)] p-4">
          <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--text-muted)]">MCP</p>
          <p className="mt-2 text-base font-semibold">{draft.tools.length >= 5 ? 2 : 1}</p>
        </div>
      </div>
    </div>
  );
}

export function DrawerPanelEvaluation({
  draft, isRunning, progress, lastResult, onRunEval,
}: {
  draft: AgentEntry;
  isRunning?: boolean;
  progress?: number;
  lastResult?: EvalCase[] | null;
  onRunEval?: () => void;
}) {
  if (draft.evaluationRuns === 0 && !lastResult) {
    return (
      <div className="rounded-2xl border border-dashed border-[var(--border)] p-6 text-center">
        <Beaker className="mx-auto h-6 w-6 text-[var(--text-muted)]" />
        <p className="mt-3 text-sm font-semibold">暂未运行评测</p>
        <p className="mt-1 text-xs text-[var(--text-muted)]">点击下方按钮运行一次基线评测,结果将纳入回归追踪。</p>
        {onRunEval && (
          <button
            type="button"
            onClick={onRunEval}
            disabled={isRunning}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[var(--brand)] px-4 py-2 text-xs font-semibold text-white hover:bg-[var(--brand-hover)] disabled:opacity-50"
          >
            <Play className="h-3.5 w-3.5" />{isRunning ? '运行中...' : '运行评测'}
          </button>
        )}
      </div>
    );
  }
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4 rounded-2xl border border-[var(--border)] p-5">
        <span className="grid h-12 w-12 place-items-center rounded-xl bg-[var(--warning-bg)] text-[var(--warning)]">
          <Sparkles className="h-6 w-6" />
        </span>
        <div className="flex-1">
          <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--text-muted)]">综合评分</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">{draft.rating.toFixed(1)} <span className="text-xs font-normal text-[var(--text-muted)]">/ 5.0</span></p>
        </div>
        <div className="text-right">
          <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--text-muted)]">通过率</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">{draft.evaluationPassRate.toFixed(1)}%</p>
        </div>
        {onRunEval && (
          <button
            type="button"
            onClick={onRunEval}
            disabled={isRunning}
            className="inline-flex items-center gap-2 rounded-xl border border-[var(--brand)] bg-[var(--brand-light)] px-3 py-2 text-xs font-semibold text-[var(--brand)] hover:opacity-80 disabled:opacity-50"
          >
            <Play className="h-3.5 w-3.5" />{isRunning ? '运行中...' : '运行评测'}
          </button>
        )}
      </div>
      {isRunning && <EvalProgress progress={progress ?? 0} />}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-[var(--border)] p-4">
          <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--text-muted)]">评测批次</p>
          <p className="mt-2 text-lg font-semibold tabular-nums">{draft.evaluationRuns}</p>
        </div>
        <div className="rounded-xl border border-[var(--border)] p-4">
          <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--text-muted)]">失败用例</p>
          <p className="mt-2 text-lg font-semibold tabular-nums">{draft.evaluationFailedCases}</p>
        </div>
        <div className="rounded-xl border border-[var(--border)] p-4">
          <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--text-muted)]">响应延迟</p>
          <p className="mt-2 text-lg font-semibold tabular-nums">{(draft.avgLatencyMs / 1000).toFixed(2)}s</p>
        </div>
        <div className="rounded-xl border border-[var(--border)] p-4">
          <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--text-muted)]">回归用例</p>
          <p className="mt-2 text-lg font-semibold tabular-nums">{Math.max(draft.evaluationRuns * 12, 12)}</p>
        </div>
      </div>
      {lastResult && (
        <div className="rounded-2xl border border-[var(--border)] p-5">
          <p className="text-xs font-semibold">本次评测 · {lastResult.length} 个用例</p>
          <ul className="mt-3 grid gap-1 sm:grid-cols-2">
            {lastResult.map((c) => (
              <li key={c.id} className="flex items-center justify-between rounded-lg bg-[var(--bg-elevated)] px-3 py-1.5 text-[11px]">
                <span className="font-medium">{c.name}</span>
                {c.status === 'pass'
                  ? <span className="inline-flex items-center gap-1 text-[var(--success)]">✓ {c.latency.toFixed(2)}s</span>
                  : <span className="inline-flex items-center gap-1 text-[var(--danger)]">✗ {c.latency.toFixed(2)}s</span>}
              </li>
            ))}
          </ul>
        </div>
      )}
      {!lastResult && (
        <div className="rounded-2xl border border-[var(--border)] p-5">
          <p className="text-xs font-semibold">最近评测批次</p>
          <ul className="mt-3 space-y-2 text-xs">
            {[0, 1, 2].map((i) => (
              <li key={i} className="flex items-center justify-between rounded-lg bg-[var(--bg-elevated)] px-3 py-2">
                <span>基线评测 #{draft.evaluationRuns - i} · 通过 {Math.max(draft.evaluationPassRate - i, 60).toFixed(1)}%</span>
                <span className="text-[var(--text-muted)]">{i === 0 ? '刚刚' : i === 1 ? '昨天' : '3 天前'}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export function DrawerPanelPermission({ draft }: { draft: AgentEntry }) {
  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-semibold">可见范围</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {draft.visibleScope.map((scope) => (
            <span key={scope} className="inline-flex items-center gap-2 rounded-full bg-[var(--bg-elevated)] px-3 py-1.5 text-xs font-medium">
              <ShieldCheck className="h-3.5 w-3.5 text-[var(--brand)]" />
              {scope}
            </span>
          ))}
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-[var(--border)] p-4">
          <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--text-muted)]">数据访问范围</p>
          <p className="mt-2 text-sm font-medium">{draft.dataAccess}</p>
        </div>
        <div className="rounded-xl border border-[var(--border)] p-4">
          <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--text-muted)]">负责人</p>
          <p className="mt-2 text-sm font-medium">{draft.owner}</p>
        </div>
      </div>
      <div className="rounded-2xl border border-[var(--border)] p-5">
        <p className="text-xs font-semibold">操作审计</p>
        <p className="mt-1 text-xs text-[var(--text-muted)]">查看该智能体的发布、权限变更与下线记录。</p>
        <ul className="mt-3 space-y-2 text-xs">
          <li className="flex items-center justify-between rounded-lg bg-[var(--bg-elevated)] px-3 py-2"><span>{draft.owner} · 调整可见范围</span><span className="text-[var(--text-muted)]">{draft.lastUpdate}</span></li>
          <li className="flex items-center justify-between rounded-lg bg-[var(--bg-elevated)] px-3 py-2"><span>系统 · 自动回归通过</span><span className="text-[var(--text-muted)]">3 天前</span></li>
          <li className="flex items-center justify-between rounded-lg bg-[var(--bg-elevated)] px-3 py-2"><span>合规 · 内容安全扫描通过</span><span className="text-[var(--text-muted)]">上周</span></li>
        </ul>
      </div>
    </div>
  );
}

export function DrawerPanelPrompt({
  draft, promptDoc, setPromptDoc, onChange, onChangeCustom,
}: {
  draft: AgentEntry;
  promptDoc: string;
  setPromptDoc: (k: string) => void;
  onChange: (patch: Partial<PromptDocs>) => void;
  onChangeCustom: (next: CustomPromptDoc[]) => void;
}) {
  const customDocs = draft.customPrompts ?? [];
  const isCustomKey = promptDoc.startsWith('custom:');
  const isCoreKey = PROMPT_DOCS.some((d) => d.key === promptDoc);
  const customId = isCustomKey ? promptDoc.slice('custom:'.length) : '';
  const customDoc = isCustomKey ? customDocs.find((d) => d.id === customId) ?? null : null;
  const coreMeta = isCoreKey ? PROMPT_DOCS.find((d) => d.key === promptDoc)! : null;

  const [addOpen, setAddOpen] = useState(false);
  const [draftFile, setDraftFile] = useState('');
  const [draftLabel, setDraftLabel] = useState('');
  const [draftDescription, setDraftDescription] = useState('');
  const [metaOpen, setMetaOpen] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const saveTimer = useRef<number | null>(null);

  const content = coreMeta ? draft.prompts[coreMeta.key] : customDoc?.content ?? '';
  const currentLabel = coreMeta?.label ?? customDoc?.label ?? '';
  const currentFile = coreMeta?.file ?? customDoc?.file ?? '';
  const currentDescription = coreMeta?.description ?? customDoc?.description ?? '';
  const chars = content.length;
  const lines = content.split('\n').length;
  const totalDocs = PROMPT_DOCS.length + customDocs.length;
  const totalChars = useMemo(() => {
    const coreSum = PROMPT_DOCS.reduce((sum, d) => sum + (draft.prompts[d.key]?.length ?? 0), 0);
    const customSum = customDocs.reduce((sum, d) => sum + (d.content?.length ?? 0), 0);
    return coreSum + customSum;
  }, [draft.prompts, customDocs]);

  // 全局初始 prompt(用于"是否已修改"判定)
  const initialPrompts = useMemo(() => buildPrompts(draft.name, draft.category, draft.owner), [draft.name, draft.category, draft.owner]);
  const dirtyCount = PROMPT_DOCS.filter((d) => draft.prompts[d.key] !== initialPrompts[d.key]).length;

  // 文档目标长度进度
  const target = coreMeta?.targetChars ?? null;
  const ratio = target ? chars / target : 0;
  const limitTone = !target
    ? 'muted'
    : ratio <= DOCUMENT_TARGET_LIMITS.soft
      ? 'success'
      : ratio <= DOCUMENT_TARGET_LIMITS.warn
        ? 'warn'
        : ratio <= DOCUMENT_TARGET_LIMITS.danger
          ? 'warning'
          : 'danger';

  // 自动暂存指示器:每次内容变化 → 600ms 后设 savedAt
  useEffect(() => {
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => setSavedAt(new Date()), 600);
    return () => {
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
    };
  }, [content]);

  const handleCopy = async () => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(content);
      }
    } catch {
      // 静默失败,演示场景无需提示
    }
  };

  const handleDownload = () => {
    if (typeof window === 'undefined') return;
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = currentFile.endsWith('.md') ? currentFile : `${currentFile}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleReset = () => {
    if (!coreMeta) return;
    onChange({ [coreMeta.key]: initialPrompts[coreMeta.key] } as Partial<PromptDocs>);
  };

  const handleAddCustom = () => {
    const file = draftFile.trim();
    const label = (draftLabel.trim() || file.replace(/\.md$/i, '')).trim();
    if (!file) return;
    const id = `cdoc-${Date.now().toString(36)}`;
    const next: CustomPromptDoc = {
      id,
      file: file.endsWith('.md') ? file : `${file}.md`,
      label: label || file,
      description: draftDescription.trim() || '自定义文档',
      content: `# ${label || file}\n\n在这里书写 Markdown 内容,支持自定义协议。`,
    };
    onChangeCustom([...customDocs, next]);
    setAddOpen(false);
    setDraftFile('');
    setDraftLabel('');
    setDraftDescription('');
    setPromptDoc(`custom:${id}`);
    setMetaOpen(false);
  };

  const handleDeleteCustom = (id: string) => {
    const next = customDocs.filter((d) => d.id !== id);
    onChangeCustom(next);
    if (promptDoc === `custom:${id}`) setPromptDoc('prompt');
    if (customDoc?.id === id) setMetaOpen(false);
  };

  const handleEditCore = (next: string) => {
    if (!coreMeta) return;
    onChange({ [coreMeta.key]: next } as Partial<PromptDocs>);
  };
  const handleEditCustom = (next: string) => {
    if (!customDoc) return;
    onChangeCustom(customDocs.map((d) => d.id === customDoc.id ? { ...d, content: next } : d));
  };

  const handleRenameCustom = (patch: Partial<Pick<CustomPromptDoc, 'label' | 'description'>>) => {
    if (!customDoc) return;
    onChangeCustom(customDocs.map((d) => d.id === customDoc.id ? { ...d, ...patch } : d));
  };

  const handleInsertSnippet = (body: string) => {
    if (coreMeta) {
      const sep = content.endsWith('\n') || content.length === 0 ? '' : '\n';
      handleEditCore(`${content}${sep}${body}`);
    } else if (customDoc) {
      const sep = content.endsWith('\n') || content.length === 0 ? '' : '\n';
      handleEditCustom(`${content}${sep}${body}`);
    }
  };

  const snippets = coreMeta ? PROMPT_SNIPPETS[coreMeta.key] ?? [] : [];

  return (
    <div className="space-y-4">
      {/* Hero 概览 */}
      <section className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-5">
        <header className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--brand)]">提示词工作区</p>
            <h3 className="mt-1 text-sm font-semibold">智能体运行时由 {totalDocs} 份文档组成 · 共 {totalChars.toLocaleString()} 字</h3>
          </div>
          <div className="text-right text-[10px] text-[var(--text-muted)]">
            {savedAt ? <span className="inline-flex items-center gap-1"><Save className="h-3 w-3" />已自动暂存 · {savedAt.toLocaleTimeString('zh-Hans-CN', { hour: '2-digit', minute: '2-digit' })}</span> : '尚未编辑'}
          </div>
        </header>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <HeroStat label="核心文档" value={`${PROMPT_DOCS.length}`} hint="PROMPT/SOUL/AGENTS/USER/TOOLS" />
          <HeroStat label="自定义文档" value={`${customDocs.length}`} hint="团队自有协议" />
          <HeroStat label="已修改" value={`${dirtyCount}`} hint="相对默认模板" tone={dirtyCount > 0 ? 'warn' : 'muted'} />
          <HeroStat label="总字符" value={totalChars.toLocaleString()} hint="跨所有文档" />
        </div>
      </section>

      {/* Tab 行 */}
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-1.5">
        {PROMPT_DOCS.map((item) => {
          const active = item.key === promptDoc;
          const isDirty = draft.prompts[item.key] !== initialPrompts[item.key];
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => setPromptDoc(item.key)}
              aria-pressed={active}
              className={`relative inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${active ? 'bg-[var(--brand-light)] text-[var(--brand)]' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'}`}
            >
              <FileText className="h-3.5 w-3.5" />
              {item.file}
              {isDirty && <span className="absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full bg-[var(--danger)]" aria-label="已修改" />}
            </button>
          );
        })}
        {customDocs.map((item) => {
          const active = `custom:${item.id}` === promptDoc;
          return (
            <div
              key={item.id}
              className={`group relative inline-flex items-center gap-1 rounded-lg transition ${active ? 'bg-[var(--brand-light)] text-[var(--brand)]' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'}`}
            >
              <button
                type="button"
                onClick={() => setPromptDoc(`custom:${item.id}`)}
                aria-pressed={active}
                className="inline-flex items-center gap-2 rounded-lg px-3 py-1.5 pl-3 text-xs font-semibold"
              >
                <FileText className="h-3.5 w-3.5" />
                {item.file}
              </button>
              <button
                type="button"
                onClick={(event) => { event.stopPropagation(); handleDeleteCustom(item.id); }}
                aria-label={`删除 ${item.file}`}
                title={`删除 ${item.file}`}
                className="mr-1 grid h-5 w-5 place-items-center rounded text-[var(--text-muted)] opacity-0 transition hover:bg-[var(--danger-bg)] hover:text-[var(--danger)] group-hover:opacity-100"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          );
        })}
        <button
          type="button"
          onClick={() => setAddOpen((v) => !v)}
          aria-expanded={addOpen}
          aria-label="添加自定义 Markdown 文档"
          className="inline-flex items-center gap-1 rounded-lg border border-dashed border-[var(--border)] px-2.5 py-1.5 text-[11px] font-semibold text-[var(--text-secondary)] hover:border-[var(--brand)] hover:text-[var(--brand)]"
        >
          <Plus className="h-3 w-3" />添加自定义文档
        </button>
      </div>

      {/* 新建自定义文档 */}
      {addOpen && (
        <div className="rounded-2xl border border-[var(--brand)] bg-[var(--brand-light)]/40 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--brand)]">新建自定义文档</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <label className="block">
              <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">文件名</span>
              <input
                type="text"
                value={draftFile}
                onChange={(event) => setDraftFile(event.target.value)}
                placeholder="FAQ.md"
                className="mt-1 h-8 w-full rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] px-2 font-mono text-xs outline-none focus:border-[var(--brand)]"
              />
            </label>
            <label className="block">
              <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">标签(可选)</span>
              <input
                type="text"
                value={draftLabel}
                onChange={(event) => setDraftLabel(event.target.value)}
                placeholder="FAQ"
                className="mt-1 h-8 w-full rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] px-2 text-xs outline-none focus:border-[var(--brand)]"
              />
            </label>
            <label className="block">
              <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">说明(可选)</span>
              <input
                type="text"
                value={draftDescription}
                onChange={(event) => setDraftDescription(event.target.value)}
                placeholder="高频问答与标准回复"
                className="mt-1 h-8 w-full rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] px-2 text-xs outline-none focus:border-[var(--brand)]"
              />
            </label>
          </div>
          <div className="mt-3 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => { setAddOpen(false); setDraftFile(''); setDraftLabel(''); setDraftDescription(''); }}
              className="rounded-lg border border-[var(--border)] bg-[var(--surface-1)] px-3 py-1.5 text-[11px] font-semibold hover:border-[var(--brand)]"
            >
              取消
            </button>
            <button
              type="button"
              onClick={handleAddCustom}
              disabled={!draftFile.trim()}
              className="inline-flex items-center gap-1 rounded-lg bg-[var(--brand)] px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-[var(--brand-hover)] disabled:opacity-50"
            >
              <Plus className="h-3 w-3" />创建并打开
            </button>
          </div>
        </div>
      )}

      {/* 当前文档元信息 + 工具栏 */}
      <section className="flex flex-wrap items-start justify-between gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="text-sm font-semibold">{currentLabel}</h4>
            <span className="rounded-md bg-[var(--bg-elevated)] px-2 py-0.5 font-mono text-[11px] text-[var(--text-muted)]">{currentFile}</span>
            {target && (
              <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${limitTone === 'success' ? 'bg-[var(--success-bg)] text-[var(--success)]' : limitTone === 'warn' ? 'bg-[var(--warning-bg)] text-[var(--warning)]' : limitTone === 'danger' ? 'bg-[var(--danger-bg)] text-[var(--danger)]' : 'bg-[var(--bg-elevated)] text-[var(--text-muted)]'}`}>
                <Hash className="h-3 w-3" />{chars.toLocaleString()} / {target.toLocaleString()} 字
              </span>
            )}
          </div>
          <p className="mt-1 text-[11px] text-[var(--text-muted)]">{currentDescription}</p>
          {target && (
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[var(--bg-elevated)]">
              <div
                className={`h-full rounded-full transition-all ${limitTone === 'success' ? 'bg-[var(--success)]' : limitTone === 'warn' ? 'bg-[var(--warning)]' : 'bg-[var(--danger)]'}`}
                style={{ width: `${Math.min(100, ratio * 100)}%` }}
                aria-hidden="true"
              />
            </div>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setMetaOpen((v) => !v)}
            aria-expanded={metaOpen}
            disabled={!customDoc}
            title={customDoc ? '编辑文档元信息' : '核心文档元信息不可编辑'}
            className="inline-flex items-center gap-1 rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] px-2.5 py-1 text-[11px] font-semibold hover:border-[var(--brand)] disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Edit3 className="h-3 w-3" />元信息
          </button>
          <button
            type="button"
            onClick={handleReset}
            disabled={!coreMeta}
            className="inline-flex items-center gap-1 rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] px-2.5 py-1 text-[11px] font-semibold hover:border-[var(--brand)] disabled:cursor-not-allowed disabled:opacity-40"
          >
            <RotateCcw className="h-3 w-3" />重置为模板
          </button>
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-1 rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] px-2.5 py-1 text-[11px] font-semibold hover:border-[var(--brand)]"
          >
            <Copy className="h-3 w-3" />复制全文
          </button>
          <button
            type="button"
            onClick={handleDownload}
            className="inline-flex items-center gap-1 rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] px-2.5 py-1 text-[11px] font-semibold hover:border-[var(--brand)]"
          >
            <Download className="h-3 w-3" />导出文件
          </button>
        </div>
      </section>

      {/* 自定义文档元信息编辑器 */}
      {customDoc && metaOpen && (
        <div className="rounded-2xl border border-[var(--brand)] bg-[var(--brand-light)]/40 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--brand)]">自定义文档 · 元信息</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">显示名称</span>
              <input
                type="text"
                value={customDoc.label}
                onChange={(event) => handleRenameCustom({ label: event.target.value })}
                className="mt-1 h-8 w-full rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] px-2 text-xs outline-none focus:border-[var(--brand)]"
              />
            </label>
            <label className="block">
              <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">说明</span>
              <input
                type="text"
                value={customDoc.description}
                onChange={(event) => handleRenameCustom({ description: event.target.value })}
                className="mt-1 h-8 w-full rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] px-2 text-xs outline-none focus:border-[var(--brand)]"
              />
            </label>
          </div>
          <p className="mt-2 text-[10px] text-[var(--text-muted)]">文件名 (ID) 由创建时确定,不能在此修改;如需更名,请删除后重建。</p>
        </div>
      )}

      {/* 工作区:左侧 (片段 + 提示) + 右侧 (源码/预览) */}
      <section className="grid gap-4 xl:grid-cols-[220px_minmax(0,1fr)]">
        {/* 侧栏:片段 + 运行建议 */}
        <aside className="space-y-3">
          {snippets.length > 0 && (
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-3">
              <p className="mb-2 inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
                <Sparkles className="h-3 w-3" />插入模板片段
              </p>
              <div className="flex flex-col gap-1.5">
                {snippets.map((s) => (
                  <button
                    key={s.name}
                    type="button"
                    onClick={() => handleInsertSnippet(s.body)}
                    className="rounded-md border border-dashed border-[var(--border)] bg-[var(--bg-elevated)] px-2 py-1.5 text-left text-[11px] font-semibold text-[var(--text-secondary)] transition hover:border-[var(--brand)] hover:text-[var(--brand)]"
                  >
                    + {s.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-3">
            <p className="mb-2 inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">
              <History className="h-3 w-3" />运行建议
            </p>
            <ul className="space-y-1 text-[11px] text-[var(--text-secondary)]">
              <li className="flex gap-1.5"><CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-[var(--success)]" />先写「任务目标」与「输出约束」</li>
              <li className="flex gap-1.5"><CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-[var(--success)]" />段落用 H2,便于版式统一</li>
              <li className="flex gap-1.5"><AlertTriangle className="mt-0.5 h-3 w-3 shrink-0 text-[var(--warning)]" />字符超过目标 1.4 倍会触发风险告警</li>
              <li className="flex gap-1.5"><CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-[var(--success)]" />完成后在「版本」面板提交审核</li>
            </ul>
          </div>
        </aside>

        {/* 主区:源码 + 预览 */}
        <div>
          <div className="grid gap-3 lg:grid-cols-2">
            <div className="flex flex-col">
              <div className="flex items-center justify-between rounded-t-xl border border-b-0 border-[var(--border-strong)] bg-[var(--bg-elevated)] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">
                <span>Markdown 源码</span>
                <span className="font-mono normal-case tracking-normal text-[var(--text-muted)]">{chars.toLocaleString()} 字 · {lines} 行</span>
              </div>
              <textarea
                data-prompt-editor
                value={content}
                onChange={(event) => (coreMeta ? handleEditCore(event.target.value) : handleEditCustom(event.target.value))}
                rows={20}
                spellCheck={false}
                placeholder={coreMeta?.placeholder ?? '在此书写 Markdown 内容'}
                aria-label={`${currentLabel} Markdown 源码`}
                className="min-h-[460px] w-full flex-1 resize-y rounded-b-xl border border-[var(--border-strong)] bg-[var(--bg-elevated)] p-3 font-mono text-xs leading-6 outline-none focus:border-[var(--brand)]"
              />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center justify-between rounded-t-xl border border-b-0 border-[var(--border-strong)] bg-[var(--surface-1)] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">
                <span>实时预览</span>
                <span className="font-mono normal-case tracking-normal text-[var(--text-muted)]">{currentLabel}</span>
              </div>
              <div className="min-h-[460px] flex-1 overflow-auto rounded-b-xl border border-[var(--border-strong)] bg-[var(--surface-1)] p-4">
                <MarkdownView source={content} />
              </div>
            </div>
          </div>
          <p className="mt-3 text-[10px] text-[var(--text-muted)]">支持 Markdown 语法 · 保存后随下次版本发布生效。</p>
        </div>
      </section>
    </div>
  );
}

function HeroStat({ label, value, hint, tone = 'default' }: { label: string; value: string; hint?: string; tone?: 'default' | 'warn' | 'muted' }) {
  const valueClass = tone === 'warn' ? 'text-[var(--warning)]' : tone === 'muted' ? 'text-[var(--text-muted)]' : 'text-[var(--text)]';
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-1)] px-3 py-2.5">
      <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--text-muted)]">{label}</p>
      <p className={`mt-1 text-xl font-semibold tabular-nums ${valueClass}`}>{value}</p>
      {hint && <p className="mt-0.5 text-[10px] text-[var(--text-muted)]">{hint}</p>}
    </div>
  );
}

export function DrawerPanelKnowledge({ draft, onChange }: { draft: AgentEntry; onChange: (refs: KnowledgeRef[]) => void }) {
  const toggle = (id: string) => {
    onChange(draft.knowledgeRefs.map((ref) => ref.id === id ? { ...ref, enabled: !ref.enabled } : ref));
  };
  const enabledCount = draft.knowledgeRefs.filter((ref) => ref.enabled).length;
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-4">
        <div>
          <p className="text-xs font-semibold">已启用 {enabledCount} / {draft.knowledgeRefs.length} 个知识库</p>
          <p className="mt-0.5 text-[11px] text-[var(--text-muted)]">智能体只在引用范围内检索,变更后随下次版本发布生效。</p>
        </div>
        <FolderTree className="h-5 w-5 text-[var(--brand)]" />
      </div>
      <div className="space-y-2">
        {draft.knowledgeRefs.map((ref) => (
          <label key={ref.id} className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition ${ref.enabled ? 'border-[var(--brand)] bg-[var(--brand-light)]/40' : 'border-[var(--border)] bg-[var(--surface-1)]'}`}>
            <input
              type="checkbox"
              checked={ref.enabled}
              onChange={() => toggle(ref.id)}
              className="mt-0.5 h-4 w-4 accent-[var(--brand)]"
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold">{ref.name}</p>
                <span className="rounded-full bg-[var(--bg-elevated)] px-2 py-0.5 text-[10px] text-[var(--text-muted)]">{ref.scope}</span>
              </div>
              <p className="mt-0.5 text-[11px] text-[var(--text-muted)]">{ref.id}</p>
            </div>
          </label>
        ))}
      </div>
      <button type="button" className="inline-flex items-center gap-1.5 rounded-xl border border-dashed border-[var(--border)] px-4 py-2 text-xs font-semibold text-[var(--text-muted)] hover:border-[var(--brand)] hover:text-[var(--brand)]">
        <Plus className="h-3.5 w-3.5" />从知识库目录添加
      </button>
    </div>
  );
}

export function DrawerPanelMemory({ draft, onChange }: { draft: AgentEntry; onChange: (policy: MemoryPolicy) => void }) {
  const policy = draft.memoryPolicy;
  const update = (patch: Partial<MemoryPolicy>) => onChange({ ...policy, ...patch });
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-4">
        <div>
          <p className="text-xs font-semibold">跨会话记忆</p>
          <p className="mt-0.5 text-[11px] text-[var(--text-muted)]">开启后,智能体可在指定范围内保留偏好与上下文。</p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={policy.enabled}
          onClick={() => update({ enabled: !policy.enabled })}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${policy.enabled ? 'bg-[var(--brand)]' : 'bg-[var(--bg-hover)]'}`}
        >
          <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${policy.enabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
        </button>
      </div>
      {policy.enabled && (
        <>
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">保留时长</label>
            <div className="mt-2 grid grid-cols-4 gap-2">
              {MEMORY_RETENTION_OPTIONS.map((days) => {
                const active = policy.retentionDays === days;
                return (
                  <button
                    key={days}
                    type="button"
                    onClick={() => update({ retentionDays: days })}
                    aria-pressed={active}
                    className={`rounded-xl border px-3 py-2 text-xs font-semibold transition ${active ? 'border-[var(--brand)] bg-[var(--brand-light)] text-[var(--brand)]' : 'border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--brand)] hover:text-[var(--brand)]'}`}
                  >
                    {days} 天
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">可见范围</label>
            <div className="mt-2 space-y-2">
              {MEMORY_SCOPE_OPTIONS.map((opt) => {
                const active = policy.scope === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => update({ scope: opt.value })}
                    aria-pressed={active}
                    className={`flex w-full items-start gap-3 rounded-xl border p-3 text-left transition ${active ? 'border-[var(--brand)] bg-[var(--brand-light)]/40' : 'border-[var(--border)] hover:border-[var(--brand)]'}`}
                  >
                    <span className={`mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full border ${active ? 'border-[var(--brand)] bg-[var(--brand)]' : 'border-[var(--border)]'}`}>
                      {active && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
                    </span>
                    <div>
                      <p className="text-xs font-semibold">{opt.label}</p>
                      <p className="mt-0.5 text-[11px] text-[var(--text-muted)]">{opt.description}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
          <div className="flex items-center justify-between rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-4">
            <div>
              <p className="text-xs font-semibold">自动总结</p>
              <p className="mt-0.5 text-[11px] text-[var(--text-muted)]">每次会话结束自动生成摘要,便于下次快速续接。</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={policy.autoSummarize}
              onClick={() => update({ autoSummarize: !policy.autoSummarize })}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${policy.autoSummarize ? 'bg-[var(--brand)]' : 'bg-[var(--bg-hover)]'}`}
            >
              <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${policy.autoSummarize ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export function DrawerPanelFlow({ draft, onChange }: { draft: AgentEntry; onChange: (refs: FlowRef[]) => void }) {
  const toggle = (id: string) => {
    onChange(draft.flowRefs.map((ref) => ref.id === id ? { ...ref, enabled: !ref.enabled } : ref));
  };
  const enabledCount = draft.flowRefs.filter((ref) => ref.enabled).length;
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-4">
        <div>
          <p className="text-xs font-semibold">已绑定 {enabledCount} / {draft.flowRefs.length} 个流程</p>
          <p className="mt-0.5 text-[11px] text-[var(--text-muted)]">智能体可作为触发器、节点或被调用的步骤参与这些流程。</p>
        </div>
        <Workflow className="h-5 w-5 text-[var(--brand)]" />
      </div>
      <div className="space-y-2">
        {draft.flowRefs.map((ref) => (
          <label key={ref.id} className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition ${ref.enabled ? 'border-[var(--brand)] bg-[var(--brand-light)]/40' : 'border-[var(--border)] bg-[var(--surface-1)]'}`}>
            <input
              type="checkbox"
              checked={ref.enabled}
              onChange={() => toggle(ref.id)}
              className="mt-0.5 h-4 w-4 accent-[var(--brand)]"
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold">{ref.name}</p>
                <span className="rounded-full bg-[var(--bg-elevated)] px-2 py-0.5 text-[10px] text-[var(--text-muted)]">{ref.trigger}</span>
              </div>
              <p className="mt-0.5 text-[11px] text-[var(--text-muted)]">{ref.id}</p>
            </div>
          </label>
        ))}
      </div>
      <button type="button" className="inline-flex items-center gap-1.5 rounded-xl border border-dashed border-[var(--border)] px-4 py-2 text-xs font-semibold text-[var(--text-muted)] hover:border-[var(--brand)] hover:text-[var(--brand)]">
        <Plus className="h-3.5 w-3.5" />从流程目录添加
      </button>
    </div>
  );
}
