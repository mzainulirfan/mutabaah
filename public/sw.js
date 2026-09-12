// Mutabaah PWA SW — v7 (pengingat lokal)
const CACHE = "mutabaah-v7";
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

  // Navigasi: network-first, hanya cache 200
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok && res.type === "basic") {
            const clone = res.clone();
            caches.open(CACHE).then((c) => c.put(req, clone));
          }
          return res;
        })
        .catch(() => caches.match(req).then((cached) => cached || caches.match("/")))
    );
    return;
  }

  // Images/fonts/manifest: cache-first, hanya same-origin
  if (url.pathname.match(/\.(png|svg|woff2|json)$/) && !url.pathname.startsWith("/_next/") && (url.pathname.match(/\.(png|svg|woff2)$/))) {
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

// Ketuk notifikasi pengingat → buka/fokus halaman mutabaah.
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || "/mutabaah";
  e.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((wins) => {
      for (const w of wins) {
        if (new URL(w.url).pathname === url) return w.focus();
      }
      return self.clients.openWindow(url);
    })
  );
});

// Push dari server (Edge Function send-reminders) — tampil walau aplikasi mati.
self.addEventListener("push", (e) => {
  let payload = {};
  try {
    payload = e.data ? e.data.json() : {};
  } catch {}
  const title = payload.title || "Mutabaah";
  const options = {
    body: payload.body || "Sudah mengisi mutabaah hari ini?",
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    tag: payload.tag || "mutabaah-server",
    data: { url: (payload.data && payload.data.url) || "/mutabaah" },
  };
  e.waitUntil(self.registration.showNotification(title, options));
});
