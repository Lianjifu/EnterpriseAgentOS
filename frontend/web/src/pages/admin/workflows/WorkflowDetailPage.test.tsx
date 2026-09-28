/**
 * WorkflowDetailPage 测试 — happy-path 渲染 + 反向引用 + 404。
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

vi.mock('@/api/admin/workflows/useWorkflows', () => ({
  useWorkflow: vi.fn(),
}));

import { useWorkflow } from '@/api/admin/workflows/useWorkflows';
import WorkflowDetailPage from './WorkflowDetailPage';

function renderAt(id: string | null) {
  return render(
    <MemoryRouter initialEntries={[id ? `/admin/workflows/${id}` : '/admin/workflows']}>
      <Routes>
        <Route path="/admin/workflows" element={<div>WorkflowsPage</div>} />
        <Route path="/admin/workflows/:id" element={<WorkflowDetailPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('WorkflowDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders workflow fields', async () => {
    (useWorkflow as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      data: {
        id: 'wf-weekly',
        name: '周报自动生成',
        description: '每周五自动汇总并发送',
        owner: '运营团队',
        scene: '运营',
        trigger: '定时触发',
        status: 'published',
        callCount: 348,
        inputs: 2,
        outputs: 1,
        createdAt: '2 月前',
        updatedAt: '今天 12:00',
        boundAgents: [],
        versions: [{ v: 'v1.0', at: '2 月前', operator: '运营团队', note: '首发' }],
        initialNodes: [],
        initialEdges: [],
      },
      isLoading: false,
    });

    renderAt('wf-weekly');

    await waitFor(() => {
      expect(screen.getByText('周报自动生成')).toBeTruthy();
    });
    expect(screen.getByText(/每周五自动汇总并发送/)).toBeTruthy();
    expect(screen.getByText(/被以下 Agent 引用/)).toBeTruthy();
  });

  it('renders not-found when workflow is missing', () => {
    (useWorkflow as unknown as ReturnType<typeof vi.fn>).mockReturnValue({ data: null, isLoading: false });
    renderAt('nonexistent');
    expect(screen.getByText(/流程不存在或已被删除/)).toBeTruthy();
  });

  it('shows loading state', () => {
    (useWorkflow as unknown as ReturnType<typeof vi.fn>).mockReturnValue({ data: null, isLoading: true });
    renderAt('wf-weekly');
    expect(screen.getByText(/加载中/)).toBeTruthy();
  });
});