/**
 * L2DetailPage 测试 — happy-path + 404 + 跨链 sourceSession。
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

vi.mock('./useMemory', () => ({
  useL2Fact: vi.fn(),
  useL2Facts: vi.fn(() => ({ data: [] })),
}));

import { useL2Fact, useL2Facts } from './useMemory';
import L2DetailPage from './L2DetailPage';

function renderAt(id: string | null) {
  return render(
    <MemoryRouter initialEntries={[id ? `/admin/memory/l2/${id}` : '/admin/memory']}>
      <Routes>
        <Route path="/admin/memory" element={<div>MemoryPage</div>} />
        <Route path="/admin/memory/l1/:id" element={<div>L1DetailStub</div>} />
        <Route path="/admin/memory/l2/:id" element={<L2DetailPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('L2DetailPage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders fact header + KPIs + usage history + same-user + source session cross-link', async () => {
    (useL2Fact as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      data: {
        id: 'fact-014', userName: '李晨', key: '答复风格', value: '简洁、要点先行、避免冗长寒暄',
        category: 'style', sourceSession: 's-021', confidence: 0.92,
        lastUsed: '12 分钟前', promotedAt: '2 天前', status: 'confirmed', promotedToL3: false,
        usageHistory: ['12 分钟前', '1 小时前', '昨天', '2 天前', '3 天前', '5 天前', '1 周前'],
      },
      isLoading: false,
    });
    (useL2Facts as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      data: [
        { id: 'fact-other-1', userName: '李晨', key: '禁用领域', value: '不讨论价格', category: 'context', sourceSession: 's-022', confidence: 0.8, lastUsed: '今天', promotedAt: '昨天', status: 'confirmed', promotedToL3: false },
        { id: 'fact-other-2', userName: '李晨', key: '报告格式', value: 'Markdown + 图表', category: 'preference', sourceSession: 's-023', confidence: 0.7, lastUsed: '今天', promotedAt: '3 天前', status: 'pending', promotedToL3: false },
      ],
      isLoading: false,
    });

    renderAt('fact-014');

    await waitFor(() => {
      expect(screen.getByText('答复风格')).toBeTruthy();
    });
    expect(screen.getByText(/简洁、要点先行/)).toBeTruthy();
    expect(screen.getAllByText('已确认').length).toBeGreaterThan(0);
    expect(screen.getByText('92%')).toBeTruthy();
    expect(screen.getAllByText('风格').length).toBeGreaterThan(0);
    expect(screen.getAllByText('12 分钟前').length).toBeGreaterThanOrEqual(2);
    const sourceLink = screen.getByRole('link', { name: /sess-021/ });
    expect(sourceLink.getAttribute('href')).toBe('/admin/memory/l1/s-021');
    const allLinks = screen.getAllByRole('link', { name: /查看/ });
    const otherLink = allLinks.find((a) => a.getAttribute('href') === '/admin/memory/l2/fact-other-1');
    expect(otherLink).toBeTruthy();
  });

  it('renders not-found when fact is missing', () => {
    (useL2Fact as unknown as ReturnType<typeof vi.fn>).mockReturnValue({ data: null, isLoading: false });
    renderAt('nonexistent');
    expect(screen.getByText(/长期事实不存在/)).toBeTruthy();
  });
});