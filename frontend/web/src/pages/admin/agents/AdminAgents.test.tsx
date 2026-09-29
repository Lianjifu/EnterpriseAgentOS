/**
 * AdminAgents 页面测试 — Hero / 状态 Tab / 卡片 / 批量工具栏 / 向导 / 详情路由等关键交互。
 */
import { describe, expect, it, afterEach } from 'vitest';
import { cleanup, fireEvent, screen, within } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import { qk } from '@/api/shared/query-keys';
import { renderWithProviders } from '@/test-utils/seed';
import AgentsPage from '@/pages/admin/agents';
import AgentDetailPage from '@/pages/admin/agents/AgentDetailPage';
import AgentCreatePage from '@/pages/admin/agents/AgentCreatePage';
import { mockAgents } from '@/mock/admin/agents.fixtures';

function renderPage() {
  return renderWithProviders(<AgentsPage />, {
    initialEntries: ['/admin/agents'],
    seeds: [
      { key: [...qk.admin.agents.list, {}, 'w1'], data: mockAgents },
    ],
  });
}

function renderApp(initialPath: string) {
  return renderWithProviders(
    <Routes>
      <Route path="/admin/agents" element={<AgentsPage />} />
      <Route path="/admin/agents/new" element={<AgentCreatePage />} />
      <Route path="/admin/agents/:id" element={<AgentDetailPage />} />
    </Routes>,
    {
      initialEntries: [initialPath],
      seeds: [
        { key: [...qk.admin.agents.list, {}, 'w1'], data: mockAgents },
      ],
    },
  );
}

