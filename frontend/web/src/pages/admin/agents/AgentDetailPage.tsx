/**
 * 管理侧「智能体详情」独立页面 — 路由 /admin/agents/:id
 *
 * 从原 AgentsPage 的内嵌 Drawer 抽出,作为独立路由页面,
 * 顶部返回按钮回到 /admin/agents。
 *
 * 内容复用 DrawerPanels 的 9 个子面板 + DrawerSidebar 导航,
 * 自身管理:面板切换、版本对比、沉浸式、评测进度。
 */
import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Bot, Maximize2, X } from 'lucide-react';
import type { AgentEntry, DrawerPanel, EvalCase, PromptKey, PromptDocs, KnowledgeRef, MemoryPolicy, FlowRef } from '@/api/admin/agents/schema';
import { useAgentVersions, useDiffVersions, useRunEval, useUpdateAgent } from '@/api/admin/agents';
import { mockAgents } from '@/mock/admin/agents.fixtures';
import { DiffDialog, type DiffPair } from './components/DiffDialog';
import {
  DrawerPanelBasic, DrawerPanelEvaluation, DrawerPanelFlow, DrawerPanelKnowledge,
  DrawerPanelMemory, DrawerPanelPermission, DrawerPanelPrompt, DrawerPanelSkills, DrawerPanelVersions,
} from './components/DrawerPanels';
import { DrawerSidebar } from './components/DrawerSidebar';
import { FullscreenWorkspace } from './components/FullscreenWorkspace';
import { EvalProgress } from './components/Primitives';
import { statusBadge, toneClass } from './components/constants';

const PANEL_KEYS: ReadonlyArray<DrawerPanel> = ['basic', 'prompt', 'skills', 'knowledge', 'memory', 'flow', 'versions', 'evaluation', 'permission'];

function NotFound() {
  return (
    <div className="mx-auto w-full max-w-[1440px] space-y-6 p-5 pb-16 sm:p-8 xl:px-6">
      <Link to="/admin/agents" className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--text-muted)] hover:text-[var(--brand)]">
        <ArrowLeft className="h-3.5 w-3.5" />返回智能体管理
      </Link>
      <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface-1)] p-8 text-center">
        <p className="text-sm font-semibold">智能体不存在或已被删除</p>
        <p className="mt-1 text-xs text-[var(--text-muted)]">请返回列表重新选择。</p>
      </div>
    </div>
  );
}

export default function AgentDetailPage() {
  const { id = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const agent = useMemo(() => mockAgents.find((a) => a.id === id) ?? null, [id]);

  const [panel, setPanel] = useState<DrawerPanel>('basic');
  const [promptDoc, setPromptDoc] = useState<PromptKey>('prompt');
  const [fullscreen, setFullscreen] = useState(false);
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

  if (!agent) return <NotFound />;

  const renderPanel = () => {
    const onChangeBasic = (patch: Partial<AgentEntry>) => updateAgent.mutate({ id: agent.id, patch });
    const onChangePrompts = (patch: Partial<PromptDocs>) => updateAgent.mutate({ id: agent.id, patch: { prompts: { ...agent.prompts, ...patch } } });
    const onChangeKnowledge = (refs: KnowledgeRef[]) => updateAgent.mutate({ id: agent.id, patch: { knowledgeRefs: refs } });
    const onChangeMemory = (memoryPolicy: MemoryPolicy) => updateAgent.mutate({ id: agent.id, patch: { memoryPolicy } });
    const onChangeFlow = (flowRefs: FlowRef[]) => updateAgent.mutate({ id: agent.id, patch: { flowRefs } });

    switch (panel) {
      case 'basic': return <DrawerPanelBasic draft={agent} onChange={onChangeBasic} />;
      case 'prompt': return <DrawerPanelPrompt draft={agent} promptDoc={promptDoc} setPromptDoc={setPromptDoc} onChange={onChangePrompts} />;
      case 'skills': return <DrawerPanelSkills draft={agent} />;
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
      {/* 返回导航 + 头部 */}
      <div className="flex flex-col gap-3">
        <button
          type="button"
          onClick={() => navigate('/admin/agents')}
          className="inline-flex w-fit items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium text-[var(--text-muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--brand)]"
        >
          <ArrowLeft className="h-3.5 w-3.5" />返回智能体管理
        </button>
        <header className="flex flex-wrap items-start justify-between gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] px-5 py-4">
          <div className="flex items-start gap-3">
            <span className={`grid h-12 w-12 place-items-center rounded-xl ${toneClass[agent.tone]}`}>
              <Bot className="h-6 w-6" />
            </span>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-lg font-semibold tracking-tight">{agent.name}</h1>
                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${statusBadge[agent.status].className}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${statusBadge[agent.status].dot}`} />
                  {statusBadge[agent.status].label}
                </span>
              </div>
              <p className="mt-0.5 text-[11px] text-[var(--text-muted)]">{agent.category} · {agent.owner} · {agent.version}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setFullscreen(true)}
              className="inline-flex items-center gap-1 rounded-lg border border-[var(--border)] px-2.5 py-1.5 text-[11px] font-semibold hover:border-[var(--brand)]"
            >
              <Maximize2 className="h-3 w-3" />沉浸式
            </button>
          </div>
        </header>
      </div>

      {/* 工作区:左侧导航 + 右侧面板 */}
      <section className="flex min-h-[480px] overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface-1)]">
        <DrawerSidebar panel={panel} setPanel={(p) => setPanel(p)} />
        <main className="min-w-0 flex-1 overflow-auto bg-[var(--bg-app)] p-5">
          {renderPanel()}
        </main>
      </section>

      {/* 页脚 */}
      <footer className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-[var(--text-muted)]">
        <span>变更后自动暂存,可在「版本」面板提交审核。</span>
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

      {/* 沉浸式工作区 */}
      {fullscreen && (
        <FullscreenWorkspace
          agent={agent}
          panel={panel}
          setPanel={setPanel}
          onExit={() => setFullscreen(false)}
        />
      )}
    </div>
  );
}