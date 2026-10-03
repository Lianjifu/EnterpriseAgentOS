/**
 * 用户侧「智能体库」实体 — 用户只浏览 / 收藏 / 发起对话,智能体由管理员维护。
 */
import type { ComponentType } from 'react';

export type AgentCategory = '销售支持' | '企业通用' | '客服应答' | '数据分析' | '文案创作';

export interface Agent {
  id: string;
  name: string;
  description: string;
  category: AgentCategory;
  owner: string;
  useCase: string;
  input: string;
  output: string;
  example: string;
  /** icon 由 category 在页面侧映射,这里不存组件引用 */
  tone: string;
}

export interface AgentListParams {
  q?: string;
  category?: 'all' | AgentCategory;
  onlyFavorites?: boolean;
}

export interface ToggleFavoriteVars {
  id: string;
  on: boolean;
}