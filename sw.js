var CACHE_NAME = 'tianji-v7';
var ASSETS = [
  '/tianji-web/',
  '/tianji-web/index.html',
  '/tianji-web/css/style.css',
  '/tianji-web/js/utils.js',
  '/tianji-web/js/app.js',
  '/tianji-web/js/knowledge.js',
  '/tianji-web/js/supabase-config.js',
  '/tianji-web/js/cloud.js',
  '/tianji-web/js/divination.js',
  '/tianji-web/manifest.json',
  '/tianji-web/icons/icon-192.png',
  '/tianji-web/icons/icon-512.png'
];

self.addEventListener('install', function(e) {
  self.skipWaiting();
});

self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(k) { return k !== CACHE_NAME; })
            .map(function(k) { return caches.delete(k); })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('message', function(e) {
  if (e.data === 'skipWaiting') self.skipWaiting();
});

// Network First: 优先网络，失败才用缓存
self.addEventListener('fetch', function(e) {
  e.respondWith(
    fetch(e.request).then(function(response) {
      if (response && response.status === 200) {
        var clone = response.clone();
        caches.open(CACHE_NAME).then(function(cache) {
          cache.put(e.request, clone);
        });
      }
      return response;
    }).catch(function() {
      return caches.match(e.request).then(function(cached) {
        return cached || caches.match('/tianji-web/index.html');
      });
    })
  );
});