describe('AdminAgents', () => {
  afterEach(() => cleanup());

  it('renders hero headline and primary CTAs', () => {
    renderPage();
    expect(screen.getByText(/让智能体成为可治理、可观测的能力/)).toBeTruthy();
    expect(screen.getAllByRole('button', { name: /新建智能体/ }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('button', { name: /批量导入/ }).length).toBeGreaterThan(0);
  });

  it('renders status tabs with counts', () => {
    renderPage();
    const tabsRow = document.querySelector('[aria-label="状态过滤"]') as HTMLElement | null;
    expect(tabsRow).toBeTruthy();
    const tabLabels = Array.from(tabsRow!.querySelectorAll('button')).map((b) => b.textContent || '');
    expect(tabLabels.some((t) => t.includes('全部'))).toBe(true);
    expect(tabLabels.some((t) => t.includes('已发布'))).toBe(true);
    expect(tabLabels.some((t) => t.includes('草稿'))).toBe(true);
    expect(tabLabels.some((t) => t.includes('灰度中'))).toBe(true);
  });

  it('renders agent cards from fixture', () => {
    renderPage();
    expect(screen.getByText('客户沟通助手')).toBeTruthy();
    expect(screen.getByText('销售支持')).toBeTruthy();
    expect(screen.getByText('数据洞察助手')).toBeTruthy();
  });

  it('filters by status tab', () => {
    renderPage();
    const tabsRow = document.querySelector('[aria-label="状态过滤"]') as HTMLElement | null;
    fireEvent.click(within(tabsRow!).getByRole('button', { name: /灰度中/ }));
    expect(screen.getByText('客户沟通助手 v4')).toBeTruthy();
    // 已发布的「销售支持」不应在灰度 Tab 出现
    expect(screen.queryByText('销售支持')).toBeNull();
  });

  it('navigates to detail page when clicking a card', () => {
    renderApp('/admin/agents');
    const trigger = screen.getByRole('button', { name: /查看 客户沟通助手 详情/ });
    fireEvent.click(trigger);
    // 路由切换后详情页应渲染:顶部返回按钮 + 工作区导航 + 基本信息面板
    expect(screen.getByRole('button', { name: /返回智能体管理/ })).toBeTruthy();
    const sidebar = screen.getByLabelText('智能体工作区导航');
    expect(within(sidebar).getByText(/基本信息/)).toBeTruthy();
    // 返回上一级
    fireEvent.click(screen.getByRole('button', { name: /返回智能体管理/ }));
    expect(screen.getByText(/让智能体成为可治理、可观测的能力/)).toBeTruthy();
  });

  it('selects card and shows batch toolbar', () => {
    renderPage();
    const checkbox = screen.getByRole('button', { name: '选择 客户沟通助手' });
    fireEvent.click(checkbox);
    const checkbox2 = screen.getByRole('button', { name: '选择 销售支持' });
    fireEvent.click(checkbox2);
    const toolbar = screen.getByLabelText('批量操作');
    expect(toolbar).toBeTruthy();
    expect(within(toolbar).getByText(/已选 2 项/)).toBeTruthy();
    fireEvent.click(within(toolbar).getByRole('button', { name: /取消选择/ }));
    expect(screen.queryByLabelText('批量操作')).toBeNull();
  });

  it('navigates to create page (4 steps + 返回 link)', () => {
    renderApp('/admin/agents');
    fireEvent.click(screen.getAllByRole('button', { name: /新建智能体/ })[0]);
    // 路由切换到独立页面,带返回按钮
    expect(screen.getByRole('link', { name: /返回智能体管理/ })).toBeTruthy();
    expect(screen.getByRole('heading', { level: 1, name: '新建智能体' })).toBeTruthy();
    // 4 步向导页头
    expect(screen.getByText('基本信息')).toBeTruthy();
    expect(screen.getByText('确认创建')).toBeTruthy();
    // Step 1: 名称必填
    const name = screen.getByPlaceholderText(/差旅助手/);
    fireEvent.change(name, { target: { value: '测试智能体' } });
    fireEvent.click(screen.getByRole('button', { name: /下一步/ }));
    fireEvent.click(screen.getByRole('button', { name: /下一步/ }));
    // Step 3: 至少选 1 个技能
    fireEvent.click(screen.getByRole('button', { name: /订单查询/ }));
    fireEvent.click(screen.getByRole('button', { name: /下一步/ }));
    // Step 4: 确认页可见
    expect(screen.getByText(/创建并进入编辑器/)).toBeTruthy();
    // 返回上一级:从 /admin/agents/new → /admin/agents
    fireEvent.click(screen.getByRole('link', { name: /返回智能体管理/ }));
    expect(screen.getByText(/让智能体成为可治理、可观测的能力/)).toBeTruthy();
  });

  it('opens import dialog and previews sample', () => {
    renderPage();
    fireEvent.click(screen.getAllByRole('button', { name: /批量导入/ })[0]);
    const dialog = screen.getByRole('dialog', { name: '导入智能体' });
    expect(dialog).toBeTruthy();
    // Step 1: 验证支持 JSON / CSV / YAML / ZIP 标签 + StepIndicator
    expect(within(dialog).getByText('JSON')).toBeTruthy();
    expect(within(dialog).getByText('CSV')).toBeTruthy();
    // 关闭
    fireEvent.click(within(dialog).getByRole('button', { name: '取消' }));
    expect(screen.queryByRole('dialog', { name: '导入智能体' })).toBeNull();
  });

  it('opens export dialog from toolbar', () => {
    renderPage();
    fireEvent.click(screen.getAllByRole('button', { name: /导出全部/ })[0]);
    const dialog = screen.getByRole('dialog', { name: '导出智能体' });
    expect(dialog).toBeTruthy();
    expect(within(dialog).getByText(/选择导出范围、格式与字段/)).toBeTruthy();
  });

  it('switches detail page panel to versions and eval', () => {
    renderApp('/admin/agents/a-customer-v3');
    const sidebar = screen.getByLabelText('智能体工作区导航');
    fireEvent.click(within(sidebar).getByText('版本'));
    expect(screen.getAllByText(/查看 diff/).length).toBeGreaterThan(0);
    fireEvent.click(within(sidebar).getByText('评测'));
    expect(screen.getByText(/最近评测批次/)).toBeTruthy();
  });
});