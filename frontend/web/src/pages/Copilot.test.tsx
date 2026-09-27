import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import Copilot from './Copilot';

describe('Copilot workspace preview', () => {
  afterEach(() => cleanup());

  it('only mounts the Files directory in the files workspace', () => {
    render(
      <MemoryRouter>
        <Copilot />
      </MemoryRouter>,
    );

    expect(screen.queryByPlaceholderText('Filter files...')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: '文件' }));
    expect(screen.getByPlaceholderText('Filter files...')).toBeTruthy();
    expect(screen.getByRole('button', { name: /README\.md/ })).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: '浏览器' }));
    expect(screen.queryByPlaceholderText('Filter files...')).toBeNull();
  });

  it('keeps file filtering available after opening the Files workspace', () => {
    render(
      <MemoryRouter>
        <Copilot />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: '文件' }));
    fireEvent.change(screen.getByPlaceholderText('Filter files...'), { target: { value: 'README' } });

    expect(screen.getByRole('button', { name: /README\.md/ })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Copilot\.tsx/ })).toBeNull();
  });

  it('writes the selected attachment filename into the composer', () => {
    render(
      <MemoryRouter>
        <Copilot />
      </MemoryRouter>,
    );

    const input = screen.getByPlaceholderText('描述你想完成的工作...') as HTMLTextAreaElement;
    const fileInput = document.getElementById('copilot-file-input') as HTMLInputElement;
    fireEvent.change(fileInput, { target: { files: [new File(['内容'], '会议纪要.pdf', { type: 'application/pdf' })] } });

    expect(input.value).toContain('[附件: 会议纪要.pdf]');
  });

  it('shows and dismisses slash and mention shortcut states', () => {
    render(
      <MemoryRouter>
        <Copilot />
      </MemoryRouter>,
    );

    const input = screen.getByPlaceholderText('描述你想完成的工作...') as HTMLTextAreaElement;
    fireEvent.change(input, { target: { value: '/' } });
    expect(screen.getByRole('status').textContent).toContain('快捷命令');
    fireEvent.click(screen.getByRole('option', { name: '/整理' }));
    expect(input.value).toBe('/整理 ');

    fireEvent.change(input, { target: { value: '@' } });
    expect(screen.getByRole('status').textContent).toContain('提及对象');
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('preserves the knowledge source handoff', () => {
    render(
      <MemoryRouter initialEntries={[{ pathname: '/copilot', state: { knowledgeTitle: '差旅与报销指南' } }]}>
        <Copilot />
      </MemoryRouter>,
    );

    expect((screen.getByPlaceholderText('描述你想完成的工作...') as HTMLTextAreaElement).value).toContain('差旅与报销指南');
  });

  it('exposes the model and workspace control semantics', () => {
    render(
      <MemoryRouter>
        <Copilot />
      </MemoryRouter>,
    );

    const workspaceButton = screen.getByRole('button', { name: '关闭大模型配置与工作区' });
    expect(workspaceButton.getAttribute('aria-expanded')).toBe('true');
    expect(workspaceButton.getAttribute('aria-controls')).toBe('copilot-workspace-preview');

    fireEvent.click(workspaceButton);
    expect(screen.getByRole('button', { name: '打开大模型配置与工作区' })).toBeTruthy();
  });
});
