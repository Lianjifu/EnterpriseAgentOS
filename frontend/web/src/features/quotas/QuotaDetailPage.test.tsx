import { describe, expect, it, afterEach } from 'vitest';
import { cleanup, screen } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import { qk } from '@/api/shared/query-keys';
import { renderWithProviders } from '@/test-utils/seed';
import QuotaDetailPage from './QuotaDetailPage';
import { mockBudgets, mockDepartments } from './fixtures';

function renderAt(id: string) {
  return renderWithProviders(
    <Routes>
      <Route path="/admin/quotas/:id" element={<QuotaDetailPage />} />
    </Routes>,
    {
      initialEntries: [`/admin/quotas/${id}`],
      seeds: [
        { key: [...qk.admin.quotas.root, 'budgets', 'w1'], data: mockBudgets },
        { key: [...qk.admin.quotas.root, 'departments', 'w1'], data: mockDepartments },
      ],
    },
  );
}

describe('AdminQuotaDetail', () => {
  afterEach(() => cleanup());

  it('renders budget name for known id', () => {
    const budget = mockBudgets[0];
    renderAt(budget.id);
    expect(screen.getByRole('heading', { level: 1, name: budget.name })).toBeTruthy();
    expect(screen.getByRole('link', { name: /返回额度管理/ })).toBeTruthy();
  });

  it('shows not-found when id is unknown', () => {
    renderAt('bg-unknown');
    expect(screen.getByText('预算不存在或已被删除')).toBeTruthy();
  });
});
