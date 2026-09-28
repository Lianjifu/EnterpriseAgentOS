/**
 * AdminFeedback — 用户反馈数据 hooks。
 * 列表 / 工单 / 主题 / 规则 走 useApiQuery;CRUD 走本地乐观更新。
 */
import { useApiQuery } from '@/services/query';
import { qk } from '@/api/shared/query-keys';
import type { Feedback, RoutingRule, Ticket, TopicCluster } from './schema';

export function useFeedbackList() {
  return useApiQuery<Feedback[]>(
    [...qk.admin.feedback.list],
    '/api/admin/feedback/list',
    undefined,
    { staleTime: 60_000 },
  );
}

export function useFeedbackTickets() {
  return useApiQuery<Ticket[]>(
    [...qk.admin.feedback.tickets],
    '/api/admin/feedback/tickets',
    undefined,
    { staleTime: 60_000 },
  );
}

export function useFeedbackTopics() {
  return useApiQuery<TopicCluster[]>(
    [...qk.admin.feedback.topics],
    '/api/admin/feedback/topics',
    undefined,
    { staleTime: 60_000 },
  );
}

export function useFeedbackRules() {
  return useApiQuery<RoutingRule[]>(
    [...qk.admin.feedback.rules],
    '/api/admin/feedback/rules',
    undefined,
    { staleTime: 60_000 },
  );
}