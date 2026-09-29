/**
 * AdminWorkflows — 渲染 + 5 tab 切换 + 3 入口跳转(mock useNavigate)。
 */
import { describe, expect, it, afterEach, vi } from 'vitest';
import { cleanup, screen, waitFor, within } from '@testing-library/react';
import { qk } from '@/api/shared/query-keys';
import { renderWithProviders } from '@/test-utils/seed';
import { mockFlows } from '@/mock/admin/workflows.fixtures';
import WorkflowsPage from './index';

const navigateMock = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

afterEach(() => {
  cleanup();
  navigateMock.mockReset();
});

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

  it('切换到节点库 tab 显示 5 类节点', async () => {
    renderPage();
    const nav = screen.getByLabelText('子模块导航');
    within(nav).getByRole('button', { name: /节点库/ }).click();
    await waitFor(() => {
      expect(screen.getByText('节点库')).toBeTruthy();
    });
  });

  it('切换到集成 tab 显示绑定表', async () => {
    renderPage();
    const nav = screen.getByLabelText('子模块导航');
    within(nav).getByRole('button', { name: /集成/ }).click();
    await waitFor(() => {
      expect(screen.getByText(/工作流 × 智能体 绑定/)).toBeTruthy();
    });
  });

  it('切换到发布 tab 显示已发布区', async () => {
    renderPage();
    const nav = screen.getByLabelText('子模块导航');
    within(nav).getByRole('button', { name: /发布/ }).click();
    await waitFor(() => {
      expect(screen.getByText('已发布为工具的工作流')).toBeTruthy();
    });
  });

  it('切换到版本 tab 显示版本历史表', async () => {
    renderPage();
    const nav = screen.getByLabelText('子模块导航');
    within(nav).getByRole('button', { name: /版本/ }).click();
    await waitFor(() => {
      expect(screen.getByText(/版本历史/)).toBeTruthy();
    });
  });

  it('FlowCard 查看按钮 → /admin/workflows/:id', () => {
    renderPage();
    const firstFlow = mockFlows[0];
    const buttons = screen.getAllByRole('button', { name: /^查看/ });
    buttons[0].click();
    expect(navigateMock).toHaveBeenCalledWith(`/admin/workflows/${firstFlow.id}`);
  });

  it('FlowCard 编辑按钮 → /admin/workflows/:id?edit=1', () => {
    renderPage();
    const firstFlow = mockFlows[0];
    const buttons = screen.getAllByRole('button', { name: /^编辑/ });
    buttons[0].click();
    expect(navigateMock).toHaveBeenCalledWith(`/admin/workflows/${firstFlow.id}?edit=1`);
  });

  it('FlowCard 标题按钮 → /admin/workflows/:id', () => {
    renderPage();
    const firstFlow = mockFlows[0];
    screen.getByRole('button', { name: firstFlow.name }).click();
    expect(navigateMock).toHaveBeenCalledWith(`/admin/workflows/${firstFlow.id}`);
  });

  it('OverviewTab 新建工作流按钮 → /admin/workflows/new', () => {
    renderPage();
    screen.getByRole('button', { name: /新建工作流/ }).click();
    expect(navigateMock).toHaveBeenCalledWith('/admin/workflows/new');
  });
});