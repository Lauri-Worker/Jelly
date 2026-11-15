// Offline-Unterstützung: alles network-first mit Cache als Fallback.
const CACHE = 'jelly-notes-v10';
const SHELL = ['./', './index.html', './style.css', './app.js', './db.js', './icon.svg', './apple-touch-icon.png', './icon-192.png', './icon-512.png', './manifest.webmanifest', './cloud.js', './scan.js', './legal.js', './covers.js', './config.js', './vendor/supabase.js', './vendor/fonts/bricolage-grotesque-latin-600-normal.woff2', './vendor/fonts/bricolage-grotesque-latin-700-normal.woff2', './vendor/fonts/bricolage-grotesque-latin-800-normal.woff2',
  './vendor/jspdf.umd.min.js', './vendor/pdf.min.js', './vendor/pdf.worker.min.js'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))));
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    // Schriften: erst Cache, sonst Netz (damit sie auch offline da sind)
    e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((res) => {
      const copy = res.clone();
      caches.open(CACHE).then((c) => c.put(req, copy));
      return res;
    })));
    return;
  }
  if (url.origin === location.origin) {
    // Immer beim Server nachfragen (no-cache), damit Updates sofort ankommen
    const fresh = req.mode === 'navigate' ? fetch(req.url, { cache: 'no-cache', credentials: 'same-origin' }) : fetch(req, { cache: 'no-cache' });
    e.respondWith(
      fresh
        .then((res) => {
          if (!res.ok) return res;
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req, { ignoreSearch: true }).then((r) => r || caches.match('./index.html')))
    );
  }
});
