/**
 * 用户侧「我的知识」实体 — 用户只读 / 收藏 / 提问历史,知识由管理员维护。
 */
export type KnowledgeKind = '制度' | '项目' | '指南';
export type KnowledgeFilter = 'all' | KnowledgeKind | 'favorites';
export type KnowledgeSort = 'recent' | 'name';

export interface KnowledgeResource {
  id: string;
  title: string;
  kind: KnowledgeKind;
  description: string;
  owner: string;
  updated: string;
  tags: string[];
  excerpt: string;
}

export interface KnowledgeQuestion {
  question: string;
  resourceId: string;
}

export interface KnowledgeListParams {
  q?: string;
  kind?: KnowledgeFilter;
  tag?: string;
  sort?: KnowledgeSort;
  onlyFavorites?: boolean;
}

export interface AskQuestionVars {
  question: string;
}