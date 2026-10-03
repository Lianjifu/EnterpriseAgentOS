import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';
import type { ReactNode } from 'react';
import MyInsights from '@/features/user/home/MyInsights';
import MyTasks from '@/features/user/tasks';
import AccountSettings from '@/pages/shared/AccountSettings';
import { mockTasks } from '@/features/user/tasks/fixtures';
import { qk } from '@/api/shared/query-keys';

function makeClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

function renderTasks() {
  const qc = makeClient();
  qc.setQueryData([...qk.user.tasks.list, {}, 'w1'], mockTasks);
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <MyTasks />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

function renderWith(node: ReactNode) {
  const qc = makeClient();
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>{node}</MemoryRouter>
    </QueryClientProvider>,
  );
}

afterEach(() => cleanup());

describe('效果看板', () => {
  it('switches ranges and toggles the accessible trend table', () => {
    render(<MyInsights />);
    fireEvent.click(screen.getByRole('button', { name: /近 7 天/ }));
    fireEvent.click(screen.getByRole('menuitemradio', { name: '本季度' }));
    expect(screen.getByRole('button', { name: /本季度/ })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '查看数据表' }));
    expect(document.querySelector('caption')?.textContent).toBe('智能体任务完成率趋势数据');
    expect(screen.getByText('7 月')).toBeTruthy();
  });

  it('shows a local export confirmation', () => {
    render(<MyInsights />);
    fireEvent.click(screen.getByRole('button', { name: '导出报告' }));
    expect(screen.getByRole('status').textContent).toContain('本地演示');
  });
});

describe('我的任务', () => {
  it('filters and completes a pending task from the detail drawer', () => {
    renderTasks();
    fireEvent.change(screen.getByPlaceholderText('搜索任务、来源或负责人'), { target: { value: '报价单' } });
    fireEvent.click(screen.getByRole('button', { name: /确认销售报价单/ }));
    expect(screen.getByRole('dialog', { name: '确认销售报价单详情' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '确认完成' }));
    expect(screen.getByRole('status').textContent).toContain('已标记为完成');
  });

  it('switches to the schedule view', () => {
    renderTasks();
    fireEvent.change(screen.getByLabelText('任务视图'), { target: { value: 'schedule' } });
    expect((screen.getByLabelText('任务视图') as HTMLSelectElement).value).toBe('schedule');
  });
});

describe('设置', () => {
  it('switches setting tabs and toggles a preference', () => {
    renderWith(<AccountSettings />);
    fireEvent.click(screen.getByRole('button', { name: /通知设置/ }));
    expect(screen.getByRole('heading', { name: '通知设置' })).toBeTruthy();
    const checkbox = screen.getByRole('checkbox', { name: /任务与工作流提醒/ });
    expect((checkbox as HTMLInputElement).checked).toBe(true);
    fireEvent.click(checkbox);
    expect((checkbox as HTMLInputElement).checked).toBe(false);
  });
});