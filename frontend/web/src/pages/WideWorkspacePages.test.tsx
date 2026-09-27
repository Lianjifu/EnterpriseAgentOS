import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';
import MyInsights from './MyInsights';
import MyTasks from './MyTasks';
import HelpCenter from './HelpCenter';
import AccountSettings from './AccountSettings';

afterEach(() => cleanup());

describe('效果看板', () => {
  it('switches ranges and toggles the accessible trend table', () => {
    render(<MyInsights />);
    fireEvent.change(screen.getByLabelText('选择时间范围'), { target: { value: '本季度' } });
    expect(screen.getByText('本季度')).toBeTruthy();
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

describe('任务记录', () => {
  it('filters and completes a pending task from the detail drawer', () => {
    render(<MyTasks />);
    fireEvent.change(screen.getByPlaceholderText('搜索任务、来源或负责人'), { target: { value: '报价单' } });
    fireEvent.click(screen.getByRole('button', { name: /确认销售报价单/ }));
    expect(screen.getByRole('dialog', { name: '确认销售报价单详情' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '确认完成' }));
    expect(screen.getByRole('status').textContent).toContain('已标记为完成');
  });

  it('switches to the schedule view', () => {
    render(<MyTasks />);
    fireEvent.click(screen.getByRole('button', { name: '日程视图' }));
    expect(screen.getByRole('button', { name: '日程视图' }).getAttribute('aria-pressed')).toBe('true');
  });
});

describe('帮助中心', () => {
  it('searches and expands an FAQ', () => {
    render(<HelpCenter />);
    fireEvent.change(screen.getByPlaceholderText(/搜索“如何开始/), { target: { value: '深色模式' } });
    fireEvent.click(screen.getByRole('button', { name: '如何切换深色模式？' }));
    expect(screen.getByText(/点击工作台顶部的主题按钮/)).toBeTruthy();
  });

  it('submits local feedback', () => {
    render(<HelpCenter />);
    fireEvent.click(screen.getByRole('button', { name: '提交反馈' }));
    fireEvent.change(screen.getByLabelText('你的反馈'), { target: { value: '希望增加更多示例' } });
    fireEvent.click(screen.getAllByRole('button', { name: '提交反馈' })[1]);
    expect(screen.getByRole('status').textContent).toContain('感谢反馈');
  });
});

describe('设置', () => {
  it('switches setting tabs and toggles a preference', () => {
    render(<MemoryRouter><AccountSettings /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: /通知设置/ }));
    expect(screen.getByRole('heading', { name: '通知设置' })).toBeTruthy();
    const checkbox = screen.getByRole('checkbox', { name: /任务与流程提醒/ });
    expect((checkbox as HTMLInputElement).checked).toBe(true);
    fireEvent.click(checkbox);
    expect((checkbox as HTMLInputElement).checked).toBe(false);
  });
});
