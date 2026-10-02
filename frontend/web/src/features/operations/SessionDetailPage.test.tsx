/**
 * SessionDetailPage 测试 — 路由 /admin/operations/:id
 */
import { describe, expect, it, afterEach } from 'vitest';
import { cleanup, fireEvent, screen } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import { qk } from '@/api/shared/query-keys';
import { renderWithProviders } from '@/test-utils/seed';
import SessionDetailPage from './SessionDetailPage';
import { mockIncidents, mockKindStats, mockSessions, mockSpans } from './fixtures';

function renderAt(id: string) {
  return renderWithProviders(
    <Routes>
      <Route path="/admin/operations/:id" element={<SessionDetailPage />} />
    </Routes>,
    {
      initialEntries: [`/admin/operations/${id}`],
      seeds: [
        { key: [...qk.admin.operations.sessions, 'w1'], data: mockSessions },
        { key: [...qk.admin.operations.spans, 'w1'], data: mockSpans },
        { key: [...qk.admin.operations.incidents, 'w1'], data: mockIncidents },
        { key: [...qk.admin.operations.kindStats, 'w1'], data: mockKindStats },
      ],
    },
  );
}

describe('SessionDetailPage', () => {
  afterEach(() => cleanup());

  it('renders session id and switches to spans panel', () => {
    const session = mockSessions[0];
    renderAt(session.id);
    expect(screen.getByRole('heading', { level: 1, name: session.id })).toBeTruthy();
    expect(screen.getByLabelText('会话工作区')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '调用链路' }));
    expect(screen.getAllByText(/llm.chat/).length).toBeGreaterThan(0);
  });

  it('shows not-found when id is unknown', () => {
    renderAt('ss-does-not-exist');
    expect(screen.getByText('会话不存在或已被删除')).toBeTruthy();
  });
});
