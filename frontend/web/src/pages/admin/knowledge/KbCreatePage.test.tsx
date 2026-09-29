/**
 * KbCreatePage 测试 — 路由 /admin/knowledge/kbs/new
 */
import { describe, expect, it, afterEach } from 'vitest';
import { cleanup, screen } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import { qk } from '@/api/shared/query-keys';
import { renderWithProviders } from '@/test-utils/seed';
import KbCreatePage from './KbCreatePage';
import { mockSources } from '@/mock/admin/knowledge.fixtures';

function renderAt() {
  return renderWithProviders(
    <Routes>
      <Route path="/admin/knowledge/kbs/new" element={<KbCreatePage />} />
    </Routes>,
    {
      initialEntries: ['/admin/knowledge/kbs/new'],
      seeds: [
        { key: [...qk.admin.knowledge.root, 'sources', 'w1'], data: mockSources },
      ],
    },
  );
}

describe('AdminKnowledgeKbCreate', () => {
  afterEach(() => cleanup());

  it('renders the create kb page header and step 1', () => {
    renderAt();
    expect(screen.getByRole('heading', { level: 1, name: '新建知识库' })).toBeTruthy();
    expect(screen.getByRole('link', { name: /返回知识管理/ })).toBeTruthy();
    expect(screen.getByText('基础信息')).toBeTruthy();
  });
});