const CACHE_NAME = "musannaf-cache-v2";
const CORE_ASSETS = [
  "/",
  "/index.html",
  "/style.css",
  "/app.js",
  "/manifest.json"
];
const DATA_PATH = "data/";

// Install event: cache core assets
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(CORE_ASSETS))
  );
  self.skipWaiting();
});

// Activate event: remove old caches
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) return caches.delete(key);
        })
      )
    )
  );
  self.clients.claim();
});

// Fetch event: serve cached core assets and JSON files
self.addEventListener("fetch", event => {
  const requestUrl = new URL(event.request.url);

  // Only handle requests from our origin
  if (requestUrl.origin === location.origin) {
    // Handle hadith JSON dynamically
    if (requestUrl.pathname.startsWith(`/${DATA_PATH}`)) {
      event.respondWith(
        caches.match(event.request).then(cacheRes => {
          if (cacheRes) return cacheRes; // serve from cache

          return fetch(event.request).then(networkRes => {
            return caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, networkRes.clone()); // cache it
              return networkRes;
            });
          }).catch(() => {
            return new Response(
              JSON.stringify([]),
              { headers: { "Content-Type": "application/json" } }
            );
          });
        })
      );
      return; // skip default handler
    }

    // Default handler for other assets
    event.respondWith(
      caches.match(event.request).then(response => response || fetch(event.request))
    );
  }
});