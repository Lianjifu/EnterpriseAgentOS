/**
 * 管理侧「智能体详情」独立页面 — 路由 /admin/agents/:id
 *
 * 从原 AgentsPage 的内嵌 Drawer 抽出,作为独立路由页面,
 * 顶部返回按钮回到 /admin/agents。
 *
 * 内容复用 DrawerPanels 的 9 个子面板 + DrawerSidebar 导航,
 * 自身管理:面板切换、版本对比、评测进度。
 */
import { useMemo, useState } from 'react';
import { Navigate, useLocation, useParams, useSearchParams } from 'react-router-dom';
import { Bot, Edit3 } from 'lucide-react';
import type { AgentEntry, DrawerPanel, EvalCase, PromptKey, PromptDocs, KnowledgeRef, MemoryPolicy, FlowRef, CustomPromptDoc } from './schema';
import { useAgentVersions, useDiffVersions, useRunEval, useUpdateAgent } from './useAgents';
import { mockAgents } from './fixtures';
import { DiffDialog, type DiffPair } from './components/DiffDialog';
import {
  DrawerPanelBasic, DrawerPanelEvaluation, DrawerPanelFlow, DrawerPanelKnowledge,
  DrawerPanelMemory, DrawerPanelPermission, DrawerPanelPrompt, DrawerPanelSkills, DrawerPanelVersions,
} from './components/DrawerPanels';
import { DrawerSidebar } from './components/DrawerSidebar';
import { EvalProgress } from './components/Primitives';
import { statusBadge, toneClass } from './components/constants';

const PANEL_KEYS: ReadonlyArray<DrawerPanel> = ['basic', 'prompt', 'skills', 'knowledge', 'memory', 'flow', 'versions', 'evaluation', 'permission'];

function NotFound() {
  return (
    <div className="mx-auto w-full max-w-[1440px] space-y-4 p-5 pb-16 sm:p-8 xl:px-6">
      <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface-1)] p-8 text-center">
        <p className="text-sm font-semibold">智能体不存在或已被删除</p>
        <p className="mt-1 text-xs text-[var(--text-muted)]">请返回列表重新选择。</p>
      </div>
    </div>
  );
}

