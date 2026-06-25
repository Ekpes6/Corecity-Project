/* ─────────────────────────────────────────────────────────────────────────────
   CoreCity Nigeria — Service Worker (PWA)
   Strategy:
     • App-shell (HTML / JS / CSS) → Cache-first, revalidate in background
     • API calls (http://…/api/…)  → Network-first, fall back to cache
     • Images / static assets      → Cache-first, long-lived
   ─────────────────────────────────────────────────────────────────────────── */

const CACHE_VERSION   = 'corecity-v1';
const SHELL_CACHE     = `${CACHE_VERSION}-shell`;
const ASSETS_CACHE    = `${CACHE_VERSION}-assets`;
const API_CACHE       = `${CACHE_VERSION}-api`;

const APP_SHELL_URLS  = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.png',
];

// ── Install: pre-cache the app shell ────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => cache.addAll(APP_SHELL_URLS))
  );
  self.skipWaiting();
});

// ── Activate: delete old caches ──────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  const currentCaches = [SHELL_CACHE, ASSETS_CACHE, API_CACHE];
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => !currentCaches.includes(k))
          .map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// ── Fetch ────────────────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET and browser-extension requests
  if (request.method !== 'GET' || !url.protocol.startsWith('http')) return;

  // ── API calls → Network-first ──────────────────────────────────────────
  if (url.pathname.startsWith('/api/') || url.port === '8080') {
    event.respondWith(networkFirst(request, API_CACHE));
    return;
  }

  // ── Static assets (JS, CSS, images, fonts) → Cache-first ──────────────
  if (
    url.pathname.startsWith('/static/') ||
    /\.(png|jpg|jpeg|gif|webp|svg|woff2?|ttf|eot|ico)$/.test(url.pathname)
  ) {
    event.respondWith(cacheFirst(request, ASSETS_CACHE));
    return;
  }

  // ── App-shell HTML navigation → Cache-first, fall back to /index.html ──
  if (request.mode === 'navigate') {
    event.respondWith(
      caches.match(request).then(
        (cached) => cached || fetch(request).catch(() => caches.match('/index.html'))
      )
    );
    return;
  }

  // ── Everything else → Network-first ────────────────────────────────────
  event.respondWith(networkFirst(request, SHELL_CACHE));
});

/* ── Helpers ─────────────────────────────────────────────────────────────── */

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) {
    const cache = await caches.open(cacheName);
    cache.put(request, response.clone());
  }
  return response;
}

async function networkFirst(request, cacheName) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    return cached || new Response('{"error":"offline"}', {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
