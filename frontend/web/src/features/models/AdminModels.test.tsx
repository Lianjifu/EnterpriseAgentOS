/**
 * AdminModels — 对齐技能管理：无子模块 Tab，列表工具栏 + 视图筛选。
 */
import { describe, expect, it, afterEach } from 'vitest';
import { cleanup, fireEvent, screen, within } from '@testing-library/react';
import { qk } from '@/api/shared/query-keys';
import { renderWithProviders } from '@/test-utils/seed';
import ModelsPage from './ModelsPage';
import { mockModels, mockProviders, mockRoutes, mockHealth } from './fixtures';

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

  it('renders hero without sub-module tabs', () => {
    renderPage();
    expect(screen.getByText('让模型成为可观测、可路由的能力。')).toBeTruthy();
    expect(screen.queryByLabelText('子模块导航')).toBeNull();
    expect(screen.getByRole('combobox', { name: '视图' })).toBeTruthy();
  });

  it('renders model cards and action buttons', () => {
    renderPage();
    expect(screen.getByText('GPT-4o')).toBeTruthy();
    expect(screen.getByText('Claude 3.5 Sonnet')).toBeTruthy();
    expect(screen.getAllByRole('button', { name: /^编辑$/ }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('button', { name: /导出/ }).length).toBeGreaterThan(0);
  });

  it('switches to provider view via select', () => {
    renderPage();
    fireEvent.change(screen.getByRole('combobox', { name: '视图' }), { target: { value: 'provider' } });
    expect(screen.getByText('OpenAI 官方')).toBeTruthy();
    expect(screen.getByText('Anthropic Claude')).toBeTruthy();
  });

  it('opens create-model wizard from toolbar', () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /新建模型/ }));
    const wizard = screen.getByRole('dialog', { name: '新建模型' });
    expect(wizard).toBeTruthy();
    fireEvent.change(within(wizard).getByPlaceholderText(/GPT-4o 微调版/), { target: { value: '测试模型' } });
    fireEvent.click(within(wizard).getByRole('button', { name: /下一步/ }));
    fireEvent.click(within(wizard).getByRole('button', { name: /下一步/ }));
    fireEvent.click(within(wizard).getByRole('button', { name: /创建模型/ }));
    expect(screen.queryByRole('dialog', { name: '新建模型' })).toBeNull();
  });

  it('switches to route view and opens create-route modal', () => {
    renderPage();
    fireEvent.change(screen.getByRole('combobox', { name: '视图' }), { target: { value: 'route' } });
    fireEvent.click(screen.getByRole('button', { name: /新建路由/ }));
    const dialog = screen.getByRole('dialog', { name: '新建路由规则' });
    expect(dialog).toBeTruthy();
    fireEvent.click(within(dialog).getByRole('button', { name: '取消' }));
    expect(screen.queryByRole('dialog', { name: '新建路由规则' })).toBeNull();
  });

  it('switches to health view and shows health events', () => {
    renderPage();
    fireEvent.change(screen.getByRole('combobox', { name: '视图' }), { target: { value: 'health' } });
    expect(screen.getByText(/API 网关返回 502/)).toBeTruthy();
  });
});
