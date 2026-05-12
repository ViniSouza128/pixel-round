/* =============================================================================
   Pixel Round — service-worker.js
   All Rights Reserved.

   Minimal offline-first PWA service worker. Caches the app shell on install
   and serves from cache when offline. Bumping the CACHE version invalidates
   the previous cache on next activation.

   v3 changes:
     - Install no longer uses cache.addAll (atomic) — one bad asset would
       reject the whole install and break offline support entirely. Each
       request is now cached individually with a per-asset .catch so a
       missing/optional resource (e.g. cross-origin fonts under a flaky
       network) can't take down the install.
     - The fetch handler used to return `undefined` when a non-cached
       request failed offline (it tried `hit || fetch().catch(() => hit)`
       where hit was already undefined). Now it returns the cached page
       shell as a graceful fallback so respondWith never sees `undefined`.
     - Cross-origin fonts (Google Fonts CSS + font files) are pre-cached
       opportunistically with `no-cors`. They live in the same cache and
       get refreshed alongside other assets.
   ============================================================================ */
const CACHE = 'pixel-round-v3';

/* Local app shell — these MUST work for the app to function. */
const CORE_ASSETS = [
  './',
  './index.html',
  './style.css',
  './manifest.json',
  './favicon.svg',
  './js/i18n.js',
  './js/state.js',
  './js/algorithms.js',
  './js/audio.js',
  './js/canvas2d.js',
  './js/canvas3d.js',
  './js/ui.js',
  './js/main.js',
];

/* Cross-origin extras. Cached opportunistically — if the network is flaky
   on first install we still want the rest of the app to work. */
const EXTRA_ASSETS = [
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500;700&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/three.js/r134/three.min.js',
];

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    // Individual .catch per asset so one 404 / network blip doesn't
    // reject the whole install. Same-origin assets use the default mode;
    // cross-origin uses no-cors so the response can still be cached as
    // an opaque resource.
    await Promise.all(CORE_ASSETS.map(url =>
      cache.add(url).catch(err => {
        console.warn('[SW] core asset failed to cache:', url, err);
      })
    ));
    await Promise.all(EXTRA_ASSETS.map(url =>
      cache.add(new Request(url, { mode: 'no-cors' })).catch(err => {
        console.warn('[SW] extra asset failed to cache:', url, err);
      })
    ));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith((async () => {
    // 1. Try the cache first.
    const hit = await caches.match(e.request);
    if (hit) return hit;
    // 2. Fall back to the network; on success, opportunistically cache it.
    try {
      const res = await fetch(e.request);
      if (res && res.ok && (res.type === 'basic' || res.type === 'opaque')){
        const clone = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone)).catch(() => {});
      }
      return res;
    } catch (_) {
      // 3. Offline AND not cached. For navigation requests, serve the
      //    cached shell so the SPA still boots. Otherwise let the
      //    failure propagate (a missing image is better than a hung
      //    page).
      if (e.request.mode === 'navigate'){
        const shell = await caches.match('./index.html');
        if (shell) return shell;
      }
      return Response.error();
    }
  })());
});
