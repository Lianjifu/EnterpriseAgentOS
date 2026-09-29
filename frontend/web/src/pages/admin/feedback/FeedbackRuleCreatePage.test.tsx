/**
 * FeedbackRuleCreatePage 测试 — 路由 /admin/feedback/rules/new
 */
import { describe, expect, it, afterEach } from 'vitest';
import { cleanup, screen } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import { renderWithProviders } from '@/test-utils/seed';
import FeedbackRuleCreatePage from './FeedbackRuleCreatePage';

function renderAt() {
  return renderWithProviders(
    <Routes>
      <Route path="/admin/feedback/rules/new" element={<FeedbackRuleCreatePage />} />
    </Routes>,
    {
      initialEntries: ['/admin/feedback/rules/new'],
    },
  );
}

describe('AdminFeedbackRuleCreate', () => {
  afterEach(() => cleanup());

  it('renders the create rule header', () => {
    renderAt();
    expect(screen.getByRole('heading', { level: 1, name: '新建规则模板' })).toBeTruthy();
    expect(screen.getByRole('link', { name: /返回用户反馈/ })).toBeTruthy();
  });
});