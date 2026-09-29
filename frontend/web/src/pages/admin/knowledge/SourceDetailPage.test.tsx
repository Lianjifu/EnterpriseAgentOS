/**
 * SourceDetailPage 测试 — 路由 /admin/knowledge/sources/:id
 */
import { describe, expect, it, afterEach } from 'vitest';
import { cleanup, screen } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import { qk } from '@/api/shared/query-keys';
import { renderWithProviders } from '@/test-utils/seed';
import SourceDetailPage from './SourceDetailPage';
import { mockKbs, mockDocs, mockSources, mockTasks } from '@/mock/admin/knowledge.fixtures';

function renderAt(id: string) {
  return renderWithProviders(
    <Routes>
      <Route path="/admin/knowledge/sources/:id" element={<SourceDetailPage />} />
    </Routes>,
    {
      initialEntries: [`/admin/knowledge/sources/${id}`],
      seeds: [
        { key: [...qk.admin.knowledge.root, 'kbs', 'w1'], data: mockKbs },
        { key: [...qk.admin.knowledge.root, 'docs', 'w1'], data: mockDocs },
        { key: [...qk.admin.knowledge.root, 'sources', 'w1'], data: mockSources },
        { key: [...qk.admin.knowledge.root, 'tasks', 'w1'], data: mockTasks },
      ],
    },
  );
}

describe('AdminKnowledgeSourceDetail', () => {
  afterEach(() => cleanup());

  it('renders source name, stat pair, linked kbs, tasks and docs for known id', () => {
    renderAt('src-1');
    expect(screen.getByRole('heading', { level: 1, name: '产品 Wiki' })).toBeTruthy();
    expect(screen.getByRole('link', { name: /返回知识管理/ })).toBeTruthy();
    expect(screen.getByText('条目数')).toBeTruthy();
    expect(screen.getByText('最近同步')).toBeTruthy();
    expect(screen.getByText(/关联知识库 \(/)).toBeTruthy();
    expect(screen.getByText(/同步任务历史 \(/)).toBeTruthy();
    expect(screen.getByText(/全部文档 \(/)).toBeTruthy();
  });

  it('shows not-found when id is unknown', () => {
    renderAt('src-does-not-exist');
    expect(screen.getByText('数据源不存在或已被删除')).toBeTruthy();
  });
});