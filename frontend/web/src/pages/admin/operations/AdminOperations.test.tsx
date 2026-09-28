/**
 * AdminOperations 页面测试 — 5 sub-tab + 详情抽屉 + 异常解决 + 批量导出。
 */
import { describe, expect, it, afterEach } from 'vitest';
import { cleanup, fireEvent, screen, within } from '@testing-library/react';
import { qk } from '@/api/shared/query-keys';
import { renderWithProviders } from '@/test-utils/seed';
import OperationsPage from '@/pages/admin/operations';
import {
  mockIncidents, mockKindStats, mockSessions, mockSpans,
} from '@/mock/admin/operations.fixtures';

function renderPage() {
  return renderWithProviders(<OperationsPage />, {
    initialEntries: ['/admin/operations'],
    seeds: [
      { key: [...qk.admin.operations.sessions, 'w1'], data: mockSessions },
      { key: [...qk.admin.operations.spans, 'w1'], data: mockSpans },
      { key: [...qk.admin.operations.incidents, 'w1'], data: mockIncidents },
      { key: [...qk.admin.operations.kindStats, 'w1'], data: mockKindStats },
      { key: [...qk.admin.operations.summary, 'w1'], data: { sessions: mockSessions, spans: mockSpans, incidents: mockIncidents, kindStats: mockKindStats } },
    ],
  });
}

describe('AdminOperations', () => {
  afterEach(() => cleanup());

  it('renders hero and five sub-tabs', () => {
    renderPage();
    expect(screen.getByText(/把每一次会话还原成可追溯的证据链/)).toBeTruthy();
    const tabsRow = document.querySelector('[aria-label="子模块导航"]') as HTMLElement | null;
    expect(tabsRow).toBeTruthy();
    const tabTexts = Array.from(tabsRow!.querySelectorAll('button')).map((b) => b.textContent || '');
    expect(tabTexts.some((t) => t.includes('链路总览'))).toBe(true);
    expect(tabTexts.some((t) => t.includes('会话列表'))).toBe(true);
    expect(tabTexts.some((t) => t.includes('轨迹详情'))).toBe(true);
    expect(tabTexts.some((t) => t.includes('类型分布'))).toBe(true);
    expect(tabTexts.some((t) => t.includes('异常事件'))).toBe(true);
  });

  it('renders all 8 sessions from fixture on overview', () => {
    renderPage();
    expect(screen.getByText('ss-2025-09-28-001')).toBeTruthy();
    expect(screen.getByText('ss-2025-09-28-008')).toBeTruthy();
    expect(screen.getAllByText('客服助手').length).toBeGreaterThan(0);
  });

  it('opens session detail drawer and switches to spans panel', () => {
    renderPage();
    const card = screen.getAllByLabelText(/^查看会话 /)[0];
    fireEvent.click(card);
    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeTruthy();
    const spansBtn = within(dialog).getByRole('button', { name: '调用链路' });
    fireEvent.click(spansBtn);
    expect(within(dialog).getAllByText(/llm.chat/).length).toBeGreaterThan(0);
  });

  it('switches to incident tab and toggles resolve', () => {
    renderPage();
    const tabsRow = document.querySelector('[aria-label="子模块导航"]') as HTMLElement | null;
    fireEvent.click(within(tabsRow!).getByRole('button', { name: /异常事件/ }));
    expect(screen.getByText(/GitHub MCP 鉴权失败/)).toBeTruthy();
    const resolveBtn = screen.getAllByRole('button', { name: /标记解决/ })[0];
    fireEvent.click(resolveBtn);
    expect(screen.getAllByRole('button', { name: /重新打开/ }).length).toBeGreaterThan(0);
  });

  it('switches through all 5 tabs without crashing', () => {
    renderPage();
    const tabsRow = document.querySelector('[aria-label="子模块导航"]') as HTMLElement | null;
    const labels = ['会话列表', '轨迹详情', '类型分布', '异常事件', '链路总览'];
    for (const label of labels) {
      fireEvent.click(within(tabsRow!).getByRole('button', { name: new RegExp(label) }));
      expect(tabsRow).toBeTruthy();
    }
  });

  it('toggles star and batch selection on overview', () => {
    renderPage();
    const star = screen.getAllByRole('button', { name: /^收藏 / })[0];
    fireEvent.click(star);
    expect(screen.getAllByRole('button', { name: /取消收藏/ }).length).toBeGreaterThan(0);
    const select = screen.getAllByRole('button', { name: /^选择会话 / })[0];
    fireEvent.click(select);
    expect(screen.getByLabelText('批量操作')).toBeTruthy();
  });
});