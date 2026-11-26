// Afgan S&L service worker. Two jobs:
// 1. Code, fonts and icons come from the phone, not the network (they never change under the same URL).
// 2. Opening the app never stares at a blank screen. Measured on the live app: after the phone
//    sat idle for an hour, the first open spends 0.5-2.3 s renewing the sign-in and ~0.8 s on the
//    first (cold) database queries before the server sends a single byte. So if the server hasn't
//    answered within SLOW_MS, the last copy of the page shows at once and the fresh one replaces
//    it the moment it arrives.
const STATIC = 'static-v1';
const PAGES = 'pages-v1';
const SLOW_MS = 350;
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
  let saving = null;
  const network = fetch(req).then((res) => {
    // Only real pages: never a redirect to /login or an error. Saving runs alongside, so the
    // page streams to the screen without waiting for the copy to finish.
    if (res.ok && !res.redirected) saving = cache.put(req, res.clone()).catch(() => {});
    return res;
  });
  const cached = await cache.match(req);
  if (!cached) return network;
  let servedCache = false;
  const slow = new Promise((resolve) => setTimeout(() => { servedCache = true; resolve(markStale(cached)); }, SLOW_MS));
  event.waitUntil(network.then(async () => {
    await saving;
    if (!servedCache) return;
    const all = await self.clients.matchAll({ type: 'window' });
    all.forEach((c) => c.postMessage({ type: 'fresh' }));
  }).catch(() => {}));
  return Promise.race([network.catch(() => { servedCache = true; return markStale(cached); }), slow]);
}

// Tells the page it is an old copy, so it holds back its prefetches (they would each renew the
// sign-in at the same time) until the fresh copy has landed. React skips extra tags in <head>.
async function markStale(res) {
  const html = await res.clone().text();
  const headers = new Headers(res.headers);
  headers.delete('content-length');
  headers.delete('content-encoding');
  return new Response(html.replace('<head>', '<head><script>window.__afganStale=1</script>'), { status: res.status, statusText: res.statusText, headers });
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
