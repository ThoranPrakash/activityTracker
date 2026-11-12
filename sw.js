// Offline support: serve the app from cache, refresh the cache in the background.
// Bump VERSION whenever app files change so phones pick up the update.
// (ft2-v1 and ft2-v2 were used by the earlier /v2/ location; they are cleaned up below.)
const VERSION = 'ft2-v3';
const ROOT = new URL('./', self.location).pathname;
const FILES = [
  './', './index.html', './manifest.webmanifest', './css/app.css',
  './js/app.js', './js/core.js', './js/util.js', './js/store.js', './js/calc.js', './js/ui.js',
  './js/today.js', './js/workout.js', './js/food.js', './js/progress.js', './js/settings.js',
  './data/foods.js', './data/exercises.js', './data/program.js',
  './icons/icon.svg', './icons/icon-192.png', './icons/icon-512.png',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(FILES.map(f => new Request(f, { cache: 'reload' })))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k.startsWith('ft2-') && k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin) return;
  // The app used to live under v2/ — send anyone still opening that address here.
  if (url.pathname.startsWith(ROOT + 'v2/')) {
    if (req.mode === 'navigate') e.respondWith(Response.redirect(ROOT, 302));
    return;
  }
  e.respondWith(
    caches.open(VERSION).then(async cache => {
      const cached = await cache.match(req, { ignoreSearch: true });
      const network = fetch(req)
        .then(res => { if (res.ok) cache.put(req, res.clone()); return res; })
        .catch(() => cached);
      return cached || network;
    })
  );
});
