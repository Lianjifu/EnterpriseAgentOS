/**
 * AdminWorkflows — 渲染 + 5 状态 tab 切换 + 3 入口跳转(mock useNavigate)。
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
  it('渲染 hero + 5 状态 tab + 搜索 + 新建工作流 同行', () => {
    renderPage();
    expect(screen.getByText(/把可复用的工作流设计出来/)).toBeTruthy();
    const nav = screen.getByLabelText('子模块导航');
    ['全部', '草稿', '已发布', '已下线'].forEach((label) => {
      expect(within(nav).getByRole('button', { name: new RegExp(label) })).toBeTruthy();
    });
    expect(within(nav).getByRole('button', { name: /新建工作流/ })).toBeTruthy();
    expect(within(nav).getByPlaceholderText(/搜索工作流名/)).toBeTruthy();
  });

  it('默认 tab 是 全部 + 渲染 FlowCard', () => {
    renderPage();
    expect(screen.getAllByText(/销售周报自动整理/).length).toBeGreaterThan(0);
  });

  it('子模块导航 「+ 新建工作流」按钮 → /admin/workflows/new', () => {
    renderPage();
    const nav = screen.getByLabelText('子模块导航');
    within(nav).getByRole('button', { name: /新建工作流/ }).click();
    expect(navigateMock).toHaveBeenCalledWith('/admin/workflows/new');
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

  it('FlowCard 「+ 添加节点」 弹出 5 类节点菜单', async () => {
    renderPage();
    const triggers = screen.getAllByRole('button', { name: /添加节点/ });
    triggers[0].click();
    await waitFor(() => {
      expect(screen.getAllByRole('menuitem', { name: /触发器/ }).length).toBeGreaterThan(0);
    });
    expect(screen.getAllByRole('menuitem', { name: /^工具/ }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('menuitem', { name: /智能体/ }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('menuitem', { name: /条件/ }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('menuitem', { name: /结束/ }).length).toBeGreaterThan(0);
  });
});