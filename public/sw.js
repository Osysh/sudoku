const CACHE_NAME = "sudoky-cache-v2";
const STATIC_ASSETS = [
  "./manifest.webmanifest",
  "./icons/icon-192x192.png",
  "./icons/icon-512x512.png",
  "./icons/apple-touch-icon.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      await Promise.all(
        STATIC_ASSETS.map(async (asset) => {
          try {
            await cache.add(asset);
          } catch {
            // Ignore optional asset failures to avoid blocking SW install.
          }
        })
      );
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") {
    return;
  }

  const requestUrl = new URL(event.request.url);
  if (requestUrl.origin !== self.location.origin) {
    return;
  }

  const isDocumentRequest =
    event.request.mode === "navigate" ||
    event.request.destination === "document" ||
    (event.request.headers.get("accept") || "").includes("text/html");

  if (isDocumentRequest) {
    event.respondWith(fetch(event.request).catch(() => caches.match(event.request)));
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(event.request).then((networkResponse) => {
        const isHttp = event.request.url.startsWith("http");
        const isSuccessful = networkResponse && networkResponse.status === 200 && networkResponse.type === "basic";
        const shouldCache = !event.request.url.endsWith("/sw.js");
        if (isHttp && isSuccessful && shouldCache) {
          const responseCopy = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseCopy));
        }
        return networkResponse;
      }).catch(() => caches.match(event.request));
    })
  );
});
