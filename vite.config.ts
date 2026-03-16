import path from 'path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { inspectAttr } from 'kimi-plugin-inspect-react';

// https://vite.dev/config/
// 部署到 GitHub Pages 时需设置 VITE_BASE_PATH=/你的仓库名/
export default defineConfig({
  base: process.env.VITE_BASE_PATH ?? './',
  plugins: [inspectAttr(), react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
