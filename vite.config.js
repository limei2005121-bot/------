import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    // 开发模式下把 /api 转发给 AI 后端代理（node server/index.mjs）
    proxy: {
      '/api': 'http://localhost:8787'
    }
  }
});
