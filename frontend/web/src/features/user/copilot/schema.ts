/**
 * Copilot 会话 — 留给后续 hook 接入。当前 UI 自带本地状态,迁移指南:
 *  - 会话侧栏(左侧标题列表)用 `useSessions()` → `/api/sessions`
 *  - 当前消息流保留本地状态(后端尚未提供消息持久化)
 */
export interface CopilotSession {
  id: string;
  title: string;
  preview: string;
  updatedAt: string;
  agentId?: string;
}

export interface SessionsListParams {
  search?: string;
  limit?: number;
}

export const emptySessions: CopilotSession[] = [];