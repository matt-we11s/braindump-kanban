const CACHE = 'farm-kanban-v7';
const PRECACHE = [
  './',
  './index.html',
  './tailwind.css',
  './manifest.webmanifest',
  './vendor/lucide-0.454.0.min.js',
  './vendor/sortable-1.15.2.min.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png'
];

// Only cache our own files (all app assets are vendored same-origin) and pinned CDN paths.
// Apps Script / Google responses are never cached, so the cache stays bounded.
const PINNED_CDN_PREFIXES = [
  'https://cdn.jsdelivr.net/npm/sortablejs@1.15.2/',
  'https://unpkg.com/lucide@0.454.0/'
];

function mayCache(url) {
  if (url.origin === self.location.origin) return true;
  return PINNED_CDN_PREFIXES.some((p) => url.href.startsWith(p));
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (!mayCache(url)) return; // let the browser handle it, no caching

  const isAppDoc = req.mode === 'navigate' || url.pathname.endsWith('.html') || url.pathname.endsWith('/braindump-kanban/');

  if (isAppDoc) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((cache) => cache.put('./index.html', copy));
          return res;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((cache) => cache.put(req, copy));
        }
        return res;
      })
      .catch(() => caches.match(req))
  );
});
