const CACHE = "boodschappen-cache-v3";
const ASSETS = ["./","./index.html","./styles.css","./app.js","./manifest.webmanifest","./icon-180.png","./icon-512.png"];
const NETWORK_TIMEOUT = 3000;

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Network-first so updates show up immediately; cache as offline fallback.
// A slow network (e.g. in the store) falls back to cache after a timeout.
self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET" || new URL(request.url).origin !== location.origin) return;

  const network = fetch(request, { cache: "no-cache" }).then(response => {
    if (response.ok) {
      const copy = response.clone();
      caches.open(CACHE).then(cache => cache.put(request, copy));
    }
    return response;
  });
  event.waitUntil(network.catch(() => {}));

  const timeout = new Promise((_, reject) => setTimeout(reject, NETWORK_TIMEOUT));

  event.respondWith(
    Promise.race([network, timeout]).catch(() =>
      caches.match(request, { ignoreSearch: true }).then(cached => cached || network)
    )
  );
});
