/**
 * FlowEditor — 工作流编辑器(三栏布局:节点模板 + ReactFlow 画布 + 属性面板)。
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import ReactFlow, {
  Background as RFBackground,
  Controls as RFControls,
  MiniMap,
  addEdge,
  useEdgesState,
  useNodesState,
  type Connection,
  type Edge,
  type Node,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { ArrowRight, History, Rocket, Save, Settings, Trash2 } from 'lucide-react';
import type { Flow, FlowNodeData, NodeKind } from '@/api/admin/workflows/schema';
import { NODE_KIND_LABEL, NODE_TEMPLATES, STATUS_BADGE, nodeKindIcon, uid } from './constants';
import { NODE_TYPES } from './FlowNodeView';

interface FlowEditorProps {
  flow: Flow;
  selectedNodeId: string | null;
  setSelectedNodeId: (id: string | null) => void;
  setFlows: React.Dispatch<React.SetStateAction<Flow[]>>;
  onOpenNodeConfig: (n: Node<FlowNodeData>) => void;
  onPublish: () => void;
  onVersions: () => void;
  onBack: () => void;
  setNotice: (s: string) => void;
  readOnly?: boolean;
}

export function FlowEditor({ flow, selectedNodeId, setSelectedNodeId, setFlows, onOpenNodeConfig, onPublish, onVersions, onBack, setNotice, readOnly = false }: FlowEditorProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState(flow.initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(flow.initialEdges);
  const [nameEdit, setNameEdit] = useState(flow.name);

  useEffect(() => {
    setNodes(flow.initialNodes);
    setEdges(flow.initialEdges);
    setNameEdit(flow.name);
  }, [flow.id, setEdges, setNodes]);

  const onConnect = useCallback((connection: Connection) => {
    setEdges((eds) => addEdge({ ...connection, type: 'smoothstep', animated: true }, eds));
  }, [setEdges]);

  const save = () => {
    setFlows((prev) => prev.map((f) => f.id === flow.id ? { ...f, initialNodes: nodes, initialEdges: edges, name: nameEdit, updatedAt: '刚刚' } : f));
    setNotice(`已保存工作流「${nameEdit}」,共 ${nodes.length} 个节点 / ${edges.length} 条连线。`);
  };

  const selectedNode = useMemo(() => nodes.find((n) => n.id === selectedNodeId) || null, [nodes, selectedNodeId]);

  const updateNodeData = (patch: Partial<FlowNodeData>) => {
    setNodes((nds) => nds.map((n) => n.id === selectedNodeId ? { ...n, data: { ...n.data, ...patch } } : n));
  };

  const updateNodeConfig = (key: string, value: string) => {
    setNodes((nds) => nds.map((n) => n.id === selectedNodeId ? {
      ...n, data: { ...n.data, config: { ...n.data.config, [key]: value } },
    } : n));
  };

  const deleteSelectedNode = () => {
    if (!selectedNodeId) return;
    setNodes((nds) => nds.filter((n) => n.id !== selectedNodeId));
    setEdges((eds) => eds.filter((e) => e.source !== selectedNodeId && e.target !== selectedNodeId));
    setSelectedNodeId(null);
    setNotice('已删除选中节点及关联连线。');
  };

  return (
    <div className="flex h-[calc(100vh-7rem)] min-h-[640px] flex-col gap-3">
      <section className="shrink-0 rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] px-4 py-2.5">
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={onBack} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface-1)] px-2.5 text-xs font-semibold text-[var(--text-secondary)] hover:border-[var(--brand)] hover:text-[var(--brand)]">
            <ArrowRight className="h-3.5 w-3.5 rotate-180" />返回
          </button>
          <input value={nameEdit} onChange={(e) => setNameEdit(e.target.value)} className="h-8 min-w-[160px] flex-1 rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] px-3 text-sm font-semibold outline-none focus:border-[var(--brand)]" />
          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${STATUS_BADGE[flow.status].className}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${STATUS_BADGE[flow.status].dot}`} />{STATUS_BADGE[flow.status].label}
          </span>
          <div className="ml-auto flex items-center gap-1.5">
            <button type="button" onClick={save} disabled={readOnly} className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-[var(--brand)] px-3 text-xs font-semibold text-white hover:bg-[var(--brand-hover)] disabled:cursor-not-allowed disabled:opacity-50">
              <Save className="h-3.5 w-3.5" />保存
            </button>
            <button type="button" onClick={onVersions} disabled={readOnly} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface-1)] px-2.5 text-xs font-semibold text-[var(--text-secondary)] hover:border-[var(--brand)] hover:text-[var(--brand)] disabled:cursor-not-allowed disabled:opacity-50">
              <History className="h-3.5 w-3.5" />版本
            </button>
            <button type="button" onClick={onPublish} disabled={readOnly || flow.status === 'published'} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50 px-2.5 text-xs font-semibold text-emerald-700 disabled:cursor-not-allowed disabled:opacity-50 hover:bg-emerald-100 dark:bg-emerald-500/15 dark:text-emerald-300">
              <Rocket className="h-3.5 w-3.5" />发布
            </button>
          </div>
        </div>
      </section>

      <section className="grid min-h-0 flex-1 gap-3 xl:grid-cols-[220px_minmax(0,1fr)_280px]">
        <aside className={`flex min-h-0 flex-col rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-4 ${readOnly ? 'pointer-events-none opacity-70' : ''}`}>
          <p className="text-xs font-semibold text-[var(--text-muted)]">节点类型</p>
          <p className="mt-1 text-[10px] text-[var(--text-muted)]">{readOnly ? '查看模式,不可加入画布' : '点击「加入画布」或拖到画布'}</p>
          <div className="mt-3 space-y-2 overflow-y-auto">
            {NODE_TEMPLATES.map((t) => {
              const Icon = nodeKindIcon(t.kind);
              return (
                <button key={t.kind} type="button" draggable={!readOnly} onDragStart={(e) => e.dataTransfer.setData('application/reactflow', t.kind)} disabled={readOnly} className="flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left text-xs font-semibold transition hover:border-[var(--brand)] disabled:cursor-not-allowed">
                  <span className={`grid h-6 w-6 place-items-center rounded-md bg-[var(--bg-elevated)]`}>
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="workflow-node__label">{t.label}</p>
                    <p className="workflow-node__note">{t.subtitle}</p>
                  </div>
                </button>
              );
            })}
          </div>
          <div className="mt-3 shrink-0 rounded-lg border border-dashed border-[var(--border-strong)] p-3 text-[10px] text-[var(--text-muted)]">
            <p>提示:{readOnly ? '查看模式不可编辑。点顶部「编辑」切换为编辑模式。' : '从节点左侧 / 右侧圆点拖动可连线。'}</p>
          </div>
        </aside>

        <div className="min-h-0 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface-1)]">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodesDraggable={!readOnly}
            nodesConnectable={!readOnly}
            elementsSelectable={!readOnly}
            onNodesChange={(changes) => {
              onNodesChange(changes);
              const sel = changes.find((c) => c.type === 'select');
              if (sel && 'id' in sel && sel.id) setSelectedNodeId(sel.selected ? sel.id : null);
            }}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            nodeTypes={NODE_TYPES}
            onDrop={(e) => {
              const kind = e.dataTransfer.getData('application/reactflow') as NodeKind;
              if (!kind || readOnly) return;
              const tpl = NODE_TEMPLATES.find((t) => t.kind === kind);
              if (!tpl) return;
              const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
              const id = uid('n');
              const node: Node<FlowNodeData> = {
                id, type: 'flowNode',
                position: { x: e.clientX - rect.left - 90, y: e.clientY - rect.top - 30 },
                data: { label: tpl.label, subtitle: tpl.subtitle, kind: tpl.kind, config: { ...tpl.defaults } },
              };
              setNodes((nds) => [...nds, node]);
            }}
            onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }}
            fitView
            proOptions={{ hideAttribution: true }}
          >
            <RFBackground gap={20} size={1} color="var(--border)" />
            <RFControls position="bottom-right" className="!bg-[var(--surface-1)] !border !border-[var(--border)] [&_button]:!bg-[var(--surface-1)] [&_button]:!border-[var(--border)] [&_button]:!text-[var(--text-secondary)] [&_button:hover]:!bg-[var(--bg-hover)]" />
            <MiniMap
              position="bottom-left"
              pannable
              zoomable
              nodeColor={() => 'var(--brand)'}
              maskColor="rgba(0,0,0,0.55)"
              style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}
            />
          </ReactFlow>
        </div>

        <aside className={`flex min-h-0 flex-col rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-4 ${readOnly && !selectedNode ? 'opacity-80' : ''}`}>
          <p className="text-xs font-semibold text-[var(--text-muted)]">{readOnly ? '节点信息' : '属性面板'}</p>
          {selectedNode ? (
            <div className="mt-3 flex-1 space-y-3 overflow-y-auto">
              <div className="rounded-lg bg-[var(--bg-elevated)] p-3">
                <p className="text-[10px] text-[var(--text-muted)]">{NODE_KIND_LABEL[selectedNode.data.kind]} · {selectedNode.data.subtitle}</p>
                <p className="mt-1 text-sm font-semibold">{selectedNode.data.label}</p>
              </div>
              <label className="block">
                <span className="text-[10px] text-[var(--text-muted)]">节点名称</span>
                <input value={selectedNode.data.label} disabled={readOnly} onChange={(e) => updateNodeData({ label: e.target.value })} className="mt-1 h-9 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-1)] px-2 outline-none focus:border-[var(--brand)] disabled:cursor-not-allowed disabled:opacity-70" />
              </label>
              <label className="block">
                <span className="text-[10px] text-[var(--text-muted)]">副标题</span>
                <input value={selectedNode.data.subtitle} disabled={readOnly} onChange={(e) => updateNodeData({ subtitle: e.target.value })} className="mt-1 h-9 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-1)] px-2 outline-none focus:border-[var(--brand)] disabled:cursor-not-allowed disabled:opacity-70" />
              </label>
              <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] p-3">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">配置</p>
                <div className="mt-2 space-y-2">
                  {Object.entries(selectedNode.data.config).map(([k, v]) => (
                    <label key={k} className="block">
                      <span className="text-[10px] text-[var(--text-muted)]">{k}</span>
                      <input value={v} disabled={readOnly} onChange={(e) => updateNodeConfig(k, e.target.value)} className="mt-1 h-8 w-full rounded-md border border-[var(--border)] bg-[var(--surface-1)] px-2 text-xs outline-none focus:border-[var(--brand)] disabled:cursor-not-allowed disabled:opacity-70" />
                    </label>
                  ))}
                </div>
                {!readOnly && (
                  <button type="button" onClick={() => onOpenNodeConfig(selectedNode)} className="mt-3 inline-flex items-center gap-1.5 rounded-md border border-[var(--border)] bg-[var(--surface-1)] px-2.5 py-1.5 text-[11px] font-semibold text-[var(--text-secondary)] hover:border-[var(--brand)] hover:text-[var(--brand)]">
                    <Settings className="h-3 w-3" />高级配置
                  </button>
                )}
              </div>
              {!readOnly && (
                <button type="button" onClick={deleteSelectedNode} className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100 dark:bg-rose-500/15 dark:text-rose-300">
                  <Trash2 className="h-3.5 w-3.5" />删除节点
                </button>
              )}
            </div>
          ) : (
            <div className="mt-3 rounded-lg border border-dashed border-[var(--border-strong)] p-6 text-center">
              <Settings className="mx-auto h-5 w-5 text-[var(--text-muted)]" />
              <p className="mt-2 text-xs font-semibold">未选中节点</p>
              <p className="mt-1 text-[10px] text-[var(--text-muted)]">{readOnly ? '查看模式下点选画布上的节点,可在右侧查看节点信息。' : '点选画布上的节点,在右侧编辑属性;从节点左侧 / 右侧圆点拖动可连线。'}</p>
            </div>
          )}
        </aside>
      </section>
    </div>
  );
}