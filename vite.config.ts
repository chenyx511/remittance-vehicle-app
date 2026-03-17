import path from 'path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { inspectAttr } from 'kimi-plugin-inspect-react';

const basePath = process.env.VITE_BASE_PATH || '';

// 部署到子路径时注入 <base>，使 manifest、图标等相对路径在任意子路由刷新时都能正确解析
function baseTagPlugin() {
  return {
    name: 'html-base-tag',
    transformIndexHtml(html: string) {
      if (!basePath) return html;
      return html.replace('<head>', `<head>\n    <base href="${basePath}">`);
    },
  };
}

// https://vite.dev/config/
// 部署到 GitHub Pages 子路径时，必须用绝对 base，否则在 /remittances/2 等子路由刷新时资源 404。VITE_BASE_PATH 由 workflow 传入。
export default defineConfig(({ mode }) => ({
  base: basePath || './',
  plugins: [
    mode === 'development' ? inspectAttr() : null,
    baseTagPlugin(),
    react(),
  ].filter(Boolean),
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
}));
