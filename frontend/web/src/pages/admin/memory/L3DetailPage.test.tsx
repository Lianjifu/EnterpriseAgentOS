/**
 * L3DetailPage 测试 — happy-path + 404。
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

vi.mock('@/api/admin/memory', () => ({
  useL3Entry: vi.fn(),
  useL3Entries: vi.fn(() => ({ data: [] })),
  useL2Facts: vi.fn(() => ({ data: [] })),
}));

import { useL3Entry, useL3Entries, useL2Facts } from '@/api/admin/memory';
import L3DetailPage from './L3DetailPage';

function renderAt(id: string | null) {
  return render(
    <MemoryRouter initialEntries={[id ? `/admin/memory/l3/${id}` : '/admin/memory']}>
      <Routes>
        <Route path="/admin/memory" element={<div>MemoryPage</div>} />
        <Route path="/admin/memory/l2/:id" element={<div>L2DetailStub</div>} />
        <Route path="/admin/memory/l3/:id" element={<L3DetailPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('L3DetailPage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders entry header + KPIs + hits trend + promoted-from + same-team', async () => {
    (useL3Entry as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      data: {
        id: 'k-008', team: '产品团队', title: '业务术语对照表',
        summary: '内部术语、缩写、产品代号的官方解释',
        category: '术语表', hits: 1280, updatedAt: '本周', contributor: '产品团队', status: 'published',
        hitsTrend: [920, 1020, 1080, 1120, 1180, 1220, 1260, 1280],
        promotedFromL2Ids: ['f-3'],
      },
      isLoading: false,
    });
    (useL2Facts as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      data: [{ id: 'f-3', userName: '李楠', key: '禁用领域', value: '不讨论价格折扣细节', category: 'context', sourceSession: 's-2', confidence: 0.98, lastUsed: '今天', promotedAt: '昨天', status: 'confirmed', promotedToL3: true }],
      isLoading: false,
    });
    (useL3Entries as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      data: [
        { id: 'k-7', team: '产品团队', title: '发布检查清单', summary: '...', category: '流程', hits: 96, updatedAt: '昨天', contributor: '产品团队', status: 'published' },
      ],
      isLoading: false,
    });

    renderAt('k-008');

    await waitFor(() => {
      expect(screen.getByText('业务术语对照表')).toBeTruthy();
    });
    expect(screen.getAllByText('已发布').length).toBeGreaterThan(0);
    expect(screen.getAllByText('术语表').length).toBeGreaterThan(0);
    expect(screen.getByText('1280')).toBeTruthy();
    expect(screen.getByText(/内部术语、缩写/)).toBeTruthy();
    expect(screen.getAllByText('近 8 期').length).toBeGreaterThan(0);
    const promoLink = screen.getByRole('link', { name: /查看长期记忆 →/ });
    expect(promoLink.getAttribute('href')).toBe('/admin/memory/l2/f-3');
    const teamLinks = screen.getAllByRole('link', { name: /查看 →/ });
    const teamLink = teamLinks.find((a) => a.getAttribute('href') === '/admin/memory/l3/k-7');
    expect(teamLink).toBeTruthy();
  });

  it('renders not-found when entry is missing', () => {
    (useL3Entry as unknown as ReturnType<typeof vi.fn>).mockReturnValue({ data: null, isLoading: false });
    renderAt('nonexistent');
    expect(screen.getByText(/团队知识不存在/)).toBeTruthy();
  });
});