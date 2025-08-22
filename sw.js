/**
 * Compy 2.0 Service Worker
 * Cache-first strategy for static assets with runtime caching for same-origin GET requests.
 * Provides offline fallback to index.html for navigation requests.
 */
/** Name of the versioned cache bucket. Increment to invalidate old caches. */
const CACHE_NAME = 'compy-v2';
/** Static assets to pre-cache during install for offline support. */
const STATIC_ASSETS = [
  'index.html',
  'css/compy.css',
  'js/compy.js',
  'favicon_io/favicon.ico',
  'favicon_io/favicon-16x16.png',
  'favicon_io/favicon-32x32.png',
  'favicon_io/apple-touch-icon.png',
  'favicon_io/site.webmanifest'
];

/**
 * Install event: pre-cache known static assets and activate the service worker immediately.
 */
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        self.skipWaiting();
      })
      .catch((error) => {
        console.warn('Cache installation failed:', error);
      })
  );
});

/**
 * Activate event: remove previous cache buckets that no longer match CACHE_NAME.
 */
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log('Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        self.clients.claim();
      })
  );
});

/**
 * Fetch event: serve same-origin GET requests from cache first, then network.
 * Navigation requests fall back to the cached index.html when offline.
 */
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // Skip external requests
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }

        return fetch(event.request)
          .then((response) => {
            // Don't cache non-successful responses
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Clone the response before caching
            const responseToCache = response.clone();
            
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              })
              .catch((error) => {
                console.warn('Failed to cache response:', error);
              });

            return response;
          })
          .catch(() => {
            // Return a basic offline page for navigation requests
            if (event.request.mode === 'navigate') {
              return caches.match('index.html');
            }
            throw new Error('Network failed and no cache available');
          });
      })
  );
});
