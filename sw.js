const CACHE_NAME = 'robo-labo-kids-v3-offline';
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './manifest.json',
  './js/audio-voice.js',
  './js/robo-renderer.js',
  './js/adaptive-ai.js',
  './js/games-solo.js',
  './js/game-coop.js',
  './js/garage-zukan.js',
  './js/main.js',
  './audio/voicepack_manifest.json',
  './audio/pack_3.bin',
  './audio/pack_81.bin',
  './audio/pack_32.bin'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET' || event.request.url.includes('/api/')) {
    return;
  }
  event.respondWith(
    caches.match(event.request, { ignoreSearch: true }).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((resp) => {
        if (resp && resp.status === 200 && resp.type === 'basic') {
          const clone = resp.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return resp;
      });
    })
  );
});
