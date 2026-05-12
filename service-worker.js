/* =============================================================================
   Pixel Round — service-worker.js
   All Rights Reserved.

   Minimal offline-first PWA service worker. Caches the app shell on install
   and serves from cache when offline. Bumping the CACHE version invalidates
   the previous cache on next activation.
   ============================================================================ */
const CACHE = 'pixel-round-v2';
const ASSETS = [
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

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
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
  e.respondWith(
    caches.match(e.request).then(hit => hit || fetch(e.request).catch(() => hit))
  );
});
