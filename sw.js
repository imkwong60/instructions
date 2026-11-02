/* 說明本本 Service Worker */
const CACHE = 'benben-v1';
const IMAGE_CACHE = 'manuals-images-v1';
const PRECACHE = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  const keep = new Set([CACHE, IMAGE_CACHE]);
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => !keep.has(k)).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

function isSupabaseApi(url) {
  // Never cache Supabase REST/Auth APIs
  return (
    url.hostname.endsWith('supabase.co') &&
    (url.pathname.includes('/rest/v1/') || url.pathname.includes('/auth/v1/'))
  );
}

function isCdn(url) {
  const h = url.hostname;
  return (
    h === 'cdn.jsdelivr.net' ||
    h === 'unpkg.com' ||
    h.endsWith('jsdelivr.net') ||
    h.endsWith('unpkg.com')
  );
}

function isManualImage(url) {
  // Supabase Storage public object under the manuals bucket (photos, not index)
  return (
    url.hostname.endsWith('supabase.co') &&
    url.pathname.includes('/storage/v1/object/public/manuals/') &&
    !url.pathname.includes('/index.json')
  );
}

function isIndexJson(url) {
  return (
    url.hostname.endsWith('supabase.co') &&
    url.pathname.includes('/storage/v1/object/public/manuals/index.json')
  );
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Never intercept / cache APIs or third-party CDNs
  if (isSupabaseApi(url) || isCdn(url)) {
    return;
  }

  // Fonts: network with cache fallback
  if (
    url.hostname === 'fonts.googleapis.com' ||
    url.hostname === 'fonts.gstatic.com'
  ) {
    event.respondWith(fetch(req).catch(() => caches.match(req)));
    return;
  }

  // index.json → network-first, fallback to cache
  if (isIndexJson(url)) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res && res.ok) {
            const clone = res.clone();
            caches.open(CACHE).then((c) => c.put(req, clone)).catch(() => {});
          }
          return res;
        })
        .catch(() => caches.match(req))
    );
    return;
  }

  // Manual photos → cache-first using dedicated image cache
  if (isManualImage(url)) {
    event.respondWith(
      caches.open(IMAGE_CACHE).then(async (cache) => {
        const cached = await cache.match(req);
        if (cached) return cached;
        try {
          const res = await fetch(req);
          if (res && res.ok) {
            try {
              await cache.put(req, res.clone());
            } catch (_) {
              /* QuotaExceeded or other — ignore */
            }
          }
          return res;
        } catch (err) {
          const again = await cache.match(req);
          if (again) return again;
          throw err;
        }
      })
    );
    return;
  }

  // Same-origin static assets → cache-first
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(req).then((cached) => {
        const network = fetch(req)
          .then((res) => {
            if (res && res.ok) {
              const clone = res.clone();
              caches.open(CACHE).then((c) => c.put(req, clone)).catch(() => {});
            }
            return res;
          })
          .catch(() => cached);
        return cached || network;
      })
    );
  }
});
