/**
 * AdminEvaluations — 渲染 hero + 5 子模块标签 + 默认 overview 套件列表。
 */
import { describe, expect, it, afterEach } from 'vitest';
import { cleanup, screen, waitFor, within } from '@testing-library/react';
import { qk } from '@/api/shared/query-keys';
import { renderWithProviders } from '@/test-utils/seed';
import { mockEvalResults, mockEvalSuites } from '@/mock/admin/evaluations.fixtures';
import EvaluationsPage from './index';

afterEach(() => cleanup());

function renderPage() {
  return renderWithProviders(<EvaluationsPage />, {
    seeds: [
      { key: [...qk.admin.evaluations.list, 'w1'], data: mockEvalSuites },
      { key: [...qk.admin.evaluations.results, 'w1'], data: mockEvalResults },
    ],
  });
}

describe('AdminEvaluations', () => {
  it('渲染 hero + 5 子模块标签 + 默认 overview 显示套件', async () => {
    renderPage();
    expect(screen.getByText(/把评测当作质量的尺子/)).toBeTruthy();
    await waitFor(() => {
      expect(screen.getAllByText('客户沟通能力评测').length).toBeGreaterThan(0);
    });
  });

  it('切换到评测套件 tab 显示全部套件标题', async () => {
    renderPage();
    const nav = screen.getByLabelText('子模块导航');
    within(nav).getByRole('button', { name: /评测套件/ }).click();
    await waitFor(() => {
      expect(screen.getByText('所有套件')).toBeTruthy();
    });
  });

  it('切换到评测结果 tab 显示运行历史', async () => {
    renderPage();
    const nav = screen.getByLabelText('子模块导航');
    within(nav).getByRole('button', { name: /评测结果/ }).click();
    await waitFor(() => {
      expect(screen.getByText('运行历史')).toBeTruthy();
    });
  });

  it('切换到评测用例 tab 显示所有用例', async () => {
    renderPage();
    const nav = screen.getByLabelText('子模块导航');
    within(nav).getByRole('button', { name: /评测用例/ }).click();
    await waitFor(() => {
      expect(screen.getByText('所有用例')).toBeTruthy();
    });
  });

  it('切换到评测模板 tab 显示常用评测模板', async () => {
    renderPage();
    const nav = screen.getByLabelText('子模块导航');
    within(nav).getByRole('button', { name: /评测模板/ }).click();
    await waitFor(() => {
      expect(screen.getByText('常用评测模板')).toBeTruthy();
    });
  });
});