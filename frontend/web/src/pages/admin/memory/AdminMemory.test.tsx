/**
 * AdminMemory — 渲染 + 5 tab 切换 + 默认内容。
 */
import { describe, expect, it, afterEach } from 'vitest';
import { cleanup, screen, waitFor, within } from '@testing-library/react';
import { qk } from '@/api/shared/query-keys';
import { renderWithProviders } from '@/test-utils/seed';
import {
  mockL1Sessions, mockL2Facts, mockL3Entries, mockMemoryTrend, mockPromotions, mockRetentionPolicies,
} from '@/mock/admin/memory.fixtures';
import MemoryPage from './index';

afterEach(() => cleanup());

function renderPage() {
  return renderWithProviders(<MemoryPage />, {
    seeds: [
      { key: [...qk.admin.memory.l1, 'w1'], data: mockL1Sessions },
      { key: [...qk.admin.memory.l2, 'w1'], data: mockL2Facts },
      { key: [...qk.admin.memory.l3, 'w1'], data: mockL3Entries },
      { key: [...qk.admin.memory.promotions, 'w1'], data: mockPromotions },
      { key: [...qk.admin.memory.policies, 'w1'], data: mockRetentionPolicies },
      { key: [...qk.admin.memory.trend('7d'), 'w1'], data: mockMemoryTrend },
    ],
  });
}

describe('AdminMemory', () => {
  it('渲染 hero + 5 子模块标签 + 默认 overview', () => {
    renderPage();
    expect(screen.getByText(/把企业记忆资产管起来/)).toBeTruthy();
    expect(screen.getByText('最近 7 天')).toBeTruthy();
    expect(screen.getByText('记忆总览')).toBeTruthy();
    expect(screen.getByText('趋势')).toBeTruthy();
    expect(screen.getByText('待办工作流')).toBeTruthy();
  });

  it('切换到 L1 tab 显示会话表格', async () => {
    renderPage();
    const nav = screen.getByLabelText('子模块导航');
    within(nav).getByRole('button', { name: /短期记忆/ }).click();
    await waitFor(() => {
      expect(screen.getByText('全部 flush')).toBeTruthy();
    });
    expect(screen.getByText('会话')).toBeTruthy();
  });

  it('切换到 L2 tab 显示事实卡片', async () => {
    renderPage();
    const nav = screen.getByLabelText('子模块导航');
    within(nav).getByRole('button', { name: /长期记忆/ }).click();
    await waitFor(() => {
      expect(screen.getByText('答复风格')).toBeTruthy();
    });
  });

  it('切换到 L3 tab 显示知识卡片', async () => {
    renderPage();
    const nav = screen.getByLabelText('子模块导航');
    within(nav).getByRole('button', { name: /知识记忆/ }).click();
    await waitFor(() => {
      expect(screen.getByText('业务术语对照表')).toBeTruthy();
    });
  });

  it('切换到策略 tab 显示策略卡 + KPI', async () => {
    renderPage();
    const nav = screen.getByLabelText('子模块导航');
    within(nav).getByRole('button', { name: /保留策略与评测/ }).click();
    await waitFor(() => {
      expect(screen.getAllByText('命中率').length).toBeGreaterThan(0);
    });
    expect(screen.getByText('MRR')).toBeTruthy();
  });
});