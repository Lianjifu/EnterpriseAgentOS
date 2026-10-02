/**
 * AdminFeedback — 用户反馈 schema。
 * 类型 + 过滤参数 + 写操作变量;不引用 React 或 lucide。
 */
export type TabId = 'overview' | 'list' | 'ticket' | 'topic' | 'rule';
export type FeedbackStatus = 'new' | 'triaged' | 'in-progress' | 'resolved' | 'wontfix';
export type FeedbackSentiment = 'positive' | 'neutral' | 'negative';
export type FeedbackType = 'thumbs' | 'rating' | 'comment' | 'correction';
export type FeedbackPriority = 'low' | 'medium' | 'high' | 'urgent';
export type DrawerPanel = 'detail' | 'reply' | 'history';
export type ExchangeFormat = 'json' | 'yaml';
export type RoutingAction = 'create-ticket' | 'notify' | 'auto-reply';

export interface Feedback {
  id: string;
  agent: string;
  user: string;
  session: string;
  type: FeedbackType;
  rating: number;
  sentiment: FeedbackSentiment;
  status: FeedbackStatus;
  priority: FeedbackPriority;
  topic: string;
  comment: string;
  submittedAt: string;
  tags: string[];
}

export interface Ticket {
  id: string;
  title: string;
  feedbackIds: string[];
  owner: string;
  priority: FeedbackPriority;
  status: FeedbackStatus;
  topic: string;
  description: string;
  createdAt: string;
  dueAt: string;
}

export interface TopicCluster {
  id: string;
  name: string;
  count: number;
  trend: number[];
  description: string;
  sentiment: FeedbackSentiment;
  recentComments: string[];
}

export interface RoutingRule {
  id: string;
  name: string;
  matchTopic: string;
  matchSentiment: FeedbackSentiment | 'all';
  action: RoutingAction;
  target: string;
  enabled: boolean;
  description: string;
}