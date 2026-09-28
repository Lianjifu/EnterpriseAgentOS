/**
 * SkillDetailPage 测试 — happy-path 渲染 + 反向引用 + 404。
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

vi.mock('@/api/admin/skills/useAdminSkills', () => ({
  useAdminSkill: vi.fn(),
}));

import { useAdminSkill } from '@/api/admin/skills/useAdminSkills';
import SkillDetailPage from './SkillDetailPage';

function renderAt(id: string | null) {
  return render(
    <MemoryRouter initialEntries={[id ? `/admin/tools/${id}` : '/admin/tools']}>
      <Routes>
        <Route path="/admin/tools" element={<div>ToolsPage</div>} />
        <Route path="/admin/tools/:id" element={<SkillDetailPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('SkillDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders skill fields with reverse agent links', async () => {
    (useAdminSkill as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      data: {
        id: 'skill-summary',
        name: '订单摘要',
        description: '生成订单摘要',
        type: 'Skill',
        owner: '产品团队',
        status: 'published',
        version: 'v1.2.0',
        lastUpdate: '今天 15:30',
        calls: 12340,
        successRate: 0.97,
        errorRate: 0.03,
        avgLatencyMs: 412,
        rating: 4.7,
        risk: 'low',
        needConfirm: false,
        visibleScope: ['公开'],
        tags: ['订单', '摘要'],
        starred: true,
        inputSchema: [],
        outputSchema: [],
        versions: [{ v: 'v1.0.0', at: '3 月前', note: '首发' }],
        trend: [10, 20, 30, 40],
        usedByAgents: ['订单客服助手'],
        auditLog: [],
      },
      isLoading: false,
    });

    renderAt('skill-summary');

    await waitFor(() => {
      expect(screen.getByText('订单摘要')).toBeTruthy();
    });
    expect(screen.getByText('生成订单摘要')).toBeTruthy();
    expect(screen.getByText(/被以下 Agent 引用/)).toBeTruthy();
  });

  it('renders not-found when skill is missing', () => {
    (useAdminSkill as unknown as ReturnType<typeof vi.fn>).mockReturnValue({ data: null, isLoading: false });
    renderAt('nonexistent');
    expect(screen.getByText(/技能不存在或已被删除/)).toBeTruthy();
  });

  it('shows loading state', () => {
    (useAdminSkill as unknown as ReturnType<typeof vi.fn>).mockReturnValue({ data: null, isLoading: true });
    renderAt('skill-summary');
    expect(screen.getByText(/加载中/)).toBeTruthy();
  });
});