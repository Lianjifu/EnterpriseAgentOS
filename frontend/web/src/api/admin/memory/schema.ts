/**
 * AdminMemory schema — 3 层记忆(L1 短期 / L2 长期 / L3 知识)+ 保留策略 + 晋升事件。
 */
export type MemoryTabId = 'overview' | 'l1' | 'l2' | 'l3' | 'policy';
export type MemoryLayer = 'l1' | 'l2' | 'l3';
export type MemoryRange = '7d' | '30d' | '90d';
export type L1Status = 'active' | 'paused' | 'expired';
export type L2Status = 'pending' | 'confirmed' | 'retired';
export type L3Status = 'draft' | 'published' | 'retired';
export type L2Category = 'preference' | 'fact' | 'style' | 'context';
export type EvictionStrategy = 'lru' | 'fifo' | 'confidence';
export type Tone = 'brand' | 'info' | 'success' | 'warn' | 'danger' | 'purple';

export interface L1Session {
  id: string; userName: string; agentName: string;
  bufferSize: number; tokensUsed: number; ttlMinutes: number; ttlRemainMin: number;
  status: L1Status; lastFlush: string; startedAt: string;
}

export interface L2Fact {
  id: string; userName: string; key: string; value: string; category: L2Category;
  sourceSession: string; confidence: number;
  lastUsed: string; promotedAt: string; status: L2Status; promotedToL3: boolean;
  /** 近 7 天使用时间戳,可选 */
  usageHistory?: string[];
}

export interface L3Entry {
  id: string; team: string; title: string; summary: string; category: string;
  hits: number; updatedAt: string; contributor: string; status: L3Status;
  /** 8 期命中数(由旧到新),可选 */
  hitsTrend?: number[];
  /** 晋升来源 L2 fact id,可选 */
  promotedFromL2Ids?: string[];
}

export interface PromotionEvent {
  id: string; layer: 'l1→l2' | 'l2→l3';
  label: string; at: string; operator: string;
  /** 晋升结果实体 id(l1→l2 → L2 fact id,l2→l3 → L3 entry id) */
  targetId: string;
}

export interface RetentionPolicy {
  layer: MemoryLayer; label: string; description: string;
  ttlMinutes: number; maxItems: number; storageMb: number;
  eviction: EvictionStrategy; hitRate: number;
}

export interface MemoryStats {
  l1Active: number; l2Confirmed: number; l3Published: number; events: number;
}

/** 总览趋势 8 期(由旧到新),按所选时间范围步长。 */
export interface MemoryTrend {
  l1Active: number[];
  l2Hits: number[];
  l3Hits: number[];
}