/**
 * KbDetailPage 测试 — happy-path 渲染 + 反向引用 + 404。
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

vi.mock('@/api/admin/knowledge/useKnowledge', () => ({
  useKnowledgeBase: vi.fn(),
  useKnowledgeDocs: vi.fn(),
  useKnowledgeTasks: vi.fn(),
  useKnowledgeEvalCases: vi.fn(),
}));

import { useKnowledgeBase, useKnowledgeDocs, useKnowledgeTasks, useKnowledgeEvalCases } from '@/api/admin/knowledge/useKnowledge';
import KbDetailPage from './KbDetailPage';

function renderAt(id: string | null) {
  return render(
    <MemoryRouter initialEntries={[id ? `/admin/knowledge/kbs/${id}` : '/admin/knowledge']}>
      <Routes>
        <Route path="/admin/knowledge" element={<div>KnowledgePage</div>} />
        <Route path="/admin/knowledge/kbs/:id" element={<KbDetailPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('KbDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  afterEach(() => cleanup());

  it('renders kb fields with documents list', async () => {
    (useKnowledgeBase as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      data: {
        id: 'kb-prod',
        name: '产品手册 v3',
        description: '对外产品说明',
        owner: '产品团队',
        scope: '公开',
        status: 'indexed',
        docCount: 286,
        vectorCount: 18420,
        updatedAt: '今天 14:32',
        tags: ['产品', '客户'],
        tone: 'brand',
        evalHitRate: 0.94,
      },
      isLoading: false,
    });
    (useKnowledgeDocs as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      data: [
        {
          id: 'doc-1', name: '功能说明.md', type: 'manual', kbId: 'kb-prod', sourceId: 'src-1',
          status: 'parsed', sizeKb: 24, chunks: 32, updatedAt: '今天', citations: 12,
          chunksPreview: [],
        },
        {
          id: 'doc-2', name: 'FAQ.csv', type: 'faq', kbId: 'kb-prod', sourceId: 'src-3',
          status: 'parsed', sizeKb: 18, chunks: 18, updatedAt: '昨天', citations: 8,
          chunksPreview: [],
        },
      ],
    });
    (useKnowledgeTasks as unknown as ReturnType<typeof vi.fn>).mockReturnValue({ data: [] });
    (useKnowledgeEvalCases as unknown as ReturnType<typeof vi.fn>).mockReturnValue({ data: [] });

    renderAt('kb-prod');

    await waitFor(() => {
      expect(screen.getByText('产品手册 v3')).toBeTruthy();
    });
    expect(screen.getByText(/对外产品说明/)).toBeTruthy();
    expect(screen.getByRole('link', { name: /功能说明\.md/ })).toBeTruthy();
    expect(screen.getByRole('link', { name: /FAQ\.csv/ })).toBeTruthy();
    expect(screen.getByText(/最近任务 \(0\)/)).toBeTruthy();
    expect(screen.getByText(/评测用例命中 \(0\)/)).toBeTruthy();
  });

  it('shows recent tasks with failure reason and matched eval cases for the kb', async () => {
    (useKnowledgeBase as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      data: {
        id: 'kb-prod',
        name: '产品手册 v3',
        description: '对外产品说明',
        owner: '产品团队',
        scope: '公开',
        status: 'indexed',
        docCount: 286,
        vectorCount: 18420,
        updatedAt: '今天 14:32',
        tags: ['产品', '客户'],
        tone: 'brand',
        evalHitRate: 0.94,
      },
      isLoading: false,
    });
    (useKnowledgeDocs as unknown as ReturnType<typeof vi.fn>).mockReturnValue({ data: [] });
    (useKnowledgeTasks as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      data: [
        {
          id: 'task-1', name: '产品手册 v3 全文索引', kind: 'index', kbId: 'kb-prod', sourceId: 'src-1',
          status: 'success', progress: 100, items: 286, startedAt: '今天 14:00', duration: '32 分钟',
        },
        {
          id: 'task-x', name: '某失败任务', kind: 'reindex', kbId: 'kb-prod',
          status: 'failed', progress: 12, items: 100, startedAt: '昨天', duration: '失败',
          failureReason: '凭据过期',
        },
      ],
    });
    (useKnowledgeEvalCases as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      data: [
        { id: 'e1', name: '退款政策', query: 'Q', expectedKb: 'kb-faq', actualKb: 'kb-prod', status: 'pass', latency: 0.8, mrr: 0.9 },
        { id: 'e2', name: '误命中', query: 'Q', expectedKb: 'kb-research', actualKb: 'kb-prod', status: 'fail', latency: 1.1, mrr: 0.6 },
      ],
    });

    renderAt('kb-prod');

    await waitFor(() => {
      expect(screen.getByText(/最近任务 \(2\)/)).toBeTruthy();
    });
    expect(screen.getByText(/评测用例命中 \(2\)/)).toBeTruthy();
    expect(screen.getByText('凭据过期')).toBeTruthy();
    expect(screen.getByText('退款政策')).toBeTruthy();
    expect(screen.getByText('误命中')).toBeTruthy();
  });

  it('renders not-found when kb is missing', () => {
    (useKnowledgeBase as unknown as ReturnType<typeof vi.fn>).mockReturnValue({ data: null, isLoading: false });
    (useKnowledgeDocs as unknown as ReturnType<typeof vi.fn>).mockReturnValue({ data: [] });
    (useKnowledgeTasks as unknown as ReturnType<typeof vi.fn>).mockReturnValue({ data: [] });
    (useKnowledgeEvalCases as unknown as ReturnType<typeof vi.fn>).mockReturnValue({ data: [] });
    renderAt('nonexistent');
    expect(screen.getByText(/知识库不存在或已被删除/)).toBeTruthy();
  });

  it('shows loading state', () => {
    (useKnowledgeBase as unknown as ReturnType<typeof vi.fn>).mockReturnValue({ data: null, isLoading: true });
    (useKnowledgeDocs as unknown as ReturnType<typeof vi.fn>).mockReturnValue({ data: [] });
    (useKnowledgeTasks as unknown as ReturnType<typeof vi.fn>).mockReturnValue({ data: [] });
    (useKnowledgeEvalCases as unknown as ReturnType<typeof vi.fn>).mockReturnValue({ data: [] });
    renderAt('kb-prod');
    // DetailSkeleton renders 3 animated placeholder rows
    expect(screen.getAllByText('').length).toBeGreaterThan(0);
    expect(document.querySelectorAll('.animate-pulse').length).toBe(4);
    expect(screen.queryByText(/知识库不存在/)).toBeNull();
  });
});