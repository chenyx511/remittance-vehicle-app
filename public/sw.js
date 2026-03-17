const CACHE_NAME = 'remittance-vehicle-v3';
// 从 sw.js 所在目录推导 app 根路径，支持子路径部署
const getBase = () => new URL('./', self.location.href).href;
const getStaticAssets = () => {
  const base = getBase();
  return [base, base + 'index.html', base + 'manifest.json'];
};

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(getStaticAssets());
    }).catch(() => {}),
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.filter((name) => name !== CACHE_NAME).map((name) => caches.delete(name)),
      );
    }),
  );
  self.clients.claim();
});

// Fetch event - serve from cache or network
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  if (event.request.url.includes('/api/')) return;

  const isNav = event.request.mode === 'navigate';
  const base = getBase();
  const isAppUrl = event.request.url.startsWith(base) || event.request.url === base.replace(/\/$/, '');

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;

      return fetch(event.request)
        .then((response) => {
          // SPA: 子路径刷新时服务器可能 404，用 index.html 顶替
          if (isNav && isAppUrl && (!response || response.status === 404)) {
            return caches.match(base + 'index.html').then((index) => index || response);
          }
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          return response;
        })
        .catch(() => {
          // 网络失败：优先用缓存，导航请求回退到 index.html
          return caches.match(event.request).then((cached) => {
            if (cached) return cached;
            if (isNav && isAppUrl) return caches.match(base + 'index.html');
            return undefined;
          });
        });
    }),
  );
});

// Push event - handle push notifications
self.addEventListener('push', (event) => {
  if (!event.data) return;

  const data = event.data.json();
  const base = getBase();
  const options = {
    body: data.content || '',
    icon: base + 'icon-192x192.png',
    badge: base + 'icon-72x72.png',
    tag: data.id || 'default',
    requireInteraction: true,
    data: data,
  };

  event.waitUntil(self.registration.showNotification(data.title || '新通知', options));
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const data = event.notification.data;
  let url = getBase();

  if (data?.relatedType && data?.relatedId) {
    url = getBase() + data.relatedType + 's/' + data.relatedId;
  }

  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      const path = url.replace(getBase(), '');
      for (const client of clientList) {
        const onSamePage = path ? client.url.includes(path) : (client.url === getBase() || client.url === getBase().replace(/\/$/, ''));
        if (onSamePage && 'focus' in client) {
          return client.focus();
        }
      }
      // Otherwise open a new window
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    }),
  );
});
