/**
 * AdminRegressions — 渲染 hero + 5 子模块标签 + 默认 overview 展示追踪。
 */
import { describe, expect, it, afterEach } from 'vitest';
import { cleanup, screen, waitFor, within } from '@testing-library/react';
import { qk } from '@/api/shared/query-keys';
import { renderWithProviders } from '@/test-utils/seed';
import { mockRegressionAlerts, mockRegressionTimeline, mockRegressionTracks } from '@/mock/admin/regressions.fixtures';
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
  it('渲染 hero + 5 子模块标签 + 默认 overview 显示追踪', async () => {
    renderPage();
    expect(screen.getByText(/把版本变更变成可观测的回归/)).toBeTruthy();
    await waitFor(() => {
      expect(screen.getAllByText('客户沟通助手回归追踪').length).toBeGreaterThan(0);
    });
  });

  it('切换到基线对比 tab 显示版本对比表头', async () => {
    renderPage();
    const nav = screen.getByLabelText('子模块导航');
    within(nav).getByRole('button', { name: /基线对比/ }).click();
    await waitFor(() => {
      expect(screen.getByText('版本对比详情')).toBeTruthy();
    });
  });

  it('切换到风险面板 tab 显示风险分布', async () => {
    renderPage();
    const nav = screen.getByLabelText('子模块导航');
    within(nav).getByRole('button', { name: /风险面板/ }).click();
    await waitFor(() => {
      expect(screen.getByText('风险分布')).toBeTruthy();
    });
  });

  it('切换到时间线 tab 显示最近事件', async () => {
    renderPage();
    const nav = screen.getByLabelText('子模块导航');
    within(nav).getByRole('button', { name: /时间线/ }).click();
    await waitFor(() => {
      expect(screen.getByText('最近事件')).toBeTruthy();
    });
  });

  it('切换到告警规则 tab 显示所有告警规则', async () => {
    renderPage();
    const nav = screen.getByLabelText('子模块导航');
    within(nav).getByRole('button', { name: /告警规则/ }).click();
    await waitFor(() => {
      expect(screen.getByText('所有告警规则')).toBeTruthy();
    });
  });
});