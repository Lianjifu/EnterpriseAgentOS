/**
 * SourceCreatePage 测试 — 路由 /admin/knowledge/sources/new
 */
import { describe, expect, it, afterEach } from 'vitest';
import { cleanup, screen } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import { renderWithProviders } from '@/test-utils/seed';
import SourceCreatePage from './SourceCreatePage';

function renderAt() {
  return renderWithProviders(
    <Routes>
      <Route path="/admin/knowledge/sources/new" element={<SourceCreatePage />} />
    </Routes>,
    {
      initialEntries: ['/admin/knowledge/sources/new'],
    },
  );
}

describe('AdminKnowledgeSourceCreate', () => {
  afterEach(() => cleanup());

  it('renders the create source page header and form', () => {
    renderAt();
    expect(screen.getByRole('heading', { level: 1, name: '新增数据源' })).toBeTruthy();
    expect(screen.getByRole('link', { name: /返回知识管理/ })).toBeTruthy();
    expect(screen.getByText('数据源配置')).toBeTruthy();
  });
});