/* Legacy PWA worker: vyčistiť cache a odregistrovať sa. Appka pri štarte tiež odhlasuje SW. */
self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));
      await self.clients.claim();
      try {
        await self.registration.unregister();
      } catch (_) {
        /* ignore */
      }
    })()
  );
});

self.addEventListener("fetch", (event) => {
  event.respondWith(fetch(event.request));
});
