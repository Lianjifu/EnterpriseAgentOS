/**
 * AdminRegressions — 对齐技能管理：无子模块 Tab，列表工具栏 + 视图筛选。
 */
import { describe, expect, it, afterEach } from 'vitest';
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { qk } from '@/api/shared/query-keys';
import { renderWithProviders } from '@/test-utils/seed';
import { mockRegressionAlerts, mockRegressionTimeline, mockRegressionTracks } from './fixtures';
import RegressionsPage from './index';

afterEach(() => cleanup());

function renderPage() {
  return renderWithProviders(<RegressionsPage />, {
    seeds: [
      { key: [...qk.admin.regressions.list, 'w1'], data: mockRegressionTracks },
      { key: [...qk.admin.regressions.alerts, 'w1'], data: mockRegressionAlerts },
      { key: [...qk.admin.regressions.timeline, 'w1'], data: mockRegressionTimeline },
    ],
  });
}

describe('AdminRegressions', () => {
  it('渲染 hero，无子模块导航，有视图 combobox', async () => {
    renderPage();
    expect(screen.getByText(/把版本变更变成可观测的回归/)).toBeTruthy();
    expect(screen.queryByLabelText('子模块导航')).toBeNull();
    expect(screen.getByRole('combobox', { name: '视图' })).toBeTruthy();
    await waitFor(() => {
      expect(screen.getAllByText('客户沟通助手回归追踪').length).toBeGreaterThan(0);
    });
  });

  it('展示追踪卡片与操作按钮', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getAllByText('客户沟通助手回归追踪').length).toBeGreaterThan(0);
    });
    expect(screen.getAllByRole('button', { name: /^编辑$/ }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('button', { name: /^复制$/ }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('button', { name: /^删除$/ }).length).toBeGreaterThan(0);
  });

  it('通过视图 select 切换到基线对比', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getAllByText('客户沟通助手回归追踪').length).toBeGreaterThan(0);
    });
    fireEvent.change(screen.getByRole('combobox', { name: '视图' }), { target: { value: 'baseline' } });
    expect(screen.getByText('版本对比详情')).toBeTruthy();
  });

  it('通过视图 select 切换到风险面板', async () => {
    renderPage();
    fireEvent.change(screen.getByRole('combobox', { name: '视图' }), { target: { value: 'risk' } });
    expect(screen.getByText('风险分布')).toBeTruthy();
  });

  it('通过视图 select 切换到时间线', async () => {
    renderPage();
    fireEvent.change(screen.getByRole('combobox', { name: '视图' }), { target: { value: 'timeline' } });
    expect(screen.getByText('最近事件')).toBeTruthy();
  });

  it('通过视图 select 切换到告警规则', async () => {
    renderPage();
    fireEvent.change(screen.getByRole('combobox', { name: '视图' }), { target: { value: 'alert' } });
    expect(screen.getByText('所有告警规则')).toBeTruthy();
  });
});
