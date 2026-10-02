import { describe, expect, it, afterEach } from 'vitest';
import { cleanup, screen } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import { qk } from '@/api/shared/query-keys';
import { renderWithProviders } from '@/test-utils/seed';
import ModelDetailPage from './ModelDetailPage';
import { mockModels, mockRoutes } from './fixtures';

function renderAt(id: string) {
  return renderWithProviders(
    <Routes>
      <Route path="/admin/models/:id" element={<ModelDetailPage />} />
    </Routes>,
    {
      initialEntries: [`/admin/models/${id}`],
      seeds: [
        { key: [...qk.admin.models.list, 'w1'], data: mockModels },
        { key: [...qk.admin.models.routes, 'w1'], data: mockRoutes },
      ],
    },
  );
}

describe('AdminModelDetail', () => {
  afterEach(() => cleanup());

  it('renders model name and nav for known id', () => {
    const model = mockModels[0];
    renderAt(model.id);
    expect(screen.getByRole('heading', { level: 1, name: model.name })).toBeTruthy();
    expect(screen.getByRole('link', { name: /返回模型配置/ })).toBeTruthy();
    expect(screen.getByLabelText('模型工作区导航')).toBeTruthy();
  });

  it('shows not-found when id is unknown', () => {
    renderAt('model-does-not-exist');
    expect(screen.getByText('模型不存在或已被删除')).toBeTruthy();
  });
});
