const CACHE_NAME = 'los-santos-reader-shell-v8';
const APP_SHELL = [
  './', './index.html', './offline.html', './login.html', './app.html', './book.html',
  './reader.html', './game.html', './profile.html', './settings.html', './admin.html', './reset.html',
  './manifest.webmanifest', './css/styles.css',
  './js/config.js', './js/ui.js', './js/auth.js', './js/shell.js', './js/data.js', './js/rewards.js', './js/pwa.js',
  './js/pages/admin.js', './js/pages/app.js', './js/pages/book.js', './js/pages/game.js',
  './js/pages/library.js', './js/pages/login.js', './js/pages/profile.js', './js/pages/reader.js', './js/pages/reset.js', './js/pages/settings.js',
  './assets/pwa/icon-192.png', './assets/pwa/icon-512.png', './assets/pwa/apple-touch-icon.png', './assets/pwa/favicon-48.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(
    keys.filter((key) => key.startsWith('los-santos-reader-shell-') && key !== CACHE_NAME).map((key) => caches.delete(key))
  )).then(() => self.clients.claim()));
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin || !url.pathname.startsWith(new URL('./', self.registration.scope).pathname)) return;

  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).then((response) => {
      if (response.ok) {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
      }
      return response;
    }).catch(async () => {
      const cached = await caches.match(request);
      if (cached) return cached;
      return (await caches.match('./offline.html')) || Response.error();
    }));
    return;
  }

  event.respondWith(caches.match(request).then((cached) => cached || fetch(request).then((response) => {
    if (response.ok) {
      const copy = response.clone();
      caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
    }
    return response;
  })));
});
