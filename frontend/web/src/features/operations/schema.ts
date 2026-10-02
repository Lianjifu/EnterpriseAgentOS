/**
 * AdminOperations — 调用链路的领域类型。
 */
export type TabId = 'overview' | 'session' | 'trace' | 'kind' | 'incident';
export type SessionStatus = 'running' | 'success' | 'partial' | 'failed';
export type SpanKind = 'llm' | 'tool' | 'mcp' | 'retrieval' | 'memory' | 'orchestration';
export type Severity = 'info' | 'warning' | 'error' | 'critical';
export type DrawerPanel = 'overview' | 'spans' | 'context' | 'logs';
export type ExchangeFormat = 'json' | 'yaml';

export interface Span {
  id: string;
  parentId: string | null;
  kind: SpanKind;
  name: string;
  durationMs: number;
  startOffsetMs: number;
  status: 'ok' | 'error' | 'pending';
  tokens?: number;
  cost?: number;
  detail?: string;
}

export interface Session {
  id: string;
  user: string;
  agentName: string;
  channel: string;
  status: SessionStatus;
  totalDurationMs: number;
  startAt: string;
  spanCount: number;
  totalTokens: number;
  totalCost: number;
  hasError: boolean;
  summary: string;
  starred: boolean;
}

export interface Incident {
  id: string;
  title: string;
  severity: Severity;
  sessionId: string;
  spanId: string;
  occurredAt: string;
  message: string;
  resolved: boolean;
  affectedUser: string;
  retryCount: number;
}

export interface KindStat {
  kind: SpanKind;
  count: number;
}

export interface OperationsSummary {
  sessions: Session[];
  spans: Span[];
  incidents: Incident[];
  kindStats: KindStat[];
}

export interface OperationsFilterPayload {
  status: string;
  agent: string;
  severity: string;
}

export interface BatchResolveVars {
  ids: string[];
}

export interface ExportVars {
  format: ExchangeFormat;
  ids?: string[];
}