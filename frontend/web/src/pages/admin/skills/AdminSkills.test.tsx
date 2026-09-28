import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import AdminSkills from '@/pages/admin/skills';

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/admin/tools']}>
        <AdminSkills />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('AdminSkills', () => {
  it('renders hero and five sub-tabs', () => {
    renderPage();
    expect(screen.getByText('把所有技能统一管起来,让用户安心选用。')).toBeTruthy();
    const tabsRow = document.querySelector('[aria-label="子模块导航"]') as HTMLElement | null;
    expect(tabsRow).toBeTruthy();
    const tabTexts = Array.from(tabsRow!.querySelectorAll('button')).map((b) => b.textContent || '');
    expect(tabTexts.some((t) => t.includes('技能总览'))).toBe(true);
    expect(tabTexts.some((t) => t.includes('Skill 技能'))).toBe(true);
    expect(tabTexts.some((t) => t.includes('Tool 技能'))).toBe(true);
    expect(tabTexts.some((t) => t.includes('MCP 技能'))).toBe(true);
    expect(tabTexts.some((t) => t.includes('导入与导出'))).toBe(true);
  });

  it('walks through the create-skill wizard (3 steps -> new card appears)', () => {
    renderPage();
    const createBtns = screen.getAllByRole('button', { name: /新增技能/ });
    fireEvent.click(createBtns[0]);
    const wizard = screen.getByRole('dialog', { name: '新增技能' });
    fireEvent.change(within(wizard).getByPlaceholderText('例如:客户跟进建议'), { target: { value: '测试技能' } });
    fireEvent.click(within(wizard).getByRole('button', { name: /下一步/ }));
    fireEvent.click(within(wizard).getByRole('button', { name: /下一步/ }));
    fireEvent.click(within(wizard).getByRole('button', { name: /创建技能/ }));
    expect(screen.queryByRole('dialog', { name: '新增技能' })).toBeNull();
    expect(screen.getByText('测试技能')).toBeTruthy();
  });

  it('opens delete confirm modal and cancels', () => {
    renderPage();
    const tabsRow = document.querySelector('[aria-label="子模块导航"]') as HTMLElement | null;
    fireEvent.click(within(tabsRow!).getByRole('button', { name: /导入与导出/ }));
    const tabsRow2 = document.querySelector('[aria-label="子模块导航"]') as HTMLElement | null;
    fireEvent.click(within(tabsRow2!).getByRole('button', { name: /技能总览/ }));
    const cards = document.querySelectorAll('article');
    expect(cards.length).toBeGreaterThan(0);
    const firstCard = cards[0] as HTMLElement;
    const menuBtn = within(firstCard).getByRole('button', { name: /操作菜单/ });
    fireEvent.click(menuBtn);
    const deleteBtn = screen.getByRole('menuitem', { name: /删除/ });
    fireEvent.click(deleteBtn);
    const dialog = screen.getByRole('dialog', { name: /删除技能/ });
    expect(dialog).toBeTruthy();
    fireEvent.click(within(dialog).getByRole('button', { name: '取消' }));
    expect(screen.queryByRole('dialog', { name: /删除技能:/ })).toBeNull();
  });

  it('opens export modal, selects JSON and closes it', () => {
    renderPage();
    const exportBtn = screen.getAllByRole('button', { name: /^导出$/ }).find((b) => b.closest('.skills-page') !== null);
    expect(exportBtn).toBeTruthy();
    fireEvent.click(exportBtn!);
    const dialog = screen.getByRole('dialog', { name: '导出技能' });
    expect(dialog).toBeTruthy();
    fireEvent.click(within(dialog).getByRole('button', { name: /下一步/ }));
    const jsonBtn = within(dialog).getByRole('button', { name: /^JSON/ });
    fireEvent.click(jsonBtn);
    fireEvent.click(within(dialog).getByRole('button', { name: '关闭对话框' }));
    expect(screen.queryByRole('dialog', { name: '导出技能' })).toBeNull();
  });
});