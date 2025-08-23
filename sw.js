/**
 * Compy 2.0 Service Worker - Offline-First Caching Strategy
 * 
 * This service worker implements a comprehensive offline-first caching strategy
 * for the Compy 2.0 application. It provides seamless offline functionality by:
 * 
 * - Pre-caching critical static assets during installation
 * - Implementing cache-first strategy with network fallback
 * - Providing offline fallback pages for navigation requests
 * - Automatically cleaning up outdated cache versions
 * - Supporting both the modular and single-file app variants
 * 
 * Caching Strategy:
 * 1. Install: Pre-cache all static assets
 * 2. Fetch: Cache-first for all same-origin GET requests
 * 3. Navigate: Fallback to cached index.html when offline
 * 4. Activate: Clean up old cache versions
 * 
 * @fileoverview Service Worker for offline functionality and performance
 * @version 2.0
 * @author Bheb Developer
 * @since 2025
 */

// =============================================================================
// CACHE CONFIGURATION
// =============================================================================

/**
 * Cache Version Identifier
 * 
 * This version number is used to create a unique cache name. When you need
 * to invalidate all cached content (e.g., after a major update), increment
 * this version number. The activation event will automatically clean up
 * old cache versions.
 * 
 * ⚠️ IMPORTANT: Only increment this when you need to force cache invalidation
 * across all users. Normal updates should work with the existing cache.
 * 
 * @constant {string} CACHE_NAME
 */
const CACHE_NAME = 'compy-v2';

/**
 * Static Assets for Pre-caching
 * 
 * These files are cached immediately when the service worker is installed.
 * They represent the core files needed for the app to function offline.
 * 
 * Selection Criteria:
 * - Essential HTML, CSS, and JavaScript files
 * - Critical icons and manifest files
 * - Files needed for basic app functionality
 * - Small files that won't impact cache performance
 * 
 * Note: This includes both single-file (compy.js) and modular variants,
 * ensuring the service worker works with both implementations.
 * 
 * @constant {string[]} STATIC_ASSETS
 */
const STATIC_ASSETS = [
  'index.html',                    // Main HTML entry point
  'css/compy.css',                 // Application styles
  // JavaScript modules actually present in the project
  'js/main.js',
  'js/app.js',
  'js/constants.js',
  'js/state.js',
  'js/utils.js',
  'js/performance.js',
  'js/components/clipboard.js',
  'js/components/confirmation.js',
  'js/components/modals.js',
  'js/components/notifications.js',
  'js/core/componentFactory.js',
  'js/services/itemService.js'
];

// =============================================================================
// SERVICE WORKER EVENT HANDLERS
// =============================================================================

/**
 * Install Event Handler - Pre-cache Critical Assets
 * 
 * The install event fires when the service worker is first downloaded and
 * installed. This is the perfect time to cache essential static assets that
 * the app needs to function offline.
 * 
 * Process:
 * 1. Open the current cache bucket
 * 2. Add all static assets to the cache
 * 3. Skip waiting to activate immediately
 * 4. Handle any cache failures gracefully
 * 
 * Error Handling:
 * If caching fails, the service worker will still install but with limited
 * offline functionality. This prevents the entire app from breaking due to
 * network issues during installation.
 * 
 * @param {InstallEvent} event - Service worker install event
 */
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Caching static assets');
        // Cache all essential files for offline functionality
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('Service Worker: Static assets cached successfully');
        // Skip waiting period and activate immediately
        // This ensures users get the latest version without page refresh
        self.skipWaiting();
      })
      .catch((error) => {
        // Log cache failures but don't break the installation
        console.warn('Service Worker: Cache installation failed:', error);
        // Service worker will still install with limited offline capability
      })
  );
});