export default function AgentDetailPage() {
  const { id = '' } = useParams<{ id: string }>();
  const location = useLocation();
  const [params, setSearchParams] = useSearchParams();
  const editing = params.get('edit') === '1';

  const agent = useMemo(() => mockAgents.find((a) => a.id === id) ?? null, [id]);

  const [panel, setPanel] = useState<DrawerPanel>('basic');
  const [promptDoc, setPromptDoc] = useState<string>('prompt');
  const [evalRunning, setEvalRunning] = useState<{ progress: number } | null>(null);
  const [lastEvalResult, setLastEvalResult] = useState<EvalCase[] | null>(null);
  const [diffOpen, setDiffOpen] = useState(false);
  const [diffPair, setDiffPair] = useState<DiffPair>({ base: { id: 'v3.1', label: 'v3.1' }, target: { id: 'v3.2', label: 'v3.2' } });
  const [diffBase, setDiffBase] = useState<Record<PromptKey, string>>({} as Record<PromptKey, string>);
  const [diffTarget, setDiffTarget] = useState<Record<PromptKey, string>>({} as Record<PromptKey, string>);

  const updateAgent = useUpdateAgent();
  const diffVersions = useDiffVersions();
  const runEval = useRunEval();
  // useAgentVersions used inside DrawerPanelVersions via prop pass; pre-warm cache here:
  useAgentVersions(agent?.id ?? '');

  const handleOpenDiff = async () => {
    if (!agent) return;
    const versions = agent.versions;
    if (versions.length < 2) return;
    const previous = versions.find((v) => !v.current) ?? versions[versions.length - 1];
    const current = versions.find((v) => v.current) ?? versions[0];
    const resp = await diffVersions.mutateAsync({
      agentId: agent.id,
      leftVersion: previous.version,
      rightVersion: current.version,
    });
    setDiffPair({ base: { id: previous.version, label: previous.version }, target: { id: current.version, label: current.version } });
    setDiffBase(resp.leftPrompts);
    setDiffTarget(resp.rightPrompts);
    setDiffOpen(true);
  };

  const handleRunEval = async () => {
    if (!agent) return;
    setEvalRunning({ progress: 0 });
    const timer = window.setInterval(() => {
      setEvalRunning((prev) => prev ? { progress: Math.min(prev.progress + 12, 96) } : null);
    }, 220);
    const resp = await runEval.mutateAsync({ id: agent.id });
    window.clearInterval(timer);
    setEvalRunning(null);
    setLastEvalResult(resp.cases);
  };

  if (location.pathname.endsWith('/edit')) {
    return <Navigate to={`/admin/agents/${id}?edit=1`} replace />;
  }

  if (!agent) return <NotFound />;

  const renderPanel = () => {
    const onChangeBasic = (patch: Partial<AgentEntry>) => updateAgent.mutate({ id: agent.id, patch });
    const onChangePrompts = (patch: Partial<PromptDocs>) => updateAgent.mutate({ id: agent.id, patch: { prompts: { ...agent.prompts, ...patch } } });
    const onChangeCustomPrompts = (next: CustomPromptDoc[]) => updateAgent.mutate({ id: agent.id, patch: { customPrompts: next } });
    const onChangeKnowledge = (refs: KnowledgeRef[]) => updateAgent.mutate({ id: agent.id, patch: { knowledgeRefs: refs } });
    const onChangeMemory = (memoryPolicy: MemoryPolicy) => updateAgent.mutate({ id: agent.id, patch: { memoryPolicy } });
    const onChangeFlow = (flowRefs: FlowRef[]) => updateAgent.mutate({ id: agent.id, patch: { flowRefs } });

    switch (panel) {
      case 'basic': return <DrawerPanelBasic draft={agent} onChange={onChangeBasic} />;
      case 'prompt': return <DrawerPanelPrompt draft={agent} promptDoc={promptDoc} setPromptDoc={setPromptDoc} onChange={onChangePrompts} onChangeCustom={onChangeCustomPrompts} />;
      case 'skills': return <DrawerPanelSkills draft={agent} onChange={onChangeBasic} />;
      case 'knowledge': return <DrawerPanelKnowledge draft={agent} onChange={onChangeKnowledge} />;
      case 'memory': return <DrawerPanelMemory draft={agent} onChange={onChangeMemory} />;
      case 'flow': return <DrawerPanelFlow draft={agent} onChange={onChangeFlow} />;
      case 'versions': return <DrawerPanelVersions draft={agent} onOpenDiff={handleOpenDiff} />;
      case 'evaluation':
        return (
          <DrawerPanelEvaluation
            draft={agent}
            isRunning={!!evalRunning}
            progress={evalRunning?.progress}
            lastResult={lastEvalResult ?? undefined}
            onRunEval={handleRunEval}
          />
        );
      case 'permission': return <DrawerPanelPermission draft={agent} />;
      default: return null;
    }
  };

  return (
    <div className="mx-auto w-full max-w-[1440px] space-y-4 p-5 pb-16 sm:p-8 xl:px-6">
      <section className="flex min-h-[480px] flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] lg:flex-row">
        <DrawerSidebar panel={panel} setPanel={(p) => setPanel(p)} />
        <main className="min-w-0 flex-1 overflow-auto bg-[var(--bg-app)] p-5">
          <div className="mb-5 flex items-center justify-between gap-3 border-b border-[var(--border)] pb-4">
            <div className="flex min-w-0 items-center gap-3">
              <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${toneClass[agent.tone]}`}>
                <Bot className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-sm font-semibold">{agent.name}</h2>
                  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${statusBadge[agent.status].className}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${statusBadge[agent.status].dot}`} />
                    {statusBadge[agent.status].label}
                  </span>
                  <span className="rounded-md bg-[var(--bg-elevated)] px-2 py-0.5 font-mono text-[11px] text-[var(--text-muted)]">{agent.version}</span>
                </div>
                <p className="mt-0.5 text-[11px] text-[var(--text-muted)]">{agent.category} · {agent.owner}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                if (editing) {
                  const next = new URLSearchParams(params);
                  next.delete('edit');
                  setSearchParams(next, { replace: true });
                  return;
                }
                setSearchParams({ edit: '1' });
              }}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-[var(--brand)] bg-[var(--surface-1)] px-3 py-1.5 text-sm font-semibold text-[var(--brand)] hover:bg-[var(--brand-light)]"
            >
              <Edit3 className="h-3.5 w-3.5" />{editing ? '完成' : '编辑'}
            </button>
          </div>
          <div className={editing ? undefined : '[&_button:not([data-view])]:pointer-events-none [&_input]:pointer-events-none [&_select]:pointer-events-none [&_textarea]:pointer-events-none [&_[role=switch]]:pointer-events-none'}>
            {renderPanel()}
          </div>
        </main>
      </section>

      {/* 页脚 */}
      <footer className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-[var(--text-muted)]">
        <span>{editing ? '变更后自动暂存,可在「版本」面板提交审核。' : '当前为只读查看。'}</span>
        <span>{agent.versions.length} 个版本 · 最近更新 {agent.lastUpdate}</span>
      </footer>

      {/* 评测进度 */}
      {evalRunning && (
        <div className="fixed bottom-6 right-6 z-40 w-72 rounded-2xl border border-[var(--brand)] bg-[var(--surface-1)] p-4 shadow-lg">
          <div className="flex items-center gap-2 text-xs font-semibold text-[var(--brand)]">
            正在评测 {agent.name}
          </div>
          <EvalProgress progress={evalRunning.progress} />
        </div>
      )}

      {/* 版本对比 */}
      <DiffDialog
        open={diffOpen}
        onClose={() => setDiffOpen(false)}
        pair={diffPair}
        baseContent={diffBase}
        targetContent={diffTarget}
        onChangePair={setDiffPair}
      />
    </div>
  );
}