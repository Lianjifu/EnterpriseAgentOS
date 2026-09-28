import { describe, expect, it, afterEach } from 'vitest';
import { cleanup, fireEvent, screen, within } from '@testing-library/react';
import { qk } from '@/api/shared/query-keys';
import { renderWithProviders } from '@/test-utils/seed';
import QuotasPage from '@/pages/admin/quotas';
import { mockBudgets, mockDepartments, mockUsage, mockAlerts } from '@/mock/admin/quotas.fixtures';

function renderPage() {
  return renderWithProviders(<QuotasPage />, {
    initialEntries: ['/admin/quotas'],
    seeds: [
      { key: [...qk.admin.quotas.root, 'budgets', 'w1'], data: mockBudgets },
      { key: [...qk.admin.quotas.root, 'departments', 'w1'], data: mockDepartments },
      { key: [...qk.admin.quotas.root, 'usage', 'w1'], data: mockUsage },
      { key: [...qk.admin.quotas.root, 'alerts', 'w1'], data: mockAlerts },
    ],
  });
}

describe('AdminQuotas', () => {
  afterEach(() => cleanup());

  it('renders hero and five sub-tabs', () => {
    renderPage();
    expect(screen.getByText('让每一笔用量都心中有数。')).toBeTruthy();
    const tabsRow = document.querySelector('[aria-label="子模块导航"]') as HTMLElement | null;
    expect(tabsRow).toBeTruthy();
    const tabTexts = Array.from(tabsRow!.querySelectorAll('button')).map((b) => b.textContent || '');
    expect(tabTexts.some((t) => t.includes('额度总览'))).toBe(true);
    expect(tabTexts.some((t) => t.includes('企业预算'))).toBe(true);
    expect(tabTexts.some((t) => t.includes('部门额度'))).toBe(true);
    expect(tabTexts.some((t) => t.includes('用量分析'))).toBe(true);
    expect(tabTexts.some((t) => t.includes('告警规则'))).toBe(true);
  });

  it('renders hero totals derived from budgets fixture', () => {
    renderPage();
    expect(screen.getByText('让每一笔用量都心中有数。')).toBeTruthy();
    // Total budget = 1_200_000 + 320_000 + 60_000 + 40_000 = 1_620_000
    expect(screen.getAllByText(/1,620,000/).length).toBeGreaterThan(0);
  });

  it('switches to enterprise tab and opens create-budget wizard (3 steps -> notice)', () => {
    renderPage();
    const tabsRow = document.querySelector('[aria-label="子模块导航"]') as HTMLElement | null;
    fireEvent.click(within(tabsRow!).getByRole('button', { name: /企业预算/ }));
    const newBtn = screen.getAllByRole('button', { name: /新建预算/ })[0];
    expect(newBtn).toBeTruthy();
    fireEvent.click(newBtn);
    const wizard = screen.getByRole('dialog', { name: '新建企业预算' });
    fireEvent.change(within(wizard).getByPlaceholderText('例如:2026 Q3 运营预算'), { target: { value: '测试预算' } });
    fireEvent.click(within(wizard).getByRole('button', { name: /下一步/ }));
    fireEvent.click(within(wizard).getByRole('button', { name: /下一步/ }));
    fireEvent.click(within(wizard).getByRole('button', { name: /创建预算/ }));
    expect(screen.queryByRole('dialog', { name: '新建企业预算' })).toBeNull();
  });

  it('switches to alert tab and opens create-alert modal', () => {
    renderPage();
    const tabsRow = document.querySelector('[aria-label="子模块导航"]') as HTMLElement | null;
    fireEvent.click(within(tabsRow!).getByRole('button', { name: /告警规则/ }));
    const newBtn = screen.getAllByRole('button', { name: /新建规则/ })[0];
    expect(newBtn).toBeTruthy();
    fireEvent.click(newBtn);
    const dialog = screen.getByRole('dialog', { name: '新建告警规则' });
    expect(dialog).toBeTruthy();
    fireEvent.click(within(dialog).getByRole('button', { name: '取消' }));
    expect(screen.queryByRole('dialog', { name: '新建告警规则' })).toBeNull();
  });

  it('switches through all 5 tabs without crashing', () => {
    renderPage();
    const tabsRow = document.querySelector('[aria-label="子模块导航"]') as HTMLElement | null;
    const buttons = within(tabsRow!).getAllByRole('button');
    expect(buttons.length).toBeGreaterThanOrEqual(5);
    ['企业预算', '部门额度', '用量分析', '告警规则', '额度总览'].forEach((label) => {
      fireEvent.click(within(tabsRow!).getByRole('button', { name: new RegExp(label) }));
      expect(tabsRow).toBeTruthy();
    });
  });
});