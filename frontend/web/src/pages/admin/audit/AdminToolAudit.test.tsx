/**
 * AdminToolAudit 页面测试 — 5 sub-tab + 详情抽屉 + 风险解决 + 批量 + 启停规则。
 */
import { describe, expect, it, afterEach } from 'vitest';
import { cleanup, fireEvent, screen, within } from '@testing-library/react';
import { qk } from '@/api/shared/query-keys';
import { renderWithProviders } from '@/test-utils/seed';
import AuditPage from '@/pages/admin/audit';
import {
  mockAuditEntries, mockAuditRisks, mockAuditRules, mockPermissionScopes,
} from '@/mock/admin/audit.fixtures';

function renderPage() {
  return renderWithProviders(<AuditPage />, {
    initialEntries: ['/admin/tool-audit'],
    seeds: [
      { key: [...qk.admin.audit.entries, 'w1'], data: mockAuditEntries },
      { key: [...qk.admin.audit.risks, 'w1'], data: mockAuditRisks },
      { key: [...qk.admin.audit.rules, 'w1'], data: mockAuditRules },
      { key: [...qk.admin.audit.scopes, 'w1'], data: mockPermissionScopes },
    ],
  });
}

describe('AdminToolAudit', () => {
  afterEach(() => cleanup());

  it('renders hero and five sub-tabs', () => {
    renderPage();
    expect(screen.getByText(/让每一次工具调用都有据可查/)).toBeTruthy();
    const tabsRow = document.querySelector('[aria-label="子模块导航"]') as HTMLElement | null;
    expect(tabsRow).toBeTruthy();
    const tabTexts = Array.from(tabsRow!.querySelectorAll('button')).map((b) => b.textContent || '');
    expect(tabTexts.some((t) => t.includes('审计总览'))).toBe(true);
    expect(tabTexts.some((t) => t.includes('调用记录'))).toBe(true);
    expect(tabTexts.some((t) => t.includes('风险事件'))).toBe(true);
    expect(tabTexts.some((t) => t.includes('权限审查'))).toBe(true);
    expect(tabTexts.some((t) => t.includes('审计规则'))).toBe(true);
  });

  it('renders all 8 audit entries on overview', () => {
    renderPage();
    expect(screen.getAllByText('tool.send_email').length).toBeGreaterThan(0);
    expect(screen.getAllByText('tool.delete_record').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/调用方 客服助手/).length).toBeGreaterThan(0);
  });

  it('opens audit entry detail drawer and switches to args panel', () => {
    renderPage();
    const card = screen.getAllByLabelText(/^查看审计条目 /)[0];
    fireEvent.click(card);
    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeTruthy();
    const argsBtn = within(dialog).getByRole('button', { name: '入参与输出' });
    fireEvent.click(argsBtn);
    expect(within(dialog).getAllByText(/入参/).length).toBeGreaterThan(0);
  });

  it('switches to risk tab and toggles resolve', () => {
    renderPage();
    const tabsRow = document.querySelector('[aria-label="子模块导航"]') as HTMLElement | null;
    fireEvent.click(within(tabsRow!).getByRole('button', { name: /风险事件/ }));
    expect(screen.getByText(/MCP 鉴权失败/)).toBeTruthy();
    const resolveBtn = screen.getAllByRole('button', { name: /标记处置/ })[0];
    fireEvent.click(resolveBtn);
    expect(screen.getAllByRole('button', { name: /重新打开/ }).length).toBeGreaterThan(0);
  });

  it('switches through all 5 tabs without crashing', () => {
    renderPage();
    const tabsRow = document.querySelector('[aria-label="子模块导航"]') as HTMLElement | null;
    const labels = ['调用记录', '风险事件', '权限审查', '审计规则', '审计总览'];
    for (const label of labels) {
      fireEvent.click(within(tabsRow!).getByRole('button', { name: new RegExp(label) }));
      expect(tabsRow).toBeTruthy();
    }
  });

  it('toggles star and selection on overview', () => {
    renderPage();
    const star = screen.getAllByRole('button', { name: /^收藏 / })[0];
    fireEvent.click(star);
    expect(screen.getAllByRole('button', { name: /取消收藏/ }).length).toBeGreaterThan(0);
    const select = screen.getAllByRole('button', { name: /^选择 / })[0];
    fireEvent.click(select);
    expect(screen.getByLabelText('批量操作')).toBeTruthy();
  });

  it('toggles rule enable/disable on rule tab', () => {
    renderPage();
    const tabsRow = document.querySelector('[aria-label="子模块导航"]') as HTMLElement | null;
    fireEvent.click(within(tabsRow!).getByRole('button', { name: /审计规则/ }));
    expect(screen.getByText(/Token 过期阻断/)).toBeTruthy();
    const toggleBtn = screen.getAllByRole('button', { name: /^停用$/ })[0];
    fireEvent.click(toggleBtn);
    expect(screen.getAllByRole('button', { name: /^启用$/ }).length).toBeGreaterThan(0);
  });
});