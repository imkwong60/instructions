const CACHE = 'benben-shell-v2';
const IMAGE_CACHE = 'manuals-images-v1';
const IMAGE_CACHE_MAX = 200;
const APP_CACHE_PREFIX = 'benben-shell-';
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
    caches.open(CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((key) => key.startsWith(APP_CACHE_PREFIX) && key !== CACHE)
          .concat(keys.includes('benben-v1') ? ['benben-v1'] : [])
          .map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

function isSupabaseApi(url) {
  return url.hostname.endsWith('supabase.co') &&
    (url.pathname.includes('/rest/v1/') || url.pathname.includes('/auth/v1/'));
}

function isManualImage(url) {
  return url.hostname.endsWith('supabase.co') &&
    url.pathname.includes('/storage/v1/object/public/manuals/') &&
    !url.pathname.endsWith('/index.json');
}

function isIndexJson(url) {
  return url.hostname.endsWith('supabase.co') &&
    url.pathname.endsWith('/storage/v1/object/public/manuals/index.json');
}

function isInScope(url) {
  const scopePath = new URL(self.registration.scope).pathname;
  return url.pathname.startsWith(scopePath);
}

async function cacheResponse(cache, key, response, maxEntries) {
  if (response && response.ok) {
    try {
      await cache.put(key, response.clone());
      if (maxEntries) {
        const keys = await cache.keys();
        const overflow = keys.length - maxEntries;
        for (let i = 0; i < overflow; i++) {
          await cache.delete(keys[i]);
        }
      }
    } catch (error) {
      console.warn('Service Worker cache write failed:', error);
    }
  }
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || req.headers.has('range')) return;

  const url = new URL(req.url);
  if (isSupabaseApi(url)) return;

  if (isIndexJson(url)) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE);
      const cacheUrl = new URL(req.url);
      cacheUrl.search = '';
      const cacheKey = new Request(cacheUrl.href);
      try {
        const response = await fetch(req);
        await cacheResponse(cache, cacheKey, response);
        return response;
      } catch (error) {
        const cached = await cache.match(cacheKey);
        if (cached) return cached;
        throw error;
      }
    })());
    return;
  }

  if (isManualImage(url)) {
    event.respondWith((async () => {
      const cache = await caches.open(IMAGE_CACHE);
      const cached = await cache.match(req);
      if (cached) return cached;

      const response = await fetch(req);
      await cacheResponse(cache, req, response, IMAGE_CACHE_MAX);
      return response;
    })());
    return;
  }

  if (url.origin !== self.location.origin || !isInScope(url)) return;

  if (req.mode === 'navigate') {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE);
      const cacheKey = new Request(req.url);
      try {
        const response = await fetch(req);
        await cacheResponse(cache, cacheKey, response);
        return response;
      } catch (error) {
        const cached = await cache.match(cacheKey, { ignoreSearch: true });
        if (cached) return cached;
        const appShell = await cache.match(new URL('./index.html', self.registration.scope).href);
        if (appShell) return appShell;
        throw error;
      }
    })());
    return;
  }

  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const cached = await cache.match(req);
    if (cached) return cached;

    const response = await fetch(req);
    await cacheResponse(cache, req, response);
    return response;
  })());
});
