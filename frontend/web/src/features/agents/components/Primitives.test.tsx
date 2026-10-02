/**
 * PanelPagination 测试 — 总页数 ≤1 时不渲染;翻页回调;边界保护。
 */
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { PanelPagination } from './Primitives';

describe('PanelPagination', () => {
  it('returns null when totalPages <= 1', () => {
    const { container } = render(
      <PanelPagination page={1} totalPages={1} total={5} pageStart={1} pageEnd={5} onPageChange={vi.fn()} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders nav with current page indicator and disables prev on first page', () => {
    const { container } = render(
      <PanelPagination page={1} totalPages={3} total={15} pageStart={1} pageEnd={5} onPageChange={vi.fn()} />,
    );
    const prev = container.querySelector('button[aria-label="上一页"]') as HTMLButtonElement;
    expect(prev.disabled).toBe(true);
    const page1 = container.querySelector('button[aria-label="第 1 页"]') as HTMLButtonElement;
    const page2 = container.querySelector('button[aria-label="第 2 页"]') as HTMLButtonElement;
    expect(page1.getAttribute('aria-current')).toBe('page');
    expect(page2.getAttribute('aria-current')).toBeNull();
  });

  it('disables next on last page and calls onPageChange when clicking another page', () => {
    const onChange = vi.fn();
    const { container } = render(
      <PanelPagination page={3} totalPages={3} total={15} pageStart={11} pageEnd={15} onPageChange={onChange} />,
    );
    const next = container.querySelector('button[aria-label="下一页"]') as HTMLButtonElement;
    expect(next.disabled).toBe(true);
    const page1 = container.querySelector('button[aria-label="第 1 页"]') as HTMLButtonElement;
    fireEvent.click(page1);
    expect(onChange).toHaveBeenCalledWith(1);
  });

  it('clamps page when safePage > totalPages', () => {
    const onChange = vi.fn();
    const { container } = render(
      <PanelPagination page={5} totalPages={2} total={10} pageStart={1} pageEnd={5} onPageChange={onChange} />,
    );
    const page2 = container.querySelector('button[aria-label="第 2 页"]') as HTMLButtonElement;
    expect(page2.getAttribute('aria-current')).toBe('page');
    const prev = container.querySelector('button[aria-label="上一页"]') as HTMLButtonElement;
    expect(prev.disabled).toBe(false);
    fireEvent.click(prev);
    expect(onChange).toHaveBeenCalledWith(1);
  });
});
