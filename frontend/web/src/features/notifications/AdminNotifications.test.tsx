/**
 * AdminNotifications — 对齐模型管理：无子模块 Tab，列表工具栏 + 视图筛选。
 */
import { describe, expect, it, afterEach } from 'vitest';
import { cleanup, fireEvent, screen, within } from '@testing-library/react';
import { renderWithProviders } from '@/test-utils/seed';
import NotificationsPage from './NotificationsPage';
import { mockChannels, mockGroups, mockWebhooks, mockEvents } from './fixtures';
import { qk } from '@/api/shared/query-keys';

function renderPage() {
  return renderWithProviders(<NotificationsPage />, {
    initialEntries: ['/admin/notifications'],
    seeds: [
      { key: [...qk.admin.notifications.root, 'channels', 'w1'], data: mockChannels },
      { key: [...qk.admin.notifications.root, 'webhooks', 'w1'], data: mockWebhooks },
      { key: [...qk.admin.notifications.root, 'groups', 'w1'], data: mockGroups },
      { key: [...qk.admin.notifications.root, 'events', 'w1'], data: mockEvents },
    ],
  });
}

describe('AdminNotifications', () => {
  afterEach(() => cleanup());

  it('renders hero without sub-module tabs', () => {
    renderPage();
    expect(screen.getByText('把消息送到对的渠道、对的人。')).toBeTruthy();
    expect(screen.queryByLabelText('子模块导航')).toBeNull();
    expect(screen.getByRole('combobox', { name: '视图' })).toBeTruthy();
  });

  it('renders channel cards and action buttons', () => {
    renderPage();
    expect(screen.getByText('客服告警邮箱')).toBeTruthy();
    expect(screen.getAllByRole('button', { name: /^编辑$/ }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('button', { name: /导出/ }).length).toBeGreaterThan(0);
  });

  it('opens create-channel modal from toolbar', async () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /新建渠道/ }));
    const dialog = await screen.findByRole('dialog', { name: '新建渠道' });
    fireEvent.change(within(dialog).getByPlaceholderText('例如:客服告警邮箱'), { target: { value: '测试渠道' } });
    const targetInput = within(dialog).getAllByRole('textbox')[1] as HTMLInputElement;
    fireEvent.change(targetInput, { target: { value: 'alert@example.com' } });
    fireEvent.click(within(dialog).getByRole('button', { name: /创建渠道/ }));
    expect(screen.queryByRole('dialog', { name: '新建渠道' })).toBeNull();
  });

  it('switches to group view and opens create-group modal', async () => {
    renderPage();
    fireEvent.change(screen.getByRole('combobox', { name: '视图' }), { target: { value: 'group' } });
    fireEvent.click(screen.getByRole('button', { name: /新建组/ }));
    const dialog = await screen.findByRole('dialog', { name: '新建接收人组' });
    expect(dialog).toBeTruthy();
    fireEvent.click(within(dialog).getByRole('button', { name: '取消' }));
    expect(screen.queryByRole('dialog', { name: '新建接收人组' })).toBeNull();
  });

  it('switches through secondary views via select', () => {
    renderPage();
    fireEvent.change(screen.getByRole('combobox', { name: '视图' }), { target: { value: 'webhook' } });
    expect(screen.getByText('CRM 同步')).toBeTruthy();
    fireEvent.change(screen.getByRole('combobox', { name: '视图' }), { target: { value: 'group' } });
    expect(screen.getByText('全员运营组')).toBeTruthy();
    fireEvent.change(screen.getByRole('combobox', { name: '视图' }), { target: { value: 'channel' } });
    expect(screen.getByText('客服告警邮箱')).toBeTruthy();
  });

  it('filters channels by kind', () => {
    renderPage();
    fireEvent.change(screen.getByRole('combobox', { name: '类型' }), { target: { value: 'email' } });
    expect(screen.getByText('客服告警邮箱')).toBeTruthy();
    expect(screen.queryByText('团队 Slack')).toBeNull();
    fireEvent.change(screen.getByRole('combobox', { name: '类型' }), { target: { value: 'im' } });
    expect(screen.getByText('团队 Slack')).toBeTruthy();
    expect(screen.queryByText('客服告警邮箱')).toBeNull();
  });
});
