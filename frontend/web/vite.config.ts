import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'web/src');
const PKG = (p: string) => path.join(ROOT, 'packages', p);

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      { find: '@', replacement: SRC },
      { find: '@de/web-ui', replacement: PKG('ui/src/index.tsx') },
      { find: '@de/web-api', replacement: PKG('api/src/index.ts') },
      { find: '@de/web-types', replacement: PKG('types/src/index.ts') },
      { find: '@de/web-hooks', replacement: PKG('hooks/src/index.ts') },
      { find: '@de/web-utils', replacement: PKG('utils/src/index.ts') },
    ],
  },
  server: {
    host: true,
    port: Number(process.env.EAOS_FRONTEND_PORT ?? 5200),
    strictPort: true,
    // 联调：浏览器请求经 pathMap 改写后落到 /v1/*（backend 真路径），
    // 仍走同源 → EAOS gateway (:9200) → path-prefix 路由到 eos-app / de-app。
    // 保留 /api/* 兼容旧直连 de-app 的路径（mem 里 eos-backend-wiring
    // 尚未全量翻译完之前）。
    // EAOS gateway 默认端口 :9200 (bin/eaos-stack/eaos-env.sh)。
    proxy: {
      '/v1': {
        target: process.env.VITE_PROXY_TARGET ?? process.env.EAOS_VITE_PROXY_TARGET ?? 'http://127.0.0.1:9200',
        changeOrigin: true,
        secure: false,
      },
      '/api': {
        target: process.env.VITE_PROXY_TARGET ?? process.env.EAOS_VITE_PROXY_TARGET ?? 'http://127.0.0.1:9200',
        changeOrigin: true,
        secure: false,
      },
      '/healthz': {
        target: process.env.VITE_PROXY_TARGET ?? process.env.EAOS_VITE_PROXY_TARGET ?? 'http://127.0.0.1:9200',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  preview: { host: true, port: 4173 },
  build: { target: 'es2022', sourcemap: true },
  test: { environment: 'jsdom' },
});
