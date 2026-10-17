const CACHE_NAME = "liftflow-v2";
const APP_SHELL = [
  "/",
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/apple-touch-icon.png",
  "/favicon-32x32.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET" || new URL(request.url).origin !== self.location.origin) {
    return;
  }

  // Network first; keep a copy of good responses for offline use, but never cache errors.
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const responseCopy = response.clone();
          event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.put(request, responseCopy)));
        }
        return response;
      })
      .catch(() => caches.match(request)),
  );
});
