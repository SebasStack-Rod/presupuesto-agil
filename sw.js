/* Service Worker mínimo — Presupuestos Ágil
   Objetivo único: dejar la app instalable y disponible offline.
   No toca localStorage ni la lógica de la app; solo cachea el shell estático.
   Subí un número de versión (CACHE_NAME) cada vez que publiques cambios
   en index.html para que los usuarios reciban la nueva versión. */

const CACHE_NAME = 'presupuestos-agil-v1';
const ARCHIVOS_CACHE = [
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(ARCHIVOS_CACHE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((nombres) =>
      Promise.all(
        nombres
          .filter((nombre) => nombre !== CACHE_NAME)
          .map((nombre) => caches.delete(nombre))
      )
    ).then(() => self.clients.claim())
  );
});

/* Network-first para HTML (para no quedarte pegado con una versión vieja de la app),
   cache-first para el resto (íconos, manifest). Si no hay red, cae al cache. */
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const esHTML = event.request.mode === 'navigate' ||
    (event.request.headers.get('accept') || '').includes('text/html');

  if (esHTML) {
    event.respondWith(
      fetch(event.request)
        .then((resp) => {
          const copia = resp.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copia));
          return resp;
        })
        .catch(() => caches.match(event.request).then((r) => r || caches.match('./index.html')))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((resp) => {
        const copia = resp.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copia));
        return resp;
      }).catch(() => cached);
    })
  );
});