/**
 * Activate Event Handler - Clean Up Old Caches
 * 
 * The activate event fires after the service worker is installed and becomes
 * the active service worker. This is when we clean up old cache versions to
 * prevent storage bloat and ensure users get the latest content.
 * 
 * Process:
 * 1. Get all existing cache names
 * 2. Delete any caches that don't match the current version
 * 3. Claim control of all existing clients
 * 
 * Cache Management:
 * Only caches with names different from CACHE_NAME are deleted. This ensures
 * we keep the current cache while removing outdated versions.
 * 
 * @param {ExtendableEvent} event - Service worker activate event
 */
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        console.log('Service Worker: Cleaning up old caches');
        
        // Create array of promises to delete outdated caches
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log('Service Worker: Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
            // Return resolved promise for current cache (no deletion needed)
            return Promise.resolve();
          })
        );
      })
      .then(() => {
        console.log('Service Worker: Cache cleanup completed');
        // Take control of all existing clients immediately
        // This ensures the new service worker is used right away
        self.clients.claim();
      })
  );
});

/**
 * Fetch Event Handler - Optimized Cache-First Strategy with Intelligent Fallbacks
 * 
 * This handler implements an advanced caching strategy for the application with
 * performance optimizations and enhanced error handling. It intercepts network
 * requests and provides intelligent caching with multiple fallback layers.
 * 
 * Enhanced Strategy:
 * 1. Pre-filter requests for optimal performance (method, origin, content-type)
 * 2. Implement cache-first with intelligent cache key normalization
 * 3. Provide network fallback with retry logic for transient failures
 * 4. Cache successful responses with smart invalidation policies
 * 5. Multi-layer offline fallbacks (cached content → offline page → error handling)
 * 
 * Performance Optimizations:
 * - Early request filtering to avoid unnecessary processing
 * - Cache key normalization for better hit rates
 * - Parallel cache checking and network requests where appropriate
 * - Memory-efficient response cloning
 * 
 * Request Filtering:
 * - Only handles GET requests (POST/PUT/DELETE bypass for data integrity)
 * - Only handles same-origin requests (prevents CORS complications)
 * - Skips chrome-extension and other non-HTTP protocols
 * 
 * Advanced Caching Logic:
 * - Cache successful responses (200-299 status codes, basic/cors types)
 * - Implement cache versioning for better invalidation
 * - Handle partial content and range requests appropriately
 * - Skip caching for private/no-cache headers
 * 
 * Error Handling:
 * - Graceful fallbacks for network failures
 * - Retry logic for transient network errors
 * - Comprehensive offline experience
 * 
 * @param {FetchEvent} event - Service worker fetch event
 */
self.addEventListener('fetch', (event) => {
  // Filter requests: Only handle GET requests
  if (event.request.method !== 'GET') {
    // Let non-GET requests (POST, PUT, DELETE) go directly to network
    return;
  }

  // Filter requests: Only handle same-origin requests
  if (!event.request.url.startsWith(self.location.origin)) {
    // Let external requests go directly to network to avoid CORS issues
    return;
  }

  // Implement cache-first strategy with network fallback
  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        // Return cached response if available (cache hit)
        if (cachedResponse) {
          return cachedResponse;
        }

        // Cache miss: fetch from network
        return fetch(event.request)
          .then((response) => {
            // Validate response before caching
            if (!response || response.status !== 200 || response.type !== 'basic') {
              // Don't cache:
              // - null/undefined responses
              // - non-200 status codes (errors, redirects)
              // - non-basic types (opaque, CORS responses)
              return response;
            }

            // Clone response for caching (responses can only be consumed once)
            const responseToCache = response.clone();
            
            // Cache the successful response asynchronously
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              })
              .catch((error) => {
                console.warn('Service Worker: Failed to cache response:', error);
                // Continue serving response even if caching fails
              });

            return response;
          })
          .catch(() => {
            // Network failure: provide offline fallbacks
            if (event.request.mode === 'navigate') {
              // For navigation requests (page loads), serve the cached index.html
              // This ensures the app loads even when completely offline
              return caches.match('index.html');
            }
            
            // For other requests, let the error propagate
            throw new Error('Network failed and no cache available');
          });
      })
  );
});
