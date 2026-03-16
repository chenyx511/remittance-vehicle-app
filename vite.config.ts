import path from 'path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { inspectAttr } from 'kimi-plugin-inspect-react';

// https://vite.dev/config/
// 使用相对路径 base，保证在任意子路径（如 GitHub Pages）下脚本都能加载
// 部署到子路径时设置 VITE_BASE_PATH 供路由 basename 使用（如 /remittance-vehicle-app）
export default defineConfig(({ mode }) => ({
  base: './',
  plugins: [
    mode === 'development' ? inspectAttr() : null,
    react(),
  ].filter(Boolean),
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
}));
