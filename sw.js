/* Service Worker mínimo — Presupuestos Ágil
   Objetivo único: dejar la app instalable y disponible offline.
   No toca localStorage ni la lógica de la app; solo cachea el shell estático.
   Subí un número de versión (CACHE_NAME) cada vez que publiques cambios
   en index.html, styles.css o script.js para que los usuarios reciban
   la nueva versión de una — aunque con la estrategia network-first de
   abajo ya no debería hacer falta ni eso para HTML/CSS/JS. */

const CACHE_NAME = 'presupuestos-agil-v2';
const ARCHIVOS_CACHE = [
  './index.html',
  './styles.css',
  './script.js',
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

/* Network-first para el "app shell" (HTML, CSS, JS): así, cada vez que
   publiques un cambio, el usuario con internet lo recibe al toque, sin
   quedar pegado a una versión vieja cacheada. Si no hay red, cae al cache.
   Cache-first solo para íconos/manifest, que casi nunca cambian. */
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  const esHTML = event.request.mode === 'navigate' ||
    (event.request.headers.get('accept') || '').includes('text/html');
  const esAppShell = esHTML ||
    url.pathname.endsWith('/styles.css') ||
    url.pathname.endsWith('/script.js');

  if (esAppShell) {
    event.respondWith(
      fetch(event.request)
        .then((resp) => {
          const copia = resp.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copia));
          return resp;
        })
        .catch(() => caches.match(event.request).then((r) => r || (esHTML ? caches.match('./index.html') : undefined)))
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
