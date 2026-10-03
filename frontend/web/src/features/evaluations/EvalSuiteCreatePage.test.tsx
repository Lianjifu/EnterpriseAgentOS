import { describe, expect, it, afterEach } from 'vitest';
import { cleanup, screen } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import { renderWithProviders } from '@/test-utils/seed';
import EvalSuiteCreatePage from './EvalSuiteCreatePage';

function renderAt() {
  return renderWithProviders(
    <Routes>
      <Route path="/admin/evaluations/new" element={<EvalSuiteCreatePage />} />
    </Routes>,
    { initialEntries: ['/admin/evaluations/new'] },
  );
}

describe('AdminEvalSuiteCreate', () => {
  afterEach(() => cleanup());

  it('renders standalone create page', () => {
    renderAt();
    expect(screen.getByRole('heading', { level: 1, name: '新建评测套件' })).toBeTruthy();
    expect(screen.getByRole('link', { name: /返回评测中心/ })).toBeTruthy();
  });
});
