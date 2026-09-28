/**
 * PolicyDetailPage 测试 — happy-path 渲染 + 反向引用 + 404。
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

vi.mock('@/api/admin/memory/useMemory', () => ({
  useRetentionPolicy: vi.fn(),
}));

import { useRetentionPolicy } from '@/api/admin/memory/useMemory';
import PolicyDetailPage from './PolicyDetailPage';

function renderAt(id: string | null) {
  return render(
    <MemoryRouter initialEntries={[id ? `/admin/memory/policies/${id}` : '/admin/memory']}>
      <Routes>
        <Route path="/admin/memory" element={<div>MemoryPage</div>} />
        <Route path="/admin/memory/policies/:id" element={<PolicyDetailPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('PolicyDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders policy fields', async () => {
    (useRetentionPolicy as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      data: {
        layer: 'l2',
        label: 'L2 长期记忆',
        description: '用户偏好与事实',
        ttlMinutes: 129600,
        maxItems: 200,
        storageMb: 32,
        eviction: 'lru',
        hitRate: 0.88,
      },
      isLoading: false,
    });

    renderAt('L2%20%E9%95%BF%E6%9C%9F%E8%AE%B0%E5%BF%86');

    await waitFor(() => {
      expect(screen.getByText('L2 长期记忆')).toBeTruthy();
    });
    expect(screen.getByText(/用户偏好与事实/)).toBeTruthy();
    expect(screen.getByText('88%')).toBeTruthy();
  });

  it('renders not-found when policy is missing', () => {
    (useRetentionPolicy as unknown as ReturnType<typeof vi.fn>).mockReturnValue({ data: null, isLoading: false });
    renderAt('nonexistent');
    expect(screen.getByText(/策略不存在或已被删除/)).toBeTruthy();
  });

  it('shows loading state', () => {
    (useRetentionPolicy as unknown as ReturnType<typeof vi.fn>).mockReturnValue({ data: null, isLoading: true });
    renderAt('L1');
    expect(screen.getByText(/加载中/)).toBeTruthy();
  });
});