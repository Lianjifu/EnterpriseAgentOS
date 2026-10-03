/**
 * 用户侧「我的任务」实体 — 用户只读 / 完成 / 重试 / 归档;创建入口留给 Copilot/智能体。
 */
export type TaskStatus = '待处理' | '执行中' | '已完成' | '异常';
export type TaskPriority = '高' | '中' | '低';
export type TaskView = 'list' | 'schedule';
export type TaskFilter = 'all' | TaskStatus;

export interface Task {
  id: string;
  title: string;
  source: string;
  owner: string;
  status: TaskStatus;
  due: string;
  time: string;
  description: string;
  priority: TaskPriority;
}

export interface TaskListParams {
  q?: string;
  status?: TaskFilter;
  source?: string;
}

export interface UpdateTaskVars {
  id: string;
  action: 'complete' | 'retry' | 'archive';
}