/**
 * FlowNodeView — ReactFlow 自定义节点渲染器,根据 NodeKind 上色。
 */
import { Handle, Position, type NodeProps } from 'reactflow';
import { NODE_TONE_CLASS, nodeKindIcon } from './constants';
import type { FlowNodeData } from '@/api/admin/workflows/schema';

export function FlowNodeView({ data, selected }: NodeProps<FlowNodeData>) {
  const tone = NODE_TONE_CLASS[data.kind];
  const Icon = nodeKindIcon(data.kind);
  return (
    <div className={`workflow-node min-w-[180px] rounded-xl border-2 px-3 py-2 shadow-sm transition ${tone.wrap} ${selected ? 'ring-2 ring-offset-2 ring-[var(--brand)]' : ''}`}>
      <Handle type="target" position={Position.Left} className={`!h-3 !w-3 ${tone.handle}`} />
      <div className="flex items-center gap-2">
        <span className={`grid h-6 w-6 place-items-center rounded-md bg-white/70 ${tone.text}`}>
          <Icon className="h-3.5 w-3.5" />
        </span>
        <div className="min-w-0">
          <p className={`workflow-node__label font-semibold ${tone.text}`}>{data.label}</p>
          <p className={`workflow-node__note ${tone.sub}`}>{data.subtitle}</p>
        </div>
      </div>
      <Handle type="source" position={Position.Right} className={`!h-3 !w-3 ${tone.handle}`} />
    </div>
  );
}

export const NODE_TYPES = { flowNode: FlowNodeView };