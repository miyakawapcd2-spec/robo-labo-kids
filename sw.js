const CACHE_NAME = 'robo-labo-kids-v11-kanji-free-fx-stages';
const CORE_ASSETS = [
  './',
  './index.html',
  './style.css',
  './manifest.json',
  './js/adaptive-ai.js',
  './js/robo_labo_bgm_api.js',
  './js/audio-voice.js',
  './js/robo-renderer.js',
  './js/games-solo.js',
  './js/game-coop.js',
  './js/garage-zukan.js',
  './js/main.js',
  './audio/voicepack_manifest.json',
  './audio/pack_3.bin',
  './audio/pack_32.bin',
  './audio/pack_81.bin',
  './img/icon-180.png',
  './img/icon-192.png',
  './img/icon-512.png',
  './img/bg_space_lab.webp',
  './img/boss_0.webp',
  './img/boss_1.webp',
  './img/boss_2.webp',
  './img/zukan_trex.webp',
  './img/zukan_tricera.webp',
  './img/zukan_ptera.webp',
  './img/zukan_rocket.webp',
  './img/zukan_blackhole.webp',
  './img/zukan_gear.webp',
  './img/zukan_magnet.webp'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((k) => (k !== CACHE_NAME ? caches.delete(k) : Promise.resolve())))
    )
  );
  self.clients.claim();
});

function isMediaAsset(pathname) {
  return pathname.includes('/audio/') || pathname.includes('/img/');
}

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  // audio/ や img/ はキャッシュ優先（オフライン時に安定再生）
  if (isMediaAsset(url.pathname)) {
    event.respondWith(
      caches.match(event.request, { ignoreSearch: true }).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((res) => {
          if (res && res.status === 200 && res.type === 'basic') {
            const copy = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          }
          return res;
        });
      })
    );
    return;
  }

  // HTML / JS / CSS / JSON はネットワーク優先（オンライン時は最新版を取得し、オフライン時はキャッシュを返す）
  event.respondWith(
    fetch(event.request)
      .then((res) => {
        if (res && res.status === 200 && res.type === 'basic') {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        }
        return res;
      })
      .catch(() => caches.match(event.request, { ignoreSearch: true }))
  );
});
