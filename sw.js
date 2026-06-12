const CACHE = 'wm2026-v5';
const BASE  = self.registration.scope.replace(/\/$/, '');
const SHELL = ['', '/style.css', '/app.js', '/manifest.json', '/icons/icon-192.png', '/icons/icon-512.png'].map(p => BASE + (p || '/'));

// Install: cache app shell
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)));
  self.skipWaiting();
});

// Activate: remove old caches
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: cache-first for shell, network-first for API
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  if (url.pathname.includes('/api/') || url.pathname.includes('/api.php')) {
    // API: network first, no caching
    e.respondWith(fetch(e.request).catch(() =>
      new Response(JSON.stringify({ error: 'Offline' }), {
        headers: { 'Content-Type': 'application/json' }
      })
    ));
    return;
  }

  // Shell: cache first
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request).then(res => {
      if (res.ok) {
        const clone = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
      }
      return res;
    }))
  );
});
