// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { MentionRow, PopoverEmpty, SlashRow } from './palette-row';
import { Sparkles } from 'lucide-react';

afterEach(() => cleanup());

describe('SlashRow', () => {
  it('renders cmd + desc + category badge and clicks fire onClick', () => {
    const onClick = vi.fn();
    const { container, getByText } = render(
      <SlashRow
        icon={<Sparkles className="h-3.5 w-3.5" />}
        cmd="/clear"
        desc="清空当前会话"
        category="agent"
        onClick={onClick}
      />,
    );
    expect(getByText('/clear')).toBeTruthy();
    expect(getByText('清空当前会话')).toBeTruthy();
    expect(container.querySelector('.lucide-sparkles')).toBeTruthy();
    fireEvent.click(container.querySelector('button')!);
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('omits desc and category when not provided', () => {
    const { container } = render(
      <SlashRow icon={<span data-testid="i" />} cmd="/x" onClick={() => {}} />,
    );
    expect(container.textContent).not.toContain('agent');
    expect(container.querySelector('[data-testid="i"]')).toBeTruthy();
  });
});

describe('MentionRow', () => {
  it('renders title + desc + chevron + click', () => {
    const onClick = vi.fn();
    const { container } = render(
      <MentionRow
        icon={<span data-testid="i" />}
        title="@expert"
        desc="切换在岗专家"
        monospace
        showChevron
        onClick={onClick}
      />,
    );
    expect(container.textContent).toContain('@expert');
    expect(container.textContent).toContain('切换在岗专家');
    expect(container.querySelector('svg')).toBeTruthy(); // chevron
    fireEvent.click(container.querySelector('button')!);
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('renders badge when provided', () => {
    const { container, getByText } = render(
      <MentionRow
        icon={<span />}
        title="web-search"
        desc="搜索网页"
        truncate
        badge={{ label: '工具', tone: 'warn' }}
        onClick={() => {}}
      />,
    );
    expect(getByText('工具')).toBeTruthy();
    expect(container.textContent).toContain('web-search');
  });

  it('hides chevron and badge when not provided', () => {
    const { container } = render(
      <MentionRow icon={<span />} title="x" onClick={() => {}} />,
    );
    expect(container.querySelector('svg')).toBeNull();
  });
});

describe('PopoverEmpty', () => {
  it('renders children with leading style when prop set', () => {
    const { container } = render(<PopoverEmpty leading>暂无内容</PopoverEmpty>);
    expect(container.textContent).toContain('暂无内容');
    const p = container.querySelector('p')!;
    expect(p.className).toContain('leading-5');
  });

  it('renders without leading style by default', () => {
    const { container } = render(<PopoverEmpty>空</PopoverEmpty>);
    const p = container.querySelector('p')!;
    expect(p.className).not.toContain('leading-5');
  });
});