// Afgan S&L service worker. Two jobs:
// 1. Code, fonts and icons come from the phone, not the network (they never change under the same URL).
// 2. Opening the app never stares at a blank screen: if the server is slow (cold start) or the
//    phone is offline, the last copy of the page shows at once, and the fresh one replaces it
//    the moment it arrives.
const STATIC = 'static-v1';
const PAGES = 'pages-v1';
const SLOW_MS = 2500;
const PAGE_PATHS = ['/', '/events', '/me', '/manage', '/money', '/team', '/inventory'];

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (![STATIC, PAGES].includes(k)) await caches.delete(k);
    await self.clients.claim();
  })());
});

// Sign-out wipes saved pages, so the next person on this phone sees nothing of yours.
self.addEventListener('message', (e) => {
  if (e.data === 'clear') e.waitUntil(caches.delete(PAGES));
});

async function trim(cache, max) {
  const keys = await cache.keys();
  for (const k of keys.slice(0, Math.max(0, keys.length - max))) await cache.delete(k);
}

async function staticFirst(req) {
  const cache = await caches.open(STATIC);
  const hit = await cache.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (res.ok) { cache.put(req, res.clone()); trim(cache, 150); }
  return res;
}

async function page(event) {
  const req = event.request;
  const cache = await caches.open(PAGES);
  const network = fetch(req).then(async (res) => {
    // Only real pages: never a redirect to /login or an error.
    if (res.ok && !res.redirected) await cache.put(req, res.clone());
    return res;
  });
  const cached = await cache.match(req);
  if (!cached) return network;
  let servedCache = false;
  const slow = new Promise((resolve) => setTimeout(() => { servedCache = true; resolve(cached); }, SLOW_MS));
  event.waitUntil(network.then(async () => {
    if (!servedCache) return;
    const all = await self.clients.matchAll({ type: 'window' });
    all.forEach((c) => c.postMessage({ type: 'fresh' }));
  }).catch(() => {}));
  return Promise.race([network.catch(() => cached), slow]);
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/_next/static/') || url.pathname.startsWith('/icons/')) {
    event.respondWith(staticFirst(req));
    return;
  }
  if (req.mode === 'navigate' && PAGE_PATHS.includes(url.pathname) && !url.search) {
    event.respondWith(page(event));
  }
});
