/**
 * AdminMemory hooks — 5 个列表查询 + stats 纯函数。
 */
import { useApiQuery } from '@/services/query';
import { qk } from '@/api/shared/query-keys';
import type {
  L1Session, L2Fact, L3Entry, MemoryStats, PromotionEvent, RetentionPolicy,
} from './schema';

export function useL1Sessions() {
  return useApiQuery<L1Session[]>([...qk.admin.memory.l1], '/api/admin/memory/l1', undefined, { staleTime: 30_000 });
}

export function useL2Facts() {
  return useApiQuery<L2Fact[]>([...qk.admin.memory.l2], '/api/admin/memory/l2', undefined, { staleTime: 30_000 });
}

export function useL3Entries() {
  return useApiQuery<L3Entry[]>([...qk.admin.memory.l3], '/api/admin/memory/l3', undefined, { staleTime: 30_000 });
}

export function usePromotions() {
  return useApiQuery<PromotionEvent[]>([...qk.admin.memory.promotions], '/api/admin/memory/promotions', undefined, { staleTime: 30_000 });
}

export function useRetentionPolicies() {
  return useApiQuery<RetentionPolicy[]>([...qk.admin.memory.policies], '/api/admin/memory/policies', undefined, { staleTime: 60_000 });
}

export function useMemoryStats(l1: L1Session[], l2: L2Fact[], l3: L3Entry[], events: PromotionEvent[]): MemoryStats {
  return {
    l1Active: l1.filter((s) => s.status !== 'expired').length,
    l2Confirmed: l2.filter((f) => f.status !== 'retired').length,
    l3Published: l3.filter((k) => k.status === 'published').length,
    events: events.length,
  };
}