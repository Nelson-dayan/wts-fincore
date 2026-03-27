/**
 * No-op service worker (legacy PWA removed).
 * - Stops GET /sw.js 404 for browsers that still have an old registration.
 * - Clears Workbox/caches on activate; does not intercept fetches.
 */
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});
