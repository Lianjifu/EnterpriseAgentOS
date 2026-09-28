import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';
import Home from './Home';

afterEach(() => cleanup());

describe('首页效果摘要', () => {
  it('embeds the insights section and keeps its range/table interaction', () => {
    render(<MemoryRouter><Home /></MemoryRouter>);
    expect(screen.getByText('完成任务')).toBeTruthy();
    fireEvent.change(screen.getByLabelText('选择时间范围'), { target: { value: '本季度' } });
    fireEvent.click(screen.getByRole('button', { name: '查看数据表' }));
    expect(document.querySelector('caption')?.textContent).toBe('智能体任务完成率趋势数据');
    expect(screen.getByText('7 月')).toBeTruthy();
  });
});
