// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { ToolCallCard } from './tool-call-card';

afterEach(() => cleanup());

function baseTool(over: Partial<{
  id: string;
  name: string;
  status: string;
  permission: string;
  durationMs: number;
  sandboxId: string;
  traceId: string;
  error: string;
  args: unknown;
  result: string;
}> = {}) {
  return {
    id: 'tc-1',
    name: 'ReadFile',
    status: 'success',
    durationMs: 42,
    ...over,
  };
}

describe('ToolCallCard', () => {
  it('renders name + duration badge for success status', () => {
    const { getByText } = render(
      <ToolCallCard
        toolCall={baseTool()}
        isOpen={false}
        onToggle={() => {}}
        onRetry={() => {}}
        argsKey="k1"
      />,
    );
    expect(getByText('ReadFile')).toBeTruthy();
    expect(getByText('42ms')).toBeTruthy();
  });

  it('shows failed badge and retry button when status=failed', () => {
    const retry = vi.fn();
    const { getByText } = render(
      <ToolCallCard
        toolCall={baseTool({ status: 'failed', error: 'ENOENT' })}
        isOpen={false}
        onToggle={() => {}}
        onRetry={retry}
        argsKey="k1"
      />,
    );
    expect(getByText('失败')).toBeTruthy();
    expect(getByText('ENOENT')).toBeTruthy();
    fireEvent.click(getByText('自动重试'));
    expect(retry).toHaveBeenCalledOnce();
  });

  it('shows denied badge when permission=denied', () => {
    const { getByText } = render(
      <ToolCallCard
        toolCall={baseTool({ permission: 'denied', status: 'denied' })}
        isOpen={false}
        onToggle={() => {}}
        onRetry={() => {}}
        argsKey="k1"
      />,
    );
    expect(getByText('已拦截')).toBeTruthy();
  });

  it('renders needs_instruction badge and still allows expand', () => {
    const { getByText, queryByText } = render(
      <ToolCallCard
        toolCall={baseTool({ status: 'needs_instruction' })}
        isOpen={false}
        onToggle={() => {}}
        onRetry={() => {}}
        argsKey="k1"
      />,
    );
    expect(getByText('待补全命令')).toBeTruthy();
    // needs_instruction 既非 failed 也非 denied,展开按钮仍出现;重试按钮不出现
    expect(getByText('参数')).toBeTruthy();
    expect(queryByText('自动重试')).toBeNull();
  });

  it('toggles args body and calls onToggle', () => {
    const onToggle = vi.fn();
    const { getByText, container, rerender } = render(
      <ToolCallCard
        toolCall={baseTool({ args: { path: '/etc/hosts' }, result: 'ok' })}
        isOpen={false}
        onToggle={onToggle}
        onRetry={() => {}}
        argsKey="k1"
      />,
    );
    fireEvent.click(getByText('参数'));
    expect(onToggle).toHaveBeenCalledOnce();
    rerender(
      <ToolCallCard
        toolCall={baseTool({ args: { path: '/etc/hosts' }, result: 'ok' })}
        isOpen
        onToggle={onToggle}
        onRetry={() => {}}
        argsKey="k1"
      />,
    );
    expect(container.textContent).toContain('"/etc/hosts"');
    expect(container.textContent).toContain('→ ok');
  });

  it('renders approval-required badge for permission=approval_required', () => {
    const { getByText } = render(
      <ToolCallCard
        toolCall={baseTool({ permission: 'approval_required' })}
        isOpen={false}
        onToggle={() => {}}
        onRetry={() => {}}
        argsKey="k1"
      />,
    );
    expect(getByText('需人工审核')).toBeTruthy();
  });

  it('renders auto badge when permission=auto', () => {
    const { getByText } = render(
      <ToolCallCard
        toolCall={baseTool({ permission: 'auto' })}
        isOpen={false}
        onToggle={() => {}}
        onRetry={() => {}}
        argsKey="k1"
      />,
    );
    expect(getByText('auto')).toBeTruthy();
  });
});