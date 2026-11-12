// The app moved from /v2/ to the site root. This replaces the old /v2/ service
// worker: it removes itself and sends any open /v2/ window to the new address.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    const root = new URL('../', self.registration.scope).href;
    await self.registration.unregister();
    const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    await Promise.all(clients.filter(c => c.url.includes('/v2/')).map(c => c.navigate(root).catch(() => {})));
  })());
});
