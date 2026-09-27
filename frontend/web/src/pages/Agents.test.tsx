import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it } from 'vitest';
import Agents from './Agents';
import Copilot from './Copilot';

afterEach(() => cleanup());

function renderDirectory(path = '/agents') {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/agents" element={<Agents />} />
        <Route path="/team/agents" element={<Agents />} />
        <Route path="/copilot" element={<Copilot />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('智能体广场', () => {
  it('shows only available agents and filters by scene and keyword', () => {
    renderDirectory();
    expect(screen.getByRole('heading', { name: '可用智能体' })).toBeTruthy();
    expect(screen.queryByText('周报整理助手')).toBeNull();
    expect(screen.queryByRole('button', { name: '创建智能体' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: '数据分析' }));
    expect(screen.getByRole('button', { name: '数据摘要助手' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: '客户沟通助手' })).toBeNull();
    fireEvent.change(screen.getByRole('textbox', { name: '搜索智能体' }), { target: { value: '不匹配的查询' } });
    expect(screen.getByText('没有找到符合条件的智能体')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '清除筛选' }));
    expect(screen.getByRole('button', { name: '客户沟通助手' })).toBeTruthy();
  });

  it('combines favorites and keyword filtering', () => {
    renderDirectory();
    fireEvent.click(screen.getByRole('button', { name: '收藏企业制度问答' }));
    fireEvent.click(screen.getByRole('button', { name: '我的收藏' }));
    expect(screen.getByRole('button', { name: '企业制度问答' })).toBeTruthy();
    fireEvent.change(screen.getByRole('textbox', { name: '搜索智能体' }), { target: { value: '客户' } });
    expect(screen.getByRole('button', { name: '客户沟通助手' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: '企业制度问答' })).toBeNull();
  });

  it('opens details, closes on Escape and restores focus', () => {
    renderDirectory('/team/agents');
    const trigger = screen.getByRole('button', { name: '企业制度问答' });
    fireEvent.click(trigger);
    const dialog = screen.getByRole('dialog', { name: '企业制度问答详情' });
    expect(within(dialog).getByText('制度说明与参考方向')).toBeTruthy();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  it('carries the chosen agent into the conversation and records a local demo reply', () => {
    renderDirectory();
    fireEvent.click(screen.getByRole('button', { name: '与客户沟通助手开始对话' }));
    expect(screen.getByRole('heading', { name: '与客户沟通助手对话' })).toBeTruthy();
    expect(screen.getByText('当前智能体：客户沟通助手')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /根据这段客户沟通记录/ }));
    expect(screen.getByText(/尚未连接真实智能体服务/)).toBeTruthy();
    expect(screen.getByRole('link', { name: '更换智能体' }).getAttribute('href')).toBe('/agents');
  });
});
