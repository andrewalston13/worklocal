// WorkLocal Service Worker
const CACHE_NAME = 'worklocal-v1';
const STATIC_ASSETS = [
  '/index.html',
  '/worklocal_map.html',
  '/worklocal_spot_detail.html',
  '/worklocal_profile.html',
  '/worklocal_checkin.html',
  '/worklocal_review.html',
  '/worklocal_add_spot.html',
  '/worklocal_about.html',
  '/worklocal_auth.js',
  '/worklocal_config.js',
  '/manifest.json',
];

// Install — cache static assets
self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate — clean up old caches
self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      );
    })
  );
  self.clients.claim();
});

// Fetch — network first, fall back to cache
self.addEventListener('fetch', function(e) {
  // Skip non-GET and Supabase API calls (always need fresh data)
  if (e.request.method !== 'GET') return;
  if (e.request.url.includes('supabase.co')) return;
  if (e.request.url.includes('googleapis.com')) return;

  e.respondWith(
    fetch(e.request)
      .then(function(res) {
        // Cache successful responses
        if (res && res.status === 200) {
          var resClone = res.clone();
          caches.open(CACHE_NAME).then(function(cache) {
            cache.put(e.request, resClone);
          });
        }
        return res;
      })
      .catch(function() {
        // Network failed — serve from cache
        return caches.match(e.request);
      })
  );
});
