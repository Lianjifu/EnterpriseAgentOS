import { describe, expect, it, afterEach } from 'vitest';
import { cleanup, screen } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import { renderWithProviders } from '@/test-utils/seed';
import BudgetCreatePage from './BudgetCreatePage';

function renderAt() {
  return renderWithProviders(
    <Routes>
      <Route path="/admin/quotas/new" element={<BudgetCreatePage />} />
    </Routes>,
    { initialEntries: ['/admin/quotas/new'] },
  );
}

describe('AdminBudgetCreate', () => {
  afterEach(() => cleanup());

  it('renders standalone create page', () => {
    renderAt();
    expect(screen.getByRole('heading', { level: 1, name: '新建企业预算' })).toBeTruthy();
    expect(screen.getByRole('link', { name: /返回额度管理/ })).toBeTruthy();
  });
});
