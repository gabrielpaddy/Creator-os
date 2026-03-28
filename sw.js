const VERSION = 'v2';
const CACHE = 'creator-os-' + VERSION;

// Install — no pre-caching, instant activation
self.addEventListener('install', e => {
  self.skipWaiting();
});

// Activate — wipe old caches, take control instantly
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// Fetch:
//   API / fonts  → always pass through, never cache
//   HTML pages   → network first (fresh on every deploy), cache as offline fallback
//   Assets       → cache first, lazy-fill on miss
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;

  const url = e.request.url;

  if (url.includes('api.anthropic.com')) return;
  if (url.includes('fonts.googleapis.com')) return;
  if (url.includes('fonts.gstatic.com')) return;

  const isHTML = e.request.destination === 'document' || url.endsWith('.html');

  if (isHTML) {
    e.respondWith(
      fetch(e.request)
        .then(res => {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
          return res;
        })
        .catch(() => caches.match(e.request))
    );
  } else {
    e.respondWith(
      caches.match(e.request).then(cached => {
        if (cached) return cached;
        return fetch(e.request).then(res => {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
          return res;
        });
      })
    );
  }
});