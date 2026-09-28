import { describe, expect, it, afterEach } from 'vitest';
import { cleanup, fireEvent, screen, within } from '@testing-library/react';
import { qk } from '@/api/shared/query-keys';
import { renderWithProviders } from '@/test-utils/seed';
import ModelsPage from '@/pages/admin/models';
import { mockModels, mockProviders, mockRoutes, mockHealth } from '@/mock/admin/models.fixtures';

function renderPage() {
  return renderWithProviders(<ModelsPage />, {
    initialEntries: ['/admin/models'],
    seeds: [
      { key: [...qk.admin.models.list, 'w1'], data: mockModels },
      { key: [...qk.admin.models.providers, 'w1'], data: mockProviders },
      { key: [...qk.admin.models.routes, 'w1'], data: mockRoutes },
      { key: [...qk.admin.models.health, 'w1'], data: mockHealth },
    ],
  });
}

describe('AdminModels', () => {
  afterEach(() => cleanup());

  it('renders hero and five sub-tabs', () => {
    renderPage();
    expect(screen.getByText('让模型成为可观测、可路由的能力。')).toBeTruthy();
    const tabsRow = document.querySelector('[aria-label="子模块导航"]') as HTMLElement | null;
    expect(tabsRow).toBeTruthy();
    const tabTexts = Array.from(tabsRow!.querySelectorAll('button')).map((b) => b.textContent || '');
    expect(tabTexts.some((t) => t.includes('模型总览'))).toBe(true);
    expect(tabTexts.some((t) => t.includes('模型列表'))).toBe(true);
    expect(tabTexts.some((t) => t.includes('提供商'))).toBe(true);
    expect(tabTexts.some((t) => t.includes('路由策略'))).toBe(true);
    expect(tabTexts.some((t) => t.includes('健康监控'))).toBe(true);
  });

  it('renders model cards from fixture (9 models on overview)', () => {
    renderPage();
    expect(screen.getByText('GPT-4o')).toBeTruthy();
    expect(screen.getByText('Claude 3.5 Sonnet')).toBeTruthy();
    expect(screen.getAllByText(/9 个模型/).length).toBeGreaterThan(0);
  });

  it('switches to provider tab and shows provider list', () => {
    renderPage();
    const tabsRow = document.querySelector('[aria-label="子模块导航"]') as HTMLElement | null;
    fireEvent.click(within(tabsRow!).getByRole('button', { name: /提供商/ }));
    expect(screen.getByText('OpenAI 官方')).toBeTruthy();
    expect(screen.getByText('Anthropic Claude')).toBeTruthy();
  });

  it('opens create-model wizard on overview tab (3 steps -> submit)', () => {
    renderPage();
    const newBtn = screen.getAllByRole('button', { name: /新建模型/ })[0];
    expect(newBtn).toBeTruthy();
    fireEvent.click(newBtn);
    const wizard = screen.getByRole('dialog', { name: '新建模型' });
    expect(wizard).toBeTruthy();
    fireEvent.change(within(wizard).getByPlaceholderText(/GPT-4o 微调版/), { target: { value: '测试模型' } });
    fireEvent.click(within(wizard).getByRole('button', { name: /下一步/ }));
    fireEvent.click(within(wizard).getByRole('button', { name: /下一步/ }));
    fireEvent.click(within(wizard).getByRole('button', { name: /创建模型/ }));
    expect(screen.queryByRole('dialog', { name: '新建模型' })).toBeNull();
  });

  it('switches to route tab and opens create-route modal', () => {
    renderPage();
    const tabsRow = document.querySelector('[aria-label="子模块导航"]') as HTMLElement | null;
    fireEvent.click(within(tabsRow!).getByRole('button', { name: /路由策略/ }));
    const newBtn = screen.getAllByRole('button', { name: /新建路由/ })[0];
    expect(newBtn).toBeTruthy();
    fireEvent.click(newBtn);
    const dialog = screen.getByRole('dialog', { name: '新建路由规则' });
    expect(dialog).toBeTruthy();
    fireEvent.click(within(dialog).getByRole('button', { name: '取消' }));
    expect(screen.queryByRole('dialog', { name: '新建路由规则' })).toBeNull();
  });

  it('switches to health tab and shows health events', () => {
    renderPage();
    const tabsRow = document.querySelector('[aria-label="子模块导航"]') as HTMLElement | null;
    fireEvent.click(within(tabsRow!).getByRole('button', { name: /健康监控/ }));
    expect(screen.getByText(/API 网关返回 502/)).toBeTruthy();
  });
});
