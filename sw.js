const CACHE_NAME = "musannaf-cache-v1";
const ASSETS_TO_CACHE = [
  "/",
  "/index.html",
  "/style.css",
  "/app.js",
  "/manifest.json"
];

// Install event
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS_TO_CACHE))
  );
  self.skipWaiting();
});

// Activate event
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

// Fetch event
self.addEventListener("fetch", event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      // Serve cache if available, else fetch from network
      return response || fetch(event.request);
    })
  );
});