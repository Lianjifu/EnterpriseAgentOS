/**
 * AdminEvaluations — 对齐技能管理 / ModelsPage：无子模块 Tab，列表工具栏 + 视图筛选。
 */
import { describe, expect, it, afterEach } from 'vitest';
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { qk } from '@/api/shared/query-keys';
import { renderWithProviders } from '@/test-utils/seed';
import { mockEvalResults, mockEvalSuites } from './fixtures';
import EvaluationsPage from './index';

function renderPage() {
  return renderWithProviders(<EvaluationsPage />, {
    seeds: [
      { key: [...qk.admin.evaluations.list, 'w1'], data: mockEvalSuites },
      { key: [...qk.admin.evaluations.results, 'w1'], data: mockEvalResults },
    ],
  });
}

describe('AdminEvaluations', () => {
  afterEach(() => cleanup());

  it('renders hero without sub-module tabs', async () => {
    renderPage();
    expect(screen.getByText(/把评测当作质量的尺子/)).toBeTruthy();
    expect(screen.queryByLabelText('子模块导航')).toBeNull();
    expect(screen.getByRole('combobox', { name: '视图' })).toBeTruthy();
    await waitFor(() => {
      expect(screen.getAllByText('客户沟通能力评测').length).toBeGreaterThan(0);
    });
  });

  it('renders suite cards and action buttons', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('客户沟通能力评测')).toBeTruthy();
    });
    expect(screen.getAllByRole('button', { name: /^编辑$/ }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('button', { name: /^运行$/ }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('button', { name: /^复制$/ }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('button', { name: /^删除$/ }).length).toBeGreaterThan(0);
  });

  it('switches to result view via select', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('客户沟通能力评测')).toBeTruthy();
    });
    fireEvent.change(screen.getByRole('combobox', { name: '视图' }), { target: { value: 'result' } });
    expect(screen.getByText('运行历史')).toBeTruthy();
  });

  it('switches to case view via select', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('客户沟通能力评测')).toBeTruthy();
    });
    fireEvent.change(screen.getByRole('combobox', { name: '视图' }), { target: { value: 'case' } });
    expect(screen.getByText('所有用例')).toBeTruthy();
  });

  it('switches to template view via select', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('客户沟通能力评测')).toBeTruthy();
    });
    fireEvent.change(screen.getByRole('combobox', { name: '视图' }), { target: { value: 'template' } });
    expect(screen.getByText('常用评测模板')).toBeTruthy();
  });
});
