// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { useState } from 'react';
import { PermissionCard } from './permission-card';

// Button content includes an inline <ShieldCheck /> icon before the text label,
// so testing-library's default exact matcher fails. Helper: find by button whose
// textContent starts with the Chinese label.
function findButtonByLabel(container: HTMLElement, label: string): HTMLButtonElement | null {
  const buttons = Array.from(container.querySelectorAll('button'));
  return buttons.find((b) => (b.textContent ?? '').includes(label)) ?? null;
}

afterEach(() => cleanup());

function baseApproval(over: Record<string, unknown> = {}) {
  return {
    reason: '涉及对外邮件',
    ticketId: 'TKT-1',
    action: 'send_email to=user@example.com',
    planSummary: '通知用户审批结果',
    signers: [
      { name: 'Alice', role: 'admin', userId: 'u-1' },
      { name: 'Bob', role: 'auditor', userId: 'u-2' },
    ],
    signed: 0,
    required: 2,
    decision: 'pending' as const,
    policyHash: '0xdeadbeef',
    resource: 'mail:outbound',
    ...over,
  };
}

function baseMsg(over: Record<string, unknown> = {}) {
  const { approvalRequest: approvalOver, ...rest } = over;
  return {
    id: 'm-1',
    content: '请审批后我会执行',
    ...rest,
    approvalRequest: baseApproval(approvalOver as Record<string, unknown> ?? {}),
  };
}

function Harness({
  msg,
  currentUser,
  onApprove = () => {},
  onApproveSigner = () => {},
  onRequestReject = () => {},
}: {
  msg: ReturnType<typeof baseMsg>;
  currentUser: { id: string; name: string; role: string } | null;
  onApprove?: (mid: string) => void;
  onApproveSigner?: (mid: string, idx: number) => void;
  onRequestReject?: (mid: string, idx: number) => void;
}) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  return (
    <PermissionCard
      m={msg}
      currentUser={currentUser}
      expandedApproval={expanded}
      setExpandedApproval={setExpanded}
      onApprove={onApprove}
      onApproveSigner={onApproveSigner}
      onRequestReject={onRequestReject}
    />
  );
}

describe('PermissionCard', () => {
  it('renders approval title + signed progress', () => {
    const { container } = render(<Harness msg={baseMsg()} currentUser={null} />);
    expect(container.textContent).toMatch(/受控变更 · 待审核/);
    expect(container.textContent).toContain('0/2');
    expect(container.textContent).toContain('涉及对外邮件');
  });

  it('renders single-auth variant when required<=1', () => {
    const msg = baseMsg({
      approvalRequest: baseApproval({
        required: 1,
        signed: 0,
        signers: [{ name: 'Alice', role: 'admin', userId: 'u-1' }],
      }),
    });
    const { container } = render(<Harness msg={msg} currentUser={{ id: 'u-1', name: 'Alice', role: 'admin' }} />);
    expect(container.textContent).toMatch(/受控变更 · 人工审核/);
  });

  it('admin user can single-approve and click 审核授权', () => {
    const onApprove = vi.fn();
    const msg = baseMsg({
      approvalRequest: baseApproval({
        required: 1,
        signed: 0,
        signers: [{ name: 'Alice', role: 'admin', userId: 'u-1' }],
      }),
    });
    const { container } = render(<Harness msg={msg} currentUser={{ id: 'u-1', name: 'Alice', role: 'admin' }} onApprove={onApprove} />);
    const btn = findButtonByLabel(container, '审核授权');
    expect(btn).toBeTruthy();
    fireEvent.click(btn!);
    expect(onApprove).toHaveBeenCalledWith('m-1');
  });

  it('non-candidate user cannot approve', () => {
    const onApprove = vi.fn();
    const msg = baseMsg({
      approvalRequest: baseApproval({
        required: 1,
        signed: 0,
        signers: [{ name: 'Alice', role: 'admin', userId: 'u-1' }],
      }),
    });
    const { container } = render(<Harness msg={msg} currentUser={{ id: 'u-other', name: 'Bob', role: 'user' }} onApprove={onApprove} />);
    const btn = findButtonByLabel(container, '审核授权');
    expect(btn).toBeTruthy();
    expect((btn as HTMLButtonElement).disabled).toBe(true);
  });

  it('multi-signer: clicking 待 X 签发 invokes onApproveSigner when current user matches', () => {
    const onApproveSigner = vi.fn();
    const { container } = render(
      <Harness
        msg={baseMsg()}
        currentUser={{ id: 'u-1', name: 'Alice', role: 'admin' }}
        onApproveSigner={onApproveSigner}
      />,
    );
    const btn = findButtonByLabel(container, '批准(Alice)');
    expect(btn).toBeTruthy();
    fireEvent.click(btn!);
    expect(onApproveSigner).toHaveBeenCalledWith('m-1', 0);
  });

  it('expands audit details when 详情 clicked', () => {
    const { container } = render(<Harness msg={baseMsg()} currentUser={null} />);
    const btn = findButtonByLabel(container, '详情');
    expect(btn).toBeTruthy();
    fireEvent.click(btn!);
    expect(container.textContent).toContain('policyHash');
    expect(container.textContent).toContain('0xdeadbeef');
    expect(container.textContent).toContain('mail:outbound');
  });

  it('shows 已授权 badge after decision=approved', () => {
    const msg = baseMsg({
      approvalRequest: baseApproval({ decision: 'approved', decidedAt: '2026-09-26T10:00:00Z' }),
    });
    const { container } = render(<Harness msg={msg} currentUser={null} />);
    expect(container.textContent).toMatch(/已通过 · 待执行/);
  });

  it('shows 已拒绝 badge after decision=rejected', () => {
    const msg = baseMsg({
      approvalRequest: baseApproval({ decision: 'rejected', decidedAt: '2026-09-26T10:00:00Z' }),
    });
    const { container } = render(<Harness msg={msg} currentUser={null} />);
    expect(container.textContent).toMatch(/已拒绝/);
  });

  it('returns null when approvalRequest is missing', () => {
    const { container } = render(<Harness msg={{ id: 'm-2' } as unknown as ReturnType<typeof baseMsg>} currentUser={null} />);
    expect(container.firstChild).toBeNull();
  });
});