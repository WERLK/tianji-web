var CACHE_NAME = 'tianji-v25';
var ASSETS = [
  '/tianji-web/',
  '/tianji-web/index.html',
  '/tianji-web/css/style.css',
  '/tianji-web/js/utils.js',
  '/tianji-web/js/app.js',
  '/tianji-web/js/knowledge.js',
  '/tianji-web/js/supabase-config.js',
  '/tianji-web/js/cloud.js',
  '/tianji-web/manifest.json',
  '/tianji-web/icons/icon-192.png',
  '/tianji-web/icons/icon-512.png'
];

self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(ASSETS);
    })
  );
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

self.addEventListener('fetch', function(e) {
  e.respondWith(
    caches.match(e.request).then(function(cached) {
      return cached || fetch(e.request).then(function(response) {
        if (response.status === 200 && response.type === 'basic') {
          var clone = response.clone();
          caches.open(CACHE_NAME).then(function(cache) {
            cache.put(e.request, clone);
          });
        }
        return response;
      }).catch(function() {
        if (e.request.mode === 'navigate') {
          return caches.match('/tianji-web/index.html');
        }
      });
    })
  );
});
