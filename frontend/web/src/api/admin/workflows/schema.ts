/**
 * AdminWorkflows schema — Flow + 节点/边 + 触发器 + 节点模板。
 */
import type { Node, Edge } from 'reactflow';

export type WorkflowTabId = 'all' | 'draft' | 'graying' | 'published' | 'retired';
export type WorkflowViewMode = 'list' | 'editor';
export type FlowStatus = 'draft' | 'graying' | 'published' | 'retired';
export type NodeKind = 'trigger' | 'tool' | 'agent' | 'condition' | 'end';
export type TriggerType = '消息触发' | '定时触发' | '事件触发' | '手动触发';
export type NodeTypeTabId = 'trigger' | 'action' | 'condition';
export type Tone = 'brand' | 'info' | 'success' | 'warn' | 'danger' | 'purple';

export interface FlowNodeData {
  label: string;
  subtitle: string;
  kind: NodeKind;
  config: Record<string, string>;
}

export interface FlowVersion {
  v: string;
  at: string;
  operator: string;
  note: string;
}

export interface Flow {
  id: string;
  name: string;
  description: string;
  owner: string;
  scene: string;
  trigger: TriggerType;
  status: FlowStatus;
  callCount: number;
  inputs: number;
  outputs: number;
  createdAt: string;
  updatedAt: string;
  boundAgents: string[];
  versions: FlowVersion[];
  initialNodes: Node<FlowNodeData>[];
  initialEdges: Edge[];
}

export interface NodeTemplate {
  kind: NodeKind;
  label: string;
  subtitle: string;
  tone: Tone;
  description: string;
  defaults: Record<string, string>;
}

export interface TemplateChoice {
  id: string;
  name: string;
  desc: string;
  icon: string;
  tone: Tone;
}

export interface WorkflowStats {
  total: number;
  published: number;
  draft: number;
  calls: number;
}