const CACHE_NAME = 'kuma-axis-v1'
const OFFLINE_URLS = ['/', '/manifest.json']

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(OFFLINE_URLS)))
})

self.addEventListener('fetch', (event) => {
  event.respondWith(caches.match(event.request).then((cached) => cached ?? fetch(event.request)))
})
