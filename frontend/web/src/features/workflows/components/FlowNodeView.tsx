/**
 * FlowNodeView — ReactFlow 自定义节点渲染器,Dify 风格显示 input/output 变量。
 *
 * 卡片左侧列 inputs(供上游引用),右侧列 outputs(可被下游 value_selector 引用)。
 * start 节点无 inputs(只 outputs);end 节点无 outputs(只 inputs)。
 */
import { Handle, Position, type NodeProps } from 'reactflow';
import type { VarField } from '../schema';
import { NODE_TONE_CLASS, nodeKindIcon } from './constants';

function VarChip({ v, side }: { v: VarField; side: 'in' | 'out' }) {
  return (
    <span className={`inline-flex max-w-full items-center gap-1 rounded px-1.5 py-0.5 text-[9px] font-mono leading-tight ${side === 'in' ? 'bg-[var(--surface-1)] text-[var(--text-secondary)] ring-1 ring-[var(--border)]' : 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/30'}`}>
      <span className="truncate">{v.name}{v.required ? '*' : ''}</span>
      <span className="shrink-0 text-[8px] uppercase tracking-wide opacity-70">{v.type}</span>
    </span>
  );
}

export function FlowNodeView({ data, selected }: NodeProps<{ label: string; subtitle: string; kind: 'trigger' | 'tool' | 'agent' | 'condition' | 'end'; inputs?: VarField[]; outputs?: VarField[]; config?: Record<string, string> }>) {
  const tone = NODE_TONE_CLASS[data.kind];
  const Icon = nodeKindIcon(data.kind);
  const isStart = data.kind === 'trigger';
  const isEnd = data.kind === 'end';
  return (
    <div className={`workflow-node w-[260px] rounded-xl border-2 shadow-sm transition ${tone.wrap} ${selected ? 'ring-2 ring-offset-2 ring-[var(--brand)]' : ''}`}>
      {!isStart && <Handle type="target" position={Position.Left} className={`!h-3 !w-3 !border-2 !border-[var(--surface-1)] ${tone.handle}`} />}
      <div className="flex items-center gap-2 px-3 py-2">
        <span className={`grid h-6 w-6 place-items-center rounded-md ${tone.iconBg} ${tone.text}`}>
          <Icon className="h-3.5 w-3.5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className={`workflow-node__label truncate text-xs font-semibold leading-tight ${tone.text}`}>{data.label}</p>
          <p className={`workflow-node__note truncate text-[10px] leading-tight ${tone.sub}`}>{data.subtitle}</p>
        </div>
      </div>
      {(data.inputs?.length || data.outputs?.length) ? (
        <div className="grid grid-cols-2 gap-2 border-t border-[var(--border)] px-3 py-2">
          <div className="flex min-w-0 flex-col gap-1">
            <p className="text-[8px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">输入</p>
            {data.inputs?.length ? (
              <ul className="flex flex-col gap-1">
                {data.inputs.map((v) => (
                  <li key={v.name} className="min-w-0"><VarChip v={v} side="in" /></li>
                ))}
              </ul>
            ) : <p className="text-[9px] text-[var(--text-muted)]">—</p>}
          </div>
          <div className="flex min-w-0 flex-col gap-1">
            <p className="text-[8px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">输出</p>
            {data.outputs?.length ? (
              <ul className="flex flex-col gap-1">
                {data.outputs.map((v) => (
                  <li key={v.name} className="min-w-0"><VarChip v={v} side="out" /></li>
                ))}
              </ul>
            ) : <p className="text-[9px] text-[var(--text-muted)]">—</p>}
          </div>
        </div>
      ) : null}
      {!isEnd && <Handle type="source" position={Position.Right} className={`!h-3 !w-3 !border-2 !border-[var(--surface-1)] ${tone.handle}`} />}
    </div>
  );
}

export const NODE_TYPES = { flowNode: FlowNodeView };