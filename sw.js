// ESM Security — Service Worker v3.0
// IMPORTANTE: HTMLs nunca são cacheados para evitar loops de redirect
const CACHE = 'esm-v3';
const CACHE_ASSETS = [
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './icon-apple.png'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(CACHE_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // HTMLs: SEMPRE busca da rede (nunca cache)
  // Evita loop de redirect por arquivo HTML desatualizado em cache
  if (e.request.destination === 'document' ||
      url.pathname.endsWith('.html') ||
      url.pathname.endsWith('/')) {
    e.respondWith(fetch(e.request));
    return;
  }

  // Firebase, Anthropic, fontes: sempre rede
  if (url.hostname.includes('anthropic.com') ||
      url.hostname.includes('firebase') ||
      url.hostname.includes('googleapis.com') ||
      url.hostname.includes('gstatic.com')) {
    e.respondWith(fetch(e.request));
    return;
  }

  // Imagens e outros assets: cache primeiro
  e.respondWith(
    caches.match(e.request).then(cached =>
      cached || fetch(e.request).then(res => {
        if (res && res.status === 200 && res.type !== 'opaque') {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, copy));
        }
        return res;
      })
    ).catch(() => new Response('Offline', { status: 503 }))
  );
});
