/**
 * L1DetailPage 测试 — happy-path + 404。
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

vi.mock('./useMemory', () => ({
  useL1Session: vi.fn(),
  useL1Sessions: vi.fn(() => ({ data: [] })),
}));

import { useL1Session } from './useMemory';
import L1DetailPage from './L1DetailPage';

function renderAt(id: string | null) {
  return render(
    <MemoryRouter initialEntries={[id ? `/admin/memory/l1/${id}` : '/admin/memory']}>
      <Routes>
        <Route path="/admin/memory" element={<div>MemoryPage</div>} />
        <Route path="/admin/memory/l1/:id" element={<L1DetailPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('L1DetailPage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders session header + KPIs', async () => {
    (useL1Session as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      data: {
        id: 's-007', userName: '张伟', agentName: '财务助理',
        bufferSize: 12, tokensUsed: 1820, ttlMinutes: 30, ttlRemainMin: 8,
        status: 'active', lastFlush: '刚刚', startedAt: '2 小时前',
      },
      isLoading: false,
    });

    renderAt('s-007');

    await waitFor(() => {
      expect(screen.getByText('张伟 ↔ 财务助理')).toBeTruthy();
    });
    expect(screen.getAllByText('活跃').length).toBeGreaterThan(0);
    expect(screen.getByText(/1,820/)).toBeTruthy();
  });

  it('renders not-found when session is missing', () => {
    (useL1Session as unknown as ReturnType<typeof vi.fn>).mockReturnValue({ data: null, isLoading: false });
    renderAt('nonexistent');
    expect(screen.getByText(/短期会话不存在或已被清空/)).toBeTruthy();
  });
});