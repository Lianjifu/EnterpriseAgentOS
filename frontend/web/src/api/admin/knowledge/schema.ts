/**
 * 管理侧「知识管理」schema — 5 类实体(Kb / Doc / Source / Task / EvalCase)
 * 以及创建/批量操作的入参形态。颜色/图标等纯展示字段不入 data。
 */
export type TabId = 'kb' | 'docs' | 'sources' | 'tasks' | 'eval';
export type Range = '7d' | '30d' | '90d';

export type KbStatus = 'indexed' | 'indexing' | 'paused' | 'failed';
export type DocStatus = 'parsed' | 'parsing' | 'pending' | 'failed';
export type DocType = 'manual' | 'policy' | 'meeting' | 'contract' | 'faq';
export type SourceType = 'notion' | 'slack' | 'web' | 'postgres' | 's3' | 'api' | 'folder' | 'confluence';
export type SourceStatus = 'online' | 'syncing' | 'error' | 'paused';
export type TaskStatus = 'pending' | 'running' | 'success' | 'failed' | 'paused';
export type TaskKind = 'index' | 'reindex' | 'rebuild';
export type EvalStatus = 'pass' | 'fail' | 'skipped';
export type KbScope = '公开' | '部门' | '个人';
export type Tone = 'brand' | 'info' | 'success' | 'warn' | 'danger' | 'purple';

export interface Kb {
  id: string;
  name: string;
  description: string;
  owner: string;
  scope: KbScope;
  status: KbStatus;
  docCount: number;
  vectorCount: number;
  updatedAt: string;
  tags: string[];
  tone: 'brand' | 'info' | 'success' | 'warn' | 'danger' | 'purple';
  evalHitRate: number;
}

export interface DocChunk {
  index: number;
  heading?: string;
  snippet: string;
  citations: number;
  tokens: number;
}

export interface Doc {
  id: string;
  name: string;
  type: DocType;
  kbId: string;
  sourceId?: string;
  status: DocStatus;
  sizeKb: number;
  chunks: number;
  chunksPreview?: DocChunk[];
  updatedAt: string;
  citations: number;
}

export interface Source {
  id: string;
  name: string;
  type: SourceType;
  status: SourceStatus;
  lastSync: string;
  schedule: string;
  itemCount: number;
  lastError?: string;
}

export interface Task {
  id: string;
  name: string;
  kind: TaskKind;
  kbId: string;
  sourceId?: string;
  status: TaskStatus;
  progress: number;
  items: number;
  startedAt: string;
  duration: string;
}

export interface EvalCase {
  id: string;
  name: string;
  query: string;
  expectedKb: string;
  actualKb: string;
  status: EvalStatus;
  latency: number;
  mrr: number;
}

export interface CreateKbVars {
  name: string;
  description: string;
  scope: KbScope;
  boundSources: string[];
  retrieval: 'hybrid' | 'semantic' | 'keyword';
  topK: number;
}

export interface CreateSourceVars {
  name: string;
  type: SourceType;
  schedule: string;
}

export interface ToggleKbStatusVars {
  id: string;
}

export interface BatchKbVars {
  ids: string[];
  action: 'rebuild' | 'pause' | 'export';
}