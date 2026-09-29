/**
 * AdminWorkflows — 渲染 + 5 tab 切换 + 工作流卡片可见。
 */
import { describe, expect, it, afterEach } from 'vitest';
import { cleanup, screen, waitFor, within } from '@testing-library/react';
import { qk } from '@/api/shared/query-keys';
import { renderWithProviders } from '@/test-utils/seed';
import { mockFlows } from '@/mock/admin/workflows.fixtures';
import WorkflowsPage from './index';

afterEach(() => cleanup());

function renderPage() {
  return renderWithProviders(<WorkflowsPage />, {
    seeds: [
      { key: [...qk.admin.workflows.list, 'w1'], data: mockFlows },
    ],
  });
}

describe('AdminWorkflows', () => {
  it('渲染 hero + 5 子模块标签 + 默认 overview', () => {
    renderPage();
    expect(screen.getByText(/把可复用的工作流设计出来/)).toBeTruthy();
    expect(screen.getByText('工作流列表')).toBeTruthy();
  });

  it('切换到触发器 tab 显示触发器类型', async () => {
    renderPage();
    const nav = screen.getByLabelText('子模块导航');
    within(nav).getByRole('button', { name: /触发器/ }).click();
    await waitFor(() => {
      expect(screen.getByText('触发器类型')).toBeTruthy();
    });
  });

  it('切换到动作节点 tab 显示动作节点类型', async () => {
    renderPage();
    const nav = screen.getByLabelText('子模块导航');
    within(nav).getByRole('button', { name: /动作节点/ }).click();
    await waitFor(() => {
      expect(screen.getByText('动作节点类型')).toBeTruthy();
    });
  });

  it('切换到条件分支 tab 显示条件分支类型', async () => {
    renderPage();
    const nav = screen.getByLabelText('子模块导航');
    within(nav).getByRole('button', { name: /条件分支/ }).click();
    await waitFor(() => {
      expect(screen.getByText('条件分支类型')).toBeTruthy();
    });
  });

  it('切换到发布与版本 tab 显示已发布区', async () => {
    renderPage();
    const nav = screen.getByLabelText('子模块导航');
    within(nav).getByRole('button', { name: /发布与版本/ }).click();
    await waitFor(() => {
      expect(screen.getByText('已发布为工具的工作流')).toBeTruthy();
    });
  });
});