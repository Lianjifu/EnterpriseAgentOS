/**
 * PolicyDetailPage 测试 — happy-path + 404 + loading + 策略状态/数据量/被引用 Agent。
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

vi.mock('@/api/admin/memory', () => ({
  useRetentionPolicy: vi.fn(),
  useL1Sessions: vi.fn(() => ({ data: [] })),
  useL2Facts: vi.fn(() => ({ data: [] })),
  useL3Entries: vi.fn(() => ({ data: [] })),
}));

vi.mock('@/mock/admin/agents.fixtures', () => ({
  mockAgents: [
    { id: 'ag-1', name: '客服助手', category: '客服一组', memoryPolicy: { enabled: true } },
    { id: 'ag-2', name: '研发助手', category: '研发架构', memoryPolicy: { enabled: true } },
    { id: 'ag-3', name: '财务助手', category: '财务', memoryPolicy: { enabled: false } },
  ],
}));

import { useRetentionPolicy, useL1Sessions, useL2Facts, useL3Entries } from '@/api/admin/memory';
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
  beforeEach(() => vi.clearAllMocks());

  it('renders policy params + status + volume + bound agents', async () => {
    (useRetentionPolicy as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      data: {
        layer: 'l2',
        label: '长期记忆',
        description: '用户偏好与事实',
        ttlMinutes: 129600,
        maxItems: 200,
        storageMb: 32,
        eviction: 'lru',
        hitRate: 0.88,
      },
      isLoading: false,
    });
    (useL1Sessions as unknown as ReturnType<typeof vi.fn>).mockReturnValue({ data: new Array(7).fill({ status: 'active' }) });
    (useL2Facts as unknown as ReturnType<typeof vi.fn>).mockReturnValue({ data: new Array(12).fill({ status: 'confirmed' }) });
    (useL3Entries as unknown as ReturnType<typeof vi.fn>).mockReturnValue({ data: new Array(9).fill({ status: 'published' }) });

    renderAt('%E9%95%BF%E6%9C%9F%E8%AE%B0%E5%BF%86');

    await waitFor(() => {
      expect(screen.getByText('长期记忆')).toBeTruthy();
    });
    expect(screen.getByText(/用户偏好与事实/)).toBeTruthy();
    expect(screen.getByText('88%')).toBeTruthy();
    expect(screen.getByText('策略参数')).toBeTruthy();
    expect(screen.getByText('策略状态')).toBeTruthy();
    expect(screen.getByText('当前数据量')).toBeTruthy();
    expect(screen.getByText('被以下 Agent 引用')).toBeTruthy();
    expect(screen.getAllByText(/关注中|运行良好|需调整/).length).toBeGreaterThan(0);
    expect(screen.getByText('客服助手')).toBeTruthy();
    expect(screen.getAllByText(/12/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/200/).length).toBeGreaterThan(0);
  });

  it('renders not-found when policy is missing', () => {
    (useRetentionPolicy as unknown as ReturnType<typeof vi.fn>).mockReturnValue({ data: null, isLoading: false });
    renderAt('nonexistent');
    expect(screen.getByText(/策略不存在或已被删除/)).toBeTruthy();
  });

  it('shows loading skeleton', () => {
    (useRetentionPolicy as unknown as ReturnType<typeof vi.fn>).mockReturnValue({ data: null, isLoading: true });
    renderAt('L1');
    expect(screen.getAllByText(/返回记忆管理/).length).toBeGreaterThan(0);
  });
});