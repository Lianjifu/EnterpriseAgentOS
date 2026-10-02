/**
 * MetricDetailPage 测试 — 路由 /admin/metrics/:id
 */
import { describe, expect, it, afterEach } from 'vitest';
import { cleanup, fireEvent, screen } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import { qk } from '@/api/shared/query-keys';
import { renderWithProviders } from '@/test-utils/seed';
import MetricDetailPage from './MetricDetailPage';
import {
  mockCostBreakdown, mockLatencyPoints, mockModelMetrics, mockThresholdRules,
} from './fixtures';

function renderAt(id: string) {
  return renderWithProviders(
    <Routes>
      <Route path="/admin/metrics/:id" element={<MetricDetailPage />} />
    </Routes>,
    {
      initialEntries: [`/admin/metrics/${id}`],
      seeds: [
        { key: [...qk.admin.metrics.models, 'w1'], data: mockModelMetrics },
        { key: [...qk.admin.metrics.latency, 'w1'], data: mockLatencyPoints },
        { key: [...qk.admin.metrics.costBreakdown, 'w1'], data: mockCostBreakdown },
        { key: [...qk.admin.metrics.thresholds, 'w1'], data: mockThresholdRules },
      ],
    },
  );
}

describe('MetricDetailPage', () => {
  afterEach(() => cleanup());

  it('renders model name and sidebar nav for known id', () => {
    const model = mockModelMetrics[0];
    renderAt(model.id);
    expect(screen.getByRole('heading', { level: 1, name: model.model })).toBeTruthy();
    expect(screen.getByLabelText('指标工作区')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '分布拆解' }));
    expect(screen.getByText(/成本占比/)).toBeTruthy();
  });

  it('shows not-found when id is unknown', () => {
    renderAt('md-does-not-exist');
    expect(screen.getByText('模型指标不存在或已被删除')).toBeTruthy();
  });
});
