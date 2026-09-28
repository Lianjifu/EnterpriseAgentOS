/**
 * 用户侧「我的流程」实体 — 用户只选择 / 使用 / 收藏,流程由管理员维护。
 */
export type FlowAvailability = 'available' | 'unavailable';

export interface Flow {
  id: string;
  name: string;
  scene: string;
  description: string;
  owner: string;
  cadence: string;
  availability: FlowAvailability;
  steps: string[];
  lastRun: string;
  usage: number;
}

export interface FlowRun {
  id: string;
  name: string;
  time: string;
  result: string;
}

export interface FlowListParams {
  q?: string;
  scene?: 'all' | string;
  availability?: 'all' | FlowAvailability;
}

export interface ToggleFavoriteVars {
  id: string;
  on: boolean;
}

export interface RecordRunVars {
  flowId: string;
  note?: string;
}