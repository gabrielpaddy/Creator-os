const VERSION = 'v1';
const CACHE = 'creator-os-' + VERSION;

const PAGES = [
  '/',
  '/index.html',
  '/welcome.html',
  '/niche.html',
  '/platforms.html',
  '/dashboard.html',
  '/content-creator.html',
  '/clip-studio.html',
  '/voice-studio.html',
  '/thumbnail-studio.html',
  '/planner-studio.html',
  '/settings.html',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/apple-touch-icon.png'
];

// Install — cache all pages
self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(PAGES))
  );
});

// Activate — delete old caches
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch — network first for HTML (gets updates), cache fallback
self.addEventListener('fetch', e => {
  // Skip non-GET and API calls
  if (e.request.method !== 'GET') return;
  if (e.request.url.includes('api.anthropic.com')) return;
  if (e.request.url.includes('fonts.googleapis.com')) return;

  const isHTML = e.request.destination === 'document' ||
                 e.request.url.endsWith('.html');

  if (isHTML) {
    // Network first — so new deploys show up
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
    // Cache first for assets (icons etc)
    e.respondWith(
      caches.match(e.request).then(cached => cached || fetch(e.request))
    );
  }
});
