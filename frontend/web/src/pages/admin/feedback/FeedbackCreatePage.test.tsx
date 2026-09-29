/**
 * FeedbackCreatePage 测试 — 路由 /admin/feedback/new
 */
import { describe, expect, it, afterEach } from 'vitest';
import { cleanup, screen } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import { renderWithProviders } from '@/test-utils/seed';
import FeedbackCreatePage from './FeedbackCreatePage';

function renderAt(query: string = '') {
  return renderWithProviders(
    <Routes>
      <Route path="/admin/feedback/new" element={<FeedbackCreatePage />} />
    </Routes>,
    {
      initialEntries: [`/admin/feedback/new${query}`],
    },
  );
}

describe('AdminFeedbackCreate', () => {
  afterEach(() => cleanup());

  it('renders the create page header and step 1', () => {
    renderAt();
    expect(screen.getByRole('heading', { level: 1, name: '新建工单' })).toBeTruthy();
    expect(screen.getByRole('link', { name: /返回用户反馈/ })).toBeTruthy();
    expect(screen.getAllByText('基本信息').length).toBeGreaterThan(0);
  });
});