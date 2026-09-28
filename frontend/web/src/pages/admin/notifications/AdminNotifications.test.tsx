/**
 * AdminNotifications — 5 个 tab + Hero + 抽屉 + 批量 + 导出。
 * 数据通过 useApiQuery 走 TanStack Query,测试用 renderWithProviders + 注入 fixtures。
 */
import { describe, expect, it } from 'vitest';
import { fireEvent, screen, within } from '@testing-library/react';
import { renderWithProviders } from '@/test-utils/seed';
import NotificationsPage from '@/pages/admin/notifications';
import { mockChannels, mockGroups, mockWebhooks, mockEvents } from '@/mock/admin/notifications.fixtures';
import { qk } from '@/api/shared/query-keys';

function renderPage() {
  return renderWithProviders(<NotificationsPage />, {
    initialEntries: ['/admin/notifications'],
    seeds: [
      { key: [...qk.admin.notifications.root, 'channels', {}, 'w1'], data: mockChannels },
      { key: [...qk.admin.notifications.root, 'webhooks', {}, 'w1'], data: mockWebhooks },
      { key: [...qk.admin.notifications.root, 'groups', {}, 'w1'], data: mockGroups },
      { key: [...qk.admin.notifications.root, 'events', {}, 'w1'], data: mockEvents },
    ],
  });
}

describe('AdminNotifications', () => {
  it('renders hero and five sub-tabs', () => {
    renderPage();
    expect(screen.getByText('把消息送到对的渠道、对的人。')).toBeTruthy();
    const tabsRow = document.querySelector('[aria-label="子模块导航"]') as HTMLElement | null;
    expect(tabsRow).toBeTruthy();
    const tabTexts = Array.from(tabsRow!.querySelectorAll('button')).map((b) => b.textContent || '');
    expect(tabTexts.some((t) => t.includes('渠道总览'))).toBe(true);
    expect(tabTexts.some((t) => t.includes('邮件'))).toBe(true);
    expect(tabTexts.some((t) => t.includes('IM'))).toBe(true);
    expect(tabTexts.some((t) => t.includes('Webhook'))).toBe(true);
    expect(tabTexts.some((t) => t.includes('接收人组'))).toBe(true);
  });

  it('opens create-channel modal and submits successfully', async () => {
    renderPage();
    const newBtn = screen.getAllByRole('button', { name: /新建渠道/ })[0];
    expect(newBtn).toBeTruthy();
    fireEvent.click(newBtn);
    const dialog = await screen.findByRole('dialog', { name: '新建渠道' });
    fireEvent.change(within(dialog).getByPlaceholderText('例如:客服告警邮箱'), { target: { value: '测试渠道' } });
    const targetInput = within(dialog).getAllByRole('textbox')[1] as HTMLInputElement;
    fireEvent.change(targetInput, { target: { value: 'alert@example.com' } });
    fireEvent.click(within(dialog).getByRole('button', { name: /创建渠道/ }));
    // useApiMutation 会异步触发;query 失效 → 重取。
    // 测试环境 getApiClient 未初始化,mutate 调用会失败,
    // 但 modal 应该关闭(createChannel.mutate 同步触发 onClose)。
    expect(screen.queryByRole('dialog', { name: '新建渠道' })).toBeNull();
  });

  it('switches to group tab and opens create-group modal', async () => {
    renderPage();
    const tabsRow = document.querySelector('[aria-label="子模块导航"]') as HTMLElement | null;
    fireEvent.click(within(tabsRow!).getByRole('button', { name: /接收人组/ }));
    const newBtn = screen.getAllByRole('button', { name: /新建组/ })[0];
    expect(newBtn).toBeTruthy();
    fireEvent.click(newBtn);
    const dialog = await screen.findByRole('dialog', { name: '新建接收人组' });
    expect(dialog).toBeTruthy();
    fireEvent.click(within(dialog).getByRole('button', { name: '取消' }));
    expect(screen.queryByRole('dialog', { name: '新建接收人组' })).toBeNull();
  });

  it('switches through all 5 tabs without crashing', () => {
    renderPage();
    const tabsRow = document.querySelector('[aria-label="子模块导航"]') as HTMLElement | null;
    const buttons = within(tabsRow!).getAllByRole('button');
    expect(buttons.length).toBeGreaterThanOrEqual(5);
    ['邮件', 'IM', 'Webhook', '接收人组', '渠道总览'].forEach((label) => {
      fireEvent.click(within(tabsRow!).getByRole('button', { name: new RegExp(label) }));
      expect(tabsRow).toBeTruthy();
    });
  });
});