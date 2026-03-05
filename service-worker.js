const CACHE_NAME = 'video-saver-v1';
const urlsToCache = [
  'index.html',
  'm.index.html',
  'styles.css',
  'm.styles.css',
  'script.js',
  'm.script.js',
  'assets/icons/icon-192.png',
  'assets/icons/icon-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
  );
});