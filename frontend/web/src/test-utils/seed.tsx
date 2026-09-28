/**
 * 测试辅助 — 在 QueryClient 缓存里预置页面所需的 fixture 数据,
 * 让 `useApiQuery` 不必真正调用 getApiClient (测试环境未初始化)。
 */
import type { QueryClient } from '@tanstack/react-query';
import { QueryClient as QC, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { render, type RenderOptions, type RenderResult } from '@testing-library/react';
import type { ReactElement, ReactNode } from 'react';

export function seedPageQueryData<T>(
  qc: QueryClient,
  qkPath: readonly unknown[],
  data: T,
  workspaceId = 'w1',
) {
  qc.setQueryData([...qkPath, {}, workspaceId], data as unknown);
}

/** 通用:把任意最终 key 形态注入到缓存 (不附加 workspaceId)。 */
export function seedRaw<T>(
  qc: QueryClient,
  finalKey: readonly unknown[],
  data: T,
) {
  qc.setQueryData(finalKey, data as unknown);
}

export interface RenderWithProvidersOptions extends Omit<RenderOptions, 'wrapper'> {
  seeds?: Array<{ key: readonly unknown[]; data: unknown }>;
  initialEntries?: string[];
}

export function createTestQueryClient() {
  return new QC({ defaultOptions: { queries: { retry: false } } });
}

export function renderWithProviders(
  ui: ReactElement,
  { seeds = [], initialEntries, ...rest }: RenderWithProvidersOptions = {},
): RenderResult {
  const qc = createTestQueryClient();
  for (const seed of seeds) {
    qc.setQueryData(seed.key, seed.data as unknown);
  }
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={initialEntries}>{ui}</MemoryRouter>
    </QueryClientProvider>,
    rest,
  );
}

export function ProvidersWrapper({ children, qc }: { children: ReactNode; qc: QueryClient }) {
  return (
    <QueryClientProvider client={qc}>
      <MemoryRouter>{children}</MemoryRouter>
    </QueryClientProvider>
  );
}