const VERSION = 'v3';
const CACHE = `creator-os-${VERSION}`;

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    Promise.all([
      caches.keys().then(keys =>
        Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
      ),
      'navigationPreload' in self.registration
        ? self.registration.navigationPreload.enable()
        : Promise.resolve()
    ]).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = e.request.url;
  if (url.includes('api.anthropic.com') ||
      url.includes('fonts.googleapis.com') ||
      url.includes('fonts.gstatic.com')) return;

  const isHTML = e.request.destination === 'document' || url.endsWith('.html');

  if (isHTML) {
    e.respondWith((async () => {
      try {
        const networkResponse = e.preloadResponse
          ? await e.preloadResponse
          : await fetch(e.request);
        if (networkResponse?.ok) {
          const cache = await caches.open(CACHE);
          await cache.put(e.request, networkResponse.clone());
        }
        return networkResponse;
      } catch(e) {
        const cached = await caches.match(e.request);
        return cached || new Response(
          '<h1>Offline</h1><p>Check your connection and try again.</p>',
          { status: 503, headers: { 'Content-Type': 'text/html' } }
        );
      }
    })());
  } else {
    e.respondWith((async () => {
      const cached = await caches.match(e.request);
      if (cached) return cached;
      try {
        const networkResponse = await fetch(e.request);
        if (networkResponse?.ok) {
          const cache = await caches.open(CACHE);
          await cache.put(e.request, networkResponse.clone());
        }
        return networkResponse;
      } catch(e) {
        return new Response('Asset unavailable offline', { status: 503 });
      }
    })());
  }
});
