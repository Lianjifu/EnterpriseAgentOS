import { describe, expect, it, afterEach } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import AdminSkills from './SkillsPage';
import SkillCreatePage from './SkillCreatePage';

async function createSkill(name: string) {
  fireEvent.click(screen.getByRole('button', { name: '新建技能' }));
  fireEvent.change(screen.getByPlaceholderText('例如:客户跟进建议'), { target: { value: name } });
  fireEvent.click(screen.getByRole('button', { name: /下一步/ }));
  fireEvent.click(screen.getByRole('button', { name: /下一步/ }));
  fireEvent.click(screen.getByRole('button', { name: /创建技能/ }));
  expect(await screen.findByRole('heading', { name })).toBeTruthy();
}

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/admin/tools']}>
        <Routes>
          <Route path="/admin/tools" element={<AdminSkills />} />
          <Route path="/admin/tools/new" element={<SkillCreatePage />} />
          <Route path="/admin/tools/:id" element={<div>技能详情页</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('AdminSkills', () => {
  afterEach(() => cleanup());

  it('renders the overview with a type filter and no type tabs', () => {
    renderPage();
    expect(screen.getByText('维护智能体可调用的技能。')).toBeTruthy();
    expect(screen.queryByRole('navigation', { name: '子模块导航' })).toBeNull();
    expect(screen.getByRole('combobox', { name: '类型' })).toBeTruthy();
    expect(screen.getByRole('button', { name: '新建技能' })).toBeTruthy();
  });

  it('walks through the create page and returns a new card', async () => {
    renderPage();
    await createSkill('测试技能');
    expect(screen.getByRole('button', { name: '新建技能' })).toBeTruthy();
  });

  it('publishes a draft from its card', async () => {
    renderPage();
    await createSkill('待发布技能');
    const card = screen.getByRole('heading', { name: '待发布技能' }).closest('article') as HTMLElement;
    fireEvent.click(within(card).getByRole('button', { name: '发布' }));
    expect(within(card).getByRole('button', { name: '已发布' })).toBeTruthy();
    expect(screen.getByText(/已发布「待发布技能」/)).toBeTruthy();
  });

  it('opens delete confirm modal and cancels', async () => {
    renderPage();
    await createSkill('待删除技能');
    const card = screen.getByRole('heading', { name: '待删除技能' }).closest('article') as HTMLElement;
    fireEvent.click(within(card).getByRole('button', { name: '删除' }));
    const dialog = screen.getByRole('dialog', { name: /删除技能/ });
    expect(dialog).toBeTruthy();
    fireEvent.click(within(dialog).getByRole('button', { name: '取消' }));
    expect(screen.queryByRole('dialog', { name: /删除技能:/ })).toBeNull();
  });

  it('keeps export off the filter bar and opens it from a card selection', async () => {
    renderPage();
    const actions = screen.getByRole('group', { name: '列表操作' });
    expect(within(actions).queryByRole('button', { name: '导出' })).toBeNull();
    expect(screen.queryByRole('combobox', { name: '排序' })).toBeNull();
    await createSkill('待导出技能');
    const card = screen.getByRole('heading', { name: '待导出技能' }).closest('article') as HTMLElement;
    fireEvent.click(within(card).getByRole('button', { name: /选择/ }));
    fireEvent.click(screen.getByRole('button', { name: /批量导出/ }));
    const dialog = screen.getByRole('dialog', { name: '导出技能' });
    expect(dialog).toBeTruthy();
    fireEvent.click(within(dialog).getByRole('button', { name: /下一步/ }));
    const jsonBtn = within(dialog).getByRole('button', { name: /^JSON/ });
    fireEvent.click(jsonBtn);
    fireEvent.click(within(dialog).getByRole('button', { name: '关闭对话框' }));
    expect(screen.queryByRole('dialog', { name: '导出技能' })).toBeNull();
  });

  it('opens the skill page when an overview card is clicked', async () => {
    renderPage();
    await createSkill('可进入技能');
    fireEvent.click(screen.getByRole('button', { name: '查看 可进入技能 详情' }));
    expect(screen.getByText('技能详情页')).toBeTruthy();
  });

  it('opens the detail page in editing mode from a card', async () => {
    renderPage();
    await createSkill('待编辑技能');
    const card = screen.getByRole('heading', { name: '待编辑技能' }).closest('article') as HTMLElement;
    fireEvent.click(within(card).getByRole('button', { name: '编辑' }));
    expect(screen.getByText('技能详情页')).toBeTruthy();
  });
});