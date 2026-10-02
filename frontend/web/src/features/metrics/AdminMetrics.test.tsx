/**
 * AdminMetrics — 对齐技能/模型：无子模块 Tab，视图 combobox + 模型卡片。
 */
import { describe, expect, it, afterEach } from 'vitest';
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import { qk } from '@/api/shared/query-keys';
import { renderWithProviders } from '@/test-utils/seed';
import {
  mockCostBreakdown, mockLatencyPoints, mockMetricsDashboards, mockModelMetrics, mockThresholdRules,
} from './fixtures';
import MetricsPage from './index';
import MetricDetailPage from './MetricDetailPage';

afterEach(() => cleanup());

function renderPage() {
  return renderWithProviders(
    <Routes>
      <Route path="/admin/metrics" element={<MetricsPage />} />
      <Route path="/admin/metrics/:id" element={<MetricDetailPage />} />
    </Routes>,
    {
    initialEntries: ['/admin/metrics'],
    seeds: [
      { key: [...qk.admin.metrics.models, 'w1'], data: mockModelMetrics },
      { key: [...qk.admin.metrics.latency, 'w1'], data: mockLatencyPoints },
      { key: [...qk.admin.metrics.costBreakdown, 'w1'], data: mockCostBreakdown },
      { key: [...qk.admin.metrics.dashboards, 'w1'], data: mockMetricsDashboards },
      { key: [...qk.admin.metrics.thresholds, 'w1'], data: mockThresholdRules },
    ],
    },
  );
}

function switchView(value: string) {
  fireEvent.change(screen.getByRole('combobox', { name: '视图' }), { target: { value } });
}

describe('AdminMetrics', () => {
  it('renders hero and default model cards without tab nav', async () => {
    renderPage();
    expect(screen.getByText(/运行指标/)).toBeTruthy();
    expect(screen.getByText('把模型健康与成本一眼说清楚。')).toBeTruthy();
    expect(screen.queryByRole('button', { name: '延迟分析' })).toBeNull();
    expect(screen.getByRole('combobox', { name: '视图' })).toBeTruthy();
    await waitFor(() => {
      expect(screen.getByText('云知-旗舰 v4')).toBeTruthy();
    });
  });

  it('switches to latency view via select', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText('云知-旗舰 v4')).toBeTruthy());
    switchView('latency');
    await waitFor(() => {
      expect(screen.getByText('延迟曲线')).toBeTruthy();
    });
  });

  it('switches to token view and shows cost breakdown', async () => {
    renderPage();
    switchView('token');
    await waitFor(() => {
      expect(screen.getByText('成本占比')).toBeTruthy();
    });
  });

  it('switches to dashboard view', async () => {
    renderPage();
    switchView('dashboard');
    await waitFor(() => {
      expect(screen.getByText('指标看板')).toBeTruthy();
    });
    expect(screen.getByText('告警阈值规则')).toBeTruthy();
  });

  it('switches to availability view and shows provider column', async () => {
    renderPage();
    switchView('availability');
    await waitFor(() => {
      expect(screen.getByText('Provider')).toBeTruthy();
    });
  });

  it('navigates to metric detail when model card is clicked', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText('云知-旗舰 v4')).toBeTruthy());
    const card = screen.getAllByLabelText(/^查看 .* 详情$/)[0];
    fireEvent.click(card);
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByRole('heading', { level: 1, name: mockModelMetrics[0].model })).toBeTruthy();
  });
});
