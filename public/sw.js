// Mutabaah PWA SW — v5 quran via alquran.cloud (Madinah akurat)
const CACHE = "mutabaah-v5";
const PRECACHE = ["/", "/manifest.json", "/icon-192.png", "/icon-512.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== self.location.origin) return;

  // Jangan cache _next chunks — selalu network (hindari stale Loader2)
  if (url.pathname.startsWith("/_next/")) {
    e.respondWith(fetch(req).catch(() => caches.match(req)));
    return;
  }

  // Navigasi: network-first
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req)
        .then((res) => {
          const clone = res.clone();
          caches.open(CACHE).then((c) => c.put(req, clone));
          return res;
        })
        .catch(() => caches.match(req).then((cached) => cached || caches.match("/")))
    );
    return;
  }

  // Images/fonts/manifest: cache-first
  if (url.pathname.match(/\.(png|svg|woff2|json)$/) && !url.pathname.startsWith("/_next/")) {
    e.respondWith(
      caches.match(req).then((cached) => {
        if (cached) return cached;
        return fetch(req).then((res) => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE).then((c) => c.put(req, clone));
          }
          return res;
        });
      })
    );
    return;
  }

  // Lainnya: network-first
  e.respondWith(fetch(req).then((res) => {
    if (res.ok) { const clone = res.clone(); caches.open(CACHE).then((c) => c.put(req, clone)); }
    return res;
  }).catch(() => caches.match(req)));
});
