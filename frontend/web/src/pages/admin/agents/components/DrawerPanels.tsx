/**
 * Drawer 9 个子面板 — basic / prompt / skills / knowledge / memory / flow / versions / evaluation / permission。
 */
import { Beaker, Brain, Copy, FileText, FolderTree, GitBranch, Layers, Play, Plus, RotateCcw, ShieldCheck, Sparkles, Workflow } from 'lucide-react';
import type { AgentEntry, KnowledgeRef, MemoryPolicy, FlowRef, PromptDocs, PromptKey, EvalCase } from '@/api/admin/agents/schema';
import { formatCalls, buildPrompts } from '@/mock/admin/agents.fixtures';
import { EvalProgress } from './Primitives';
import { MEMORY_RETENTION_OPTIONS, MEMORY_SCOPE_OPTIONS, PROMPT_DOCS, statusBadge } from './constants';

export function DrawerPanelBasic({ draft, onChange }: { draft: AgentEntry; onChange: (patch: Partial<AgentEntry>) => void }) {
  const update = (patch: Partial<AgentEntry>) => onChange(patch);
  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">名称</label>
          <input
            type="text"
            value={draft.name}
            onChange={(event) => update({ name: event.target.value })}
            className="mt-1.5 h-10 w-full rounded-xl border border-[var(--border-strong)] bg-[var(--bg-elevated)] px-3 text-sm outline-none focus:border-[var(--brand)]"
          />
        </div>
        <div>
          <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">场景分类</label>
          <input
            type="text"
            value={draft.category}
            onChange={(event) => update({ category: event.target.value })}
            className="mt-1.5 h-10 w-full rounded-xl border border-[var(--border-strong)] bg-[var(--bg-elevated)] px-3 text-sm outline-none focus:border-[var(--brand)]"
          />
        </div>
      </div>
      <div>
        <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">描述</label>
        <textarea
          value={draft.description}
          onChange={(event) => update({ description: event.target.value })}
          rows={3}
          className="mt-1.5 w-full rounded-xl border border-[var(--border-strong)] bg-[var(--bg-elevated)] px-3 py-2 text-sm outline-none focus:border-[var(--brand)]"
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">负责人</label>
          <input
            type="text"
            value={draft.owner}
            onChange={(event) => update({ owner: event.target.value })}
            className="mt-1.5 h-10 w-full rounded-xl border border-[var(--border-strong)] bg-[var(--bg-elevated)] px-3 text-sm outline-none focus:border-[var(--brand)]"
          />
        </div>
        <div>
          <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">版本号</label>
          <input
            type="text"
            value={draft.version}
            onChange={(event) => update({ version: event.target.value })}
            className="mt-1.5 h-10 w-full rounded-xl border border-[var(--border-strong)] bg-[var(--bg-elevated)] px-3 text-sm font-mono outline-none focus:border-[var(--brand)]"
          />
        </div>
      </div>
      <div>
        <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">可见范围</label>
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
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">当前状态</p>
        <div className="mt-3 flex flex-wrap items-center gap-4 text-xs">
          <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-1 font-semibold ${statusBadge[draft.status].className}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${statusBadge[draft.status].dot}`} aria-hidden="true" />
            {statusBadge[draft.status].label}
          </span>
          <span className="text-[var(--text-muted)]">· 最后更新 {draft.lastUpdate}</span>
          <span className="text-[var(--text-muted)]">· 调用 {formatCalls(draft.calls)}</span>
          <span className="text-[var(--text-muted)]">· 评分 {draft.rating > 0 ? draft.rating.toFixed(1) : '—'}</span>
        </div>
        <p className="mt-2 text-[10px] text-[var(--text-muted)]">状态由发布流程控制,不可在编辑器直接修改。</p>
      </div>
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
            className="inline-flex items-center gap-2 rounded-xl border border-[var(--brand)] bg-[var(--brand-light)] px-3 py-2 text-xs font-semibold text-[var(--brand)] hover:bg-white disabled:opacity-50"
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
  draft, promptDoc, setPromptDoc, onChange,
}: {
  draft: AgentEntry;
  promptDoc: PromptKey;
  setPromptDoc: (k: PromptKey) => void;
  onChange: (patch: Partial<PromptDocs>) => void;
}) {
  const currentDoc = PROMPT_DOCS.find((item) => item.key === promptDoc)!;
  const content = draft.prompts[promptDoc];
  const chars = content.length;
  const lines = content.split('\n').length;

  const handleCopy = async () => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(content);
      }
    } catch {
      // 静默失败,演示场景无需提示
    }
  };

  const handleReset = () => {
    const initial = buildPrompts(draft.name, draft.category, draft.owner);
    onChange({ [promptDoc]: initial[promptDoc] } as Partial<PromptDocs>);
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-4">
        <p className="text-xs text-[var(--text-secondary)]">智能体运行时使用的 5 份核心文档,变更后随下次版本发布生效。</p>
      </div>
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-1)] p-1.5">
        {PROMPT_DOCS.map((item) => {
          const active = item.key === promptDoc;
          const isDirty = draft.prompts[item.key] !== buildPrompts(draft.name, draft.category, draft.owner)[item.key];
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
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-[var(--text-muted)]">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleReset}
            className="inline-flex items-center gap-1 rounded-lg border border-[var(--border)] bg-[var(--surface-1)] px-2.5 py-1 text-[11px] font-semibold hover:border-[var(--brand)]"
          >
            <RotateCcw className="h-3 w-3" />重置为模板
          </button>
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-1 rounded-lg border border-[var(--border)] bg-[var(--surface-1)] px-2.5 py-1 text-[11px] font-semibold hover:border-[var(--brand)]"
          >
            <Copy className="h-3 w-3" />复制全文
          </button>
        </div>
        <div className="flex items-center gap-3">
          <span>{chars.toLocaleString()} 字 · {lines} 行</span>
          <span>· {currentDoc.label} 文件</span>
        </div>
      </div>
      <div>
        <p className="text-[10px] text-[var(--text-muted)]">{currentDoc.description}</p>
        <textarea
          value={content}
          onChange={(event) => onChange({ [promptDoc]: event.target.value } as Partial<PromptDocs>)}
          rows={16}
          spellCheck={false}
          className="mt-2 w-full rounded-xl border border-[var(--border-strong)] bg-[var(--bg-elevated)] p-3 font-mono text-xs leading-6 outline-none focus:border-[var(--brand)]"
        />
      </div>
      <p className="text-[10px] text-[var(--text-muted)]">支持 Markdown 语法 · 保存后随下次版本发布生效。</p>
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
