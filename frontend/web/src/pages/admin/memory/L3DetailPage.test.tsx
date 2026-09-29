/**
 * L3DetailPage 测试 — happy-path + 404。
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

vi.mock('@/api/admin/memory', () => ({
  useL3Entry: vi.fn(),
}));

import { useL3Entry } from '@/api/admin/memory';
import L3DetailPage from './L3DetailPage';

function renderAt(id: string | null) {
  return render(
    <MemoryRouter initialEntries={[id ? `/admin/memory/l3/${id}` : '/admin/memory']}>
      <Routes>
        <Route path="/admin/memory" element={<div>MemoryPage</div>} />
        <Route path="/admin/memory/l3/:id" element={<L3DetailPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('L3DetailPage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders entry header + KPIs', async () => {
    (useL3Entry as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      data: {
        id: 'k-008', team: '财务', title: '应收账款周转口径',
        summary: '口径为「近 12 个月平均应收 / 月均营收」,目标 ≥ 5 次',
        category: '业务术语', hits: 256, updatedAt: '4 小时前', contributor: '林岚', status: 'published',
      },
      isLoading: false,
    });

    renderAt('k-008');

    await waitFor(() => {
      expect(screen.getByText('应收账款周转口径')).toBeTruthy();
    });
    expect(screen.getAllByText('已发布').length).toBeGreaterThan(0);
    expect(screen.getAllByText('业务术语').length).toBeGreaterThan(0);
    expect(screen.getByText('256')).toBeTruthy();
    expect(screen.getByText(/近 12 个月平均应收/)).toBeTruthy();
  });

  it('renders not-found when entry is missing', () => {
    (useL3Entry as unknown as ReturnType<typeof vi.fn>).mockReturnValue({ data: null, isLoading: false });
    renderAt('nonexistent');
    expect(screen.getByText(/L3 团队知识不存在/)).toBeTruthy();
  });
});