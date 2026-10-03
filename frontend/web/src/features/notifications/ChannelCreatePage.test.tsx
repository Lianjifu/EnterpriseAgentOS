/**
 * ChannelCreatePage 测试 — 路由 /admin/notifications/new
 */
import { describe, expect, it, afterEach } from 'vitest';
import { cleanup, fireEvent, screen } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import { renderWithProviders } from '@/test-utils/seed';
import ChannelCreatePage from './ChannelCreatePage';

function renderAt() {
  return renderWithProviders(
    <Routes>
      <Route path="/admin/notifications/new" element={<ChannelCreatePage />} />
      <Route path="/admin/notifications" element={<div>渠道列表</div>} />
    </Routes>,
    { initialEntries: ['/admin/notifications/new'] },
  );
}

describe('AdminChannelCreate', () => {
  afterEach(() => cleanup());

  it('renders standalone create page with four platforms', () => {
    renderAt();
    expect(screen.getByRole('heading', { level: 1, name: '新建渠道' })).toBeTruthy();
    expect(screen.getByRole('link', { name: /返回渠道配置/ })).toBeTruthy();
    expect(screen.getByRole('radio', { name: /飞书/ })).toBeTruthy();
    expect(screen.getByRole('radio', { name: /企业微信/ })).toBeTruthy();
    expect(screen.getByRole('radio', { name: /钉钉/ })).toBeTruthy();
    expect(screen.getByRole('radio', { name: /Web/ })).toBeTruthy();
    fireEvent.click(screen.getByRole('radio', { name: /企业微信/ }));
    expect(screen.getByLabelText('企业 ID (CorpId)')).toBeTruthy();
    fireEvent.click(screen.getByRole('radio', { name: /飞书/ }));
    fireEvent.change(screen.getByLabelText('渠道名称'), { target: { value: '测试渠道' } });
    fireEvent.change(screen.getByLabelText('机器人 / 应用名'), { target: { value: '测试机器人' } });
    fireEvent.change(screen.getByLabelText('App ID'), { target: { value: 'cli_test' } });
    fireEvent.change(screen.getByLabelText('App Secret'), { target: { value: 'secret' } });
    expect((screen.getByRole('button', { name: /创建渠道/ }) as HTMLButtonElement).disabled).toBe(false);
  });
});
