/**
 * AdminKnowledge 列表页测试 — Hero / 5 子模块 / 卡片 / 批量工具栏 / 跳转导航。
 *
 * 详情/新建流程已迁到独立页面,本页只验证列表行为 + 点击触发导航。
 */
import { describe, expect, it, afterEach } from 'vitest';
import { cleanup, fireEvent, screen, within } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import { qk } from '@/api/shared/query-keys';
import { renderWithProviders } from '@/test-utils/seed';
import KnowledgePage from './KnowledgePage';
import KbDetailPage from './KbDetailPage';
import DocDetailPage from './DocDetailPage';
import SourceDetailPage from './SourceDetailPage';
import KbCreatePage from './KbCreatePage';
import SourceCreatePage from './SourceCreatePage';
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

function renderApp(initialPath: string) {
  return renderWithProviders(
    <Routes>
      <Route path="/admin/knowledge" element={<KnowledgePage />} />
      <Route path="/admin/knowledge/kbs/new" element={<KbCreatePage />} />
      <Route path="/admin/knowledge/kbs/:id" element={<KbDetailPage />} />
      <Route path="/admin/knowledge/docs/:id" element={<DocDetailPage />} />
      <Route path="/admin/knowledge/sources/new" element={<SourceCreatePage />} />
      <Route path="/admin/knowledge/sources/:id" element={<SourceDetailPage />} />
    </Routes>,
    {
      initialEntries: [initialPath],
      seeds: [
        { key: [...qk.admin.knowledge.root, 'kbs', 'w1'], data: mockKbs },
        { key: [...qk.admin.knowledge.root, 'docs', 'w1'], data: mockDocs },
        { key: [...qk.admin.knowledge.root, 'sources', 'w1'], data: mockSources },
        { key: [...qk.admin.knowledge.root, 'tasks', 'w1'], data: mockTasks },
        { key: [...qk.admin.knowledge.root, 'eval', 'w1'], data: mockEvalCases },
        { key: [...qk.admin.knowledge.root, 'kb', 'kb-prod', 'w1'], data: mockKbs[0] },
        { key: [...qk.admin.knowledge.root, 'kb', 'kb-hr', 'w1'], data: mockKbs[1] },
      ],
    },
  );
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

  it('navigates to kb detail page when clicking a card', () => {
    renderApp('/admin/knowledge');
    fireEvent.click(screen.getByRole('button', { name: /查看 产品手册 v3 详情/ }));
    expect(screen.getByRole('link', { name: /返回知识管理/ })).toBeTruthy();
    expect(screen.getByRole('heading', { level: 1, name: '产品手册 v3' })).toBeTruthy();
  });

  it('navigates to doc detail page when clicking a card', () => {
    renderApp('/admin/knowledge');
    fireEvent.click(screen.getAllByRole('button', { name: /文档/ })[0]);
    fireEvent.click(screen.getByRole('button', { name: /查看 产品手册 v3.pdf 详情/ }));
    expect(screen.getByRole('link', { name: /返回知识管理/ })).toBeTruthy();
    expect(screen.getByRole('heading', { level: 1, name: '产品手册 v3.pdf' })).toBeTruthy();
  });

  it('navigates to create kb page (4 steps)', () => {
    renderApp('/admin/knowledge');
    fireEvent.click(screen.getAllByRole('button', { name: /新建知识库/ })[0]);
    expect(screen.getByRole('link', { name: /返回知识管理/ })).toBeTruthy();
    expect(screen.getByRole('heading', { level: 1, name: '新建知识库' })).toBeTruthy();
    expect(screen.getByText('基础信息')).toBeTruthy();
  });

  it('navigates to create source page', () => {
    renderApp('/admin/knowledge');
    fireEvent.click(screen.getAllByRole('button', { name: /数据源/ })[0]);
    fireEvent.click(screen.getByRole('button', { name: /新增数据源/ }));
    expect(screen.getByRole('heading', { level: 1, name: '新增数据源' })).toBeTruthy();
  });

  it('navigates to source detail page when clicking a card', () => {
    renderApp('/admin/knowledge');
    fireEvent.click(screen.getAllByRole('button', { name: /数据源/ })[0]);
    fireEvent.click(screen.getByRole('button', { name: /查看 产品 Wiki 详情/ }));
    expect(screen.getByRole('heading', { level: 1, name: '产品 Wiki' })).toBeTruthy();
  });

  it('task table has target-kb links', () => {
    renderPage();
    const tabs = screen.getAllByRole('button', { name: /任务/ });
    fireEvent.click(tabs[0]);
    expect(screen.getByRole('columnheader', { name: /目标 KB/ })).toBeTruthy();
    expect(screen.getAllByRole('link', { name: /产品手册 v3/ }).length).toBeGreaterThan(0);
  });

  it('eval tab shows linked expected/actual kb names and per-kb aggregation table', () => {
    renderPage();
    const evalTab = screen.getAllByRole('button', { name: /评测/ })[0];
    fireEvent.click(evalTab);
    expect(screen.getByText(/预期/)).toBeTruthy();
    expect(screen.getByText(/实际/)).toBeTruthy();
    expect(screen.getAllByRole('link', { name: /员工手册/ }).length).toBeGreaterThan(0);
    expect(screen.getByText(/知识库命中率分布/)).toBeTruthy();
    expect(screen.getByText('用例数')).toBeTruthy();
    expect(screen.getAllByText('通过率').length).toBeGreaterThan(0);
    expect(screen.getAllByText('平均 MRR').length).toBeGreaterThan(0);
    expect(screen.getAllByText('平均延迟').length).toBeGreaterThan(0);
  });
});