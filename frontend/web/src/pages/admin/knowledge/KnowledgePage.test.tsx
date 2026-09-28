import { describe, expect, it, afterEach } from 'vitest';
import { cleanup, fireEvent, screen, within } from '@testing-library/react';
import { qk } from '@/api/shared/query-keys';
import { renderWithProviders } from '@/test-utils/seed';
import KnowledgePage from './KnowledgePage';
import { mockKbs, mockDocs, mockSources, mockTasks, mockEvalCases } from '@/mock/admin/knowledge.fixtures';

function renderPage() {
  return renderWithProviders(<KnowledgePage />, {
    initialEntries: ['/admin/knowledge'],
    seeds: [
      { key: [...qk.admin.knowledge.root, 'kbs', 'w1'], data: mockKbs },
      { key: [...qk.admin.knowledge.root, 'docs', 'w1'], data: mockDocs },
      { key: [...qk.admin.knowledge.root, 'sources', 'w1'], data: mockSources },
      { key: [...qk.admin.knowledge.root, 'tasks', 'w1'], data: mockTasks },
      { key: [...qk.admin.knowledge.root, 'eval', 'w1'], data: mockEvalCases },
    ],
  });
}

describe('AdminKnowledge', () => {
  afterEach(() => cleanup());

  it('renders hero and five sub-tabs', () => {
    renderPage();
    expect(screen.getByText('把企业知识资产管起来。')).toBeTruthy();
    const tabs = ['知识库', '文档', '数据源', '任务', '评测'];
    for (const t of tabs) {
      expect(screen.getAllByText(t).length).toBeGreaterThan(0);
    }
  });

  it('lists kb cards on the default tab', () => {
    renderPage();
    expect(screen.getByText('产品手册 v3')).toBeTruthy();
    expect(screen.getByText('员工手册')).toBeTruthy();
  });

  it('switches to docs tab and shows doc cards', () => {
    renderPage();
    fireEvent.click(screen.getAllByRole('button', { name: /文档/ })[0]);
    expect(screen.getByText('产品手册 v3.pdf')).toBeTruthy();
  });

  it('switches to sources tab and lists fixtures', () => {
    renderPage();
    const tabs = screen.getAllByRole('button', { name: /数据源/ });
    fireEvent.click(tabs[0]);
    expect(screen.getByText('产品 Wiki')).toBeTruthy();
    expect(screen.getByText('官网帮助中心')).toBeTruthy();
  });

  it('opens wizard and renders 4 step indicator', () => {
    renderPage();
    const createBtns = screen.getAllByRole('button', { name: /新建知识库/ });
    fireEvent.click(createBtns[0]);
    expect(screen.getByText('基础信息')).toBeTruthy();
    expect(screen.getByText('关联数据源')).toBeTruthy();
    expect(screen.getByText('检索设置')).toBeTruthy();
    expect(screen.getByText('确认')).toBeTruthy();
  });
});