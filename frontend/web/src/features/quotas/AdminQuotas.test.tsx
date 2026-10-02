/**
 * AdminQuotas — 对齐模型管理：无子模块 Tab，列表工具栏 + 视图筛选。
 */
import { describe, expect, it, afterEach } from 'vitest';
import { cleanup, fireEvent, screen, within } from '@testing-library/react';
import { qk } from '@/api/shared/query-keys';
import { renderWithProviders } from '@/test-utils/seed';
import QuotasPage from './QuotasPage';
import { mockBudgets, mockDepartments, mockUsage, mockAlerts } from './fixtures';

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

  it('renders hero without sub-module tabs', () => {
    renderPage();
    expect(screen.getByText('让每一笔用量都心中有数。')).toBeTruthy();
    expect(screen.queryByLabelText('子模块导航')).toBeNull();
    expect(screen.getByRole('combobox', { name: '视图' })).toBeTruthy();
  });

  it('renders hero totals derived from budgets fixture', () => {
    renderPage();
    expect(screen.getByText('让每一笔用量都心中有数。')).toBeTruthy();
    // Total budget = 1_200_000 + 320_000 + 60_000 + 40_000 = 1_620_000
    expect(screen.getAllByText(/1,620,000/).length).toBeGreaterThan(0);
  });

  it('renders budget cards and action buttons', () => {
    renderPage();
    expect(screen.getByText('2026 年企业总预算')).toBeTruthy();
    expect(screen.getAllByRole('button', { name: /^编辑$/ }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('button', { name: /导出/ }).length).toBeGreaterThan(0);
  });

  it('opens create-budget wizard from toolbar', () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /新建预算/ }));
    const wizard = screen.getByRole('dialog', { name: '新建企业预算' });
    fireEvent.change(within(wizard).getByPlaceholderText('例如:2026 Q3 运营预算'), { target: { value: '测试预算' } });
    fireEvent.click(within(wizard).getByRole('button', { name: /下一步/ }));
    fireEvent.click(within(wizard).getByRole('button', { name: /下一步/ }));
    fireEvent.click(within(wizard).getByRole('button', { name: /创建预算/ }));
    expect(screen.queryByRole('dialog', { name: '新建企业预算' })).toBeNull();
  });

  it('switches to alert view and opens create-alert modal', () => {
    renderPage();
    fireEvent.change(screen.getByRole('combobox', { name: '视图' }), { target: { value: 'alert' } });
    fireEvent.click(screen.getByRole('button', { name: /新建规则/ }));
    const dialog = screen.getByRole('dialog', { name: '新建告警规则' });
    expect(dialog).toBeTruthy();
    fireEvent.click(within(dialog).getByRole('button', { name: '取消' }));
    expect(screen.queryByRole('dialog', { name: '新建告警规则' })).toBeNull();
  });

  it('switches through secondary views via select', () => {
    renderPage();
    fireEvent.change(screen.getByRole('combobox', { name: '视图' }), { target: { value: 'department' } });
    expect(screen.getByText('客户成功部')).toBeTruthy();
    fireEvent.change(screen.getByRole('combobox', { name: '视图' }), { target: { value: 'usage' } });
    expect(screen.getByText('本月 Token 用量')).toBeTruthy();
    fireEvent.change(screen.getByRole('combobox', { name: '视图' }), { target: { value: 'alert' } });
    expect(screen.getByText('Token 用量月度预警')).toBeTruthy();
    fireEvent.change(screen.getByRole('combobox', { name: '视图' }), { target: { value: 'budget' } });
    expect(screen.getByText('2026 年企业总预算')).toBeTruthy();
  });
});
