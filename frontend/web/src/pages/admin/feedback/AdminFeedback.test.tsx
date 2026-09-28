/**
 * AdminFeedback — 渲染 hero + 5 子模块标签 + 默认 overview 显示反馈。
 */
import { describe, expect, it, afterEach } from 'vitest';
import { cleanup, screen, waitFor, within } from '@testing-library/react';
import { qk } from '@/api/shared/query-keys';
import { renderWithProviders } from '@/test-utils/seed';
import { mockFeedbackList, mockFeedbackRules, mockFeedbackTickets, mockFeedbackTopics } from '@/mock/admin/feedback.fixtures';
import FeedbackPage from './index';

afterEach(() => cleanup());

function renderPage() {
  return renderWithProviders(<FeedbackPage />, {
    seeds: [
      { key: [...qk.admin.feedback.list, 'w1'], data: mockFeedbackList },
      { key: [...qk.admin.feedback.tickets, 'w1'], data: mockFeedbackTickets },
      { key: [...qk.admin.feedback.topics, 'w1'], data: mockFeedbackTopics },
      { key: [...qk.admin.feedback.rules, 'w1'], data: mockFeedbackRules },
    ],
  });
}

describe('AdminFeedback', () => {
  it('渲染 hero + 5 子模块标签 + 默认 overview 显示反馈', async () => {
    renderPage();
    expect(screen.getByText(/让用户的每一条反馈都被看见/)).toBeTruthy();
    await waitFor(() => {
      expect(screen.getAllByText('王芳').length).toBeGreaterThan(0);
    });
  });

  it('切换到反馈列表 tab 显示反馈网格', async () => {
    renderPage();
    const nav = screen.getByLabelText('子模块导航');
    within(nav).getByRole('button', { name: /反馈列表/ }).click();
    await waitFor(() => {
      expect(screen.getByText('所有反馈')).toBeTruthy();
    });
  });

  it('切换到工单管理 tab 显示所有工单', async () => {
    renderPage();
    const nav = screen.getByLabelText('子模块导航');
    within(nav).getByRole('button', { name: /工单管理/ }).click();
    await waitFor(() => {
      expect(screen.getByText('所有工单')).toBeTruthy();
    });
  });

  it('切换到反馈主题 tab 显示主题聚类', async () => {
    renderPage();
    const nav = screen.getByLabelText('子模块导航');
    within(nav).getByRole('button', { name: /反馈主题/ }).click();
    await waitFor(() => {
      expect(screen.getByText('主题聚类')).toBeTruthy();
    });
  });

  it('切换到规则模板 tab 显示反馈路由规则', async () => {
    renderPage();
    const nav = screen.getByLabelText('子模块导航');
    within(nav).getByRole('button', { name: /规则模板/ }).click();
    await waitFor(() => {
      expect(screen.getByText('反馈路由规则')).toBeTruthy();
    });
  });
});