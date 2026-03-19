import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import i18n from './i18n';
import { ErrorBoundary } from './ErrorBoundary';
import App from './App.tsx';

const syncPageMetaWithLanguage = (language: string) => {
  document.title = i18n.t('common.appName');
  document.documentElement.lang = language.startsWith('zh') ? 'zh-CN' : 'ja';

  const appleTitleMeta = document.querySelector('meta[name="apple-mobile-web-app-title"]');
  if (appleTitleMeta) {
    appleTitleMeta.setAttribute('content', i18n.t('common.appName'));
  }
};

syncPageMetaWithLanguage(i18n.resolvedLanguage || i18n.language || 'ja');
i18n.on('languageChanged', syncPageMetaWithLanguage);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
