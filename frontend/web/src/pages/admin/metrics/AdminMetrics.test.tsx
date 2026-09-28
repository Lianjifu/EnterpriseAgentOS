/**
 * AdminMetrics — 渲染 + tab 切换 + 默认内容 + 看板切换。
 */
import { describe, expect, it, afterEach } from 'vitest';
import { cleanup, screen, waitFor } from '@testing-library/react';
import { qk } from '@/api/shared/query-keys';
import { renderWithProviders } from '@/test-utils/seed';
import {
  mockCostBreakdown, mockLatencyPoints, mockMetricsDashboards, mockModelMetrics, mockThresholdRules,
} from '@/mock/admin/metrics.fixtures';
import MetricsPage from './index';

afterEach(() => cleanup());

function renderPage() {
  return renderWithProviders(<MetricsPage />, {
    seeds: [
      { key: [...qk.admin.metrics.models, 'w1'], data: mockModelMetrics },
      { key: [...qk.admin.metrics.latency, 'w1'], data: mockLatencyPoints },
      { key: [...qk.admin.metrics.costBreakdown, 'w1'], data: mockCostBreakdown },
      { key: [...qk.admin.metrics.dashboards, 'w1'], data: mockMetricsDashboards },
      { key: [...qk.admin.metrics.thresholds, 'w1'], data: mockThresholdRules },
    ],
  });
}

describe('AdminMetrics', () => {
  it('渲染页面 header + 默认 overview', async () => {
    renderPage();
    expect(screen.getByText('运行指标')).toBeTruthy();
    await waitFor(() => {
      expect(screen.getByText('模型健康度')).toBeTruthy();
    });
    const cards = screen.getAllByText('云知-旗舰 v4');
    expect(cards.length).toBeGreaterThanOrEqual(1);
  });

  it('切换到延迟 tab 显示曲线', async () => {
    renderPage();
    screen.getByRole('button', { name: '延迟分析' }).click();
    await waitFor(() => {
      expect(screen.getByText('延迟曲线')).toBeTruthy();
    });
  });

  it('切换到 Token tab 显示成本占比', async () => {
    renderPage();
    screen.getByRole('button', { name: 'Token 与成本' }).click();
    await waitFor(() => {
      expect(screen.getByText('成本占比')).toBeTruthy();
    });
  });

  it('切换到看板 tab 显示看板与阈值规则', async () => {
    renderPage();
    screen.getByRole('button', { name: '看板与告警' }).click();
    await waitFor(() => {
      expect(screen.getByText('指标看板')).toBeTruthy();
    });
    expect(screen.getByText('告警阈值规则')).toBeTruthy();
  });

  it('切换到可用率 tab 显示排序表格', async () => {
    renderPage();
    screen.getByRole('button', { name: '可用率' }).click();
    await waitFor(() => {
      expect(screen.getByText('Provider')).toBeTruthy();
    });
  });
});