// Service Worker - 个人效率工作台 PWA (米菲兔风格 v2)
const CACHE_NAME = 'miffy-workbench-v11';
const CACHE_FILES = [
  './',
  './index.html',
  './css/styles.css?v=10',
  './js/storage.js?v=9',
  './js/today-in-history.js?v=9',
  './js/daily-why.js?v=9',
  './js/scheduler.js?v=9',
  './js/app.js?v=9',
  './manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(CACHE_FILES).catch(() => {});
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  // 跨域请求（如 Wikipedia API）不缓存，直接透传
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) {
    event.respondWith(fetch(event.request));
    return;
  }
  event.respondWith(
    fetch(event.request).then((response) => {
      const clone = response.clone();
      caches.open(CACHE_NAME).then((cache) => {
        cache.put(event.request, clone).catch(() => {});
      });
      return response;
    }).catch(() => {
      return caches.match(event.request).then((cached) => {
        return cached || new Response('Offline', { status: 503 });
      });
    })
  );
});
