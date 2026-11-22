/* Service Worker: macht die App offline nutzbar.
   Strategie: zuerst Netz (immer aktuelle Version), ohne Netz aus dem Zwischenspeicher. */
const CACHE = 'tarock-v1';
const DATEIEN = ['./', 'index.html', 'style.css', 'app.js', 'regeln.js', 'manifest.json',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/maskable-512.png'];

self.addEventListener('install', ev => {
  ev.waitUntil(caches.open(CACHE).then(c => c.addAll(DATEIEN)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', ev => {
  ev.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', ev => {
  if (ev.request.method !== 'GET' || new URL(ev.request.url).origin !== location.origin) return;
  ev.respondWith(
    fetch(ev.request, { cache: 'no-cache' })
      .then(antwort => {
        const kopie = antwort.clone();
        caches.open(CACHE).then(c => c.put(ev.request, kopie));
        return antwort;
      })
      .catch(() => caches.match(ev.request, { ignoreSearch: true }).then(r => r || caches.match('index.html')))
  );
});
