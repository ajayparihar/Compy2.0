/**
 * Service Worker for Compy 2.0 PWA
 * 
 * Provides caching, offline functionality, and theme synchronization
 * for the Progressive Web App version of Compy 2.0.
 * 
 * Features:
 * - Static asset caching
 * - Dynamic theme manifest updates
 * - Cross-context theme synchronization
 * - Offline support
 * 
 * @fileoverview Service worker for PWA functionality
 * @version 2.0
 * @since 2025
 */

const CACHE_NAME = 'compy-2.0-v1';
const STATIC_CACHE_NAME = 'compy-static-v1';
const DYNAMIC_CACHE_NAME = 'compy-dynamic-v1';

// Files to cache immediately
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/css/compy.css',
  '/js/main.js',
  '/js/app.js',
  '/js/state.js',
  '/js/utils.js',
  '/js/constants.js',
  '/js/themes.js',
  '/js/utils/pwaUtils.js',
  '/js/lib/Sortable.min.js',
  '/favicon_io/favicon.ico',
  '/favicon_io/android-chrome-192x192.png',
  '/favicon_io/android-chrome-512x512.png',
  '/favicon_io/apple-touch-icon.png',
  '/favicon_io/site.webmanifest'
];

// Dynamic theme color mapping for manifest updates
const THEME_COLORS = {
  'dark-mystic-forest': '#4ade80',
  'dark-crimson-night': '#f87171',
  'dark-royal-elegance': '#a78bfa',
  'light-sunrise': '#c2410c',
  'light-soft-glow': '#2563eb',
  'light-floral-breeze': '#14532d',
  'dark-dracula': '#ff79c6',
  'dark-solarized': '#36c5b5',
  'dark-midnight-blue': '#39bae6',
  'dark-night-owl': '#82aaff',
  'dark-monokai': '#a6e22e',
  'dark-deep-ocean': '#4dd0e1',
  'dark-high-contrast': '#00ff00',
  'dark-professional': '#14a085',
  'dark-gruvbox': '#fabd2f',
  'dark-material': '#03dac6',
  'light-solarized': '#1c5f96',
  'light-high-contrast': '#0000ff',
  'light-professional': '#1565c0',
  'light-pastel-mint': '#0a6b64',
  'light-earth-tones': '#8b4513',
  'light-oceanic': '#2e5984',
  'light-vanilla-cream': '#a0520d',
  'light-nordic': '#3e5a7a',
  'light-material': '#6200ee',
  'light-warm-beige': '#8b6508'
};

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing');
  
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('Service Worker: Static assets cached successfully');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('Service Worker: Failed to cache static assets:', error);
      })
  );
});

// Activate event - clean up old caches and take control
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE_NAME && cacheName !== DYNAMIC_CACHE_NAME) {
              console.log('Service Worker: Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('Service Worker: Taking control of all clients');
        return self.clients.claim();
      })
  );
});

// Fetch event - serve cached content and handle dynamic requests
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Handle manifest requests with dynamic theme colors
  if (url.pathname.endsWith('site.webmanifest')) {
    event.respondWith(handleManifestRequest(request));
    return;
  }
  
  // Handle other requests with cache-first strategy
  event.respondWith(
    caches.match(request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        
        // Not in cache, fetch from network
        return fetch(request)
          .then((response) => {
            // Don't cache non-successful responses
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            
            // Cache successful responses
            const responseToCache = response.clone();
            caches.open(DYNAMIC_CACHE_NAME)
              .then((cache) => {
                cache.put(request, responseToCache);
              });
            
            return response;
          })
          .catch((error) => {
            console.error('Service Worker: Fetch failed:', error);
            
            // Return offline fallback for HTML requests
            if (request.headers.get('accept').includes('text/html')) {
              return caches.match('/index.html');
            }
            
            throw error;
          });
      })
  );
});

// Handle manifest requests with dynamic theme colors
async function handleManifestRequest(request) {
  try {
    // Get the original manifest
    const response = await fetch(request);
    const manifest = await response.json();
    
    // Check for theme updates from localStorage (if available)
    const clients = await self.clients.matchAll();
    let themeUpdate = null;
    
    for (const client of clients) {
      try {
        // Request theme info from client
        const themeInfo = await new Promise((resolve) => {
          const channel = new MessageChannel();
          channel.port1.onmessage = (event) => {
            resolve(event.data);
          };
          
          client.postMessage({ type: 'GET_THEME' }, [channel.port2]);
          
          // Timeout after 1 second
          setTimeout(() => resolve(null), 1000);
        });
        
        if (themeInfo && themeInfo.theme) {
          themeUpdate = themeInfo.theme;
          break;
        }
      } catch (error) {
        // Ignore client communication errors
      }
    }
    
    // Update manifest with current theme colors
    if (themeUpdate && THEME_COLORS[themeUpdate]) {
      manifest.theme_color = THEME_COLORS[themeUpdate];
      manifest.background_color = getBackgroundColor(themeUpdate);
    }
    
    // Return updated manifest
    return new Response(JSON.stringify(manifest), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache'
      }
    });
    
  } catch (error) {
    console.error('Service Worker: Failed to handle manifest request:', error);
    // Return original manifest on error
    return fetch(request);
  }
}

// Get background color for theme
function getBackgroundColor(themeId) {
  // Map themes to background colors
  const backgrounds = {
    'dark-mystic-forest': '#0a0d10',
    'dark-crimson-night': '#0f0a0a',
    'dark-royal-elegance': '#0c0a14',
    'light-sunrise': '#fef7ed',
    'light-soft-glow': '#f8fafc',
    'light-floral-breeze': '#f0fdf4'
    // Add more as needed
  };
  
  return backgrounds[themeId] || (themeId.startsWith('dark-') ? '#0a0d10' : '#fafafa');
}

// Handle messages from clients
self.addEventListener('message', (event) => {
  const { data } = event;
  
  switch (data.type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;
      
    case 'CACHE_THEME_UPDATE':
      // Cache theme update for manifest
      if (data.theme && THEME_COLORS[data.theme]) {
        console.log('Service Worker: Caching theme update:', data.theme);
        // Theme will be applied on next manifest request
      }
      break;
      
    case 'CLEAR_CACHE':
      // Clear all caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => caches.delete(cacheName))
        );
      }).then(() => {
        console.log('Service Worker: All caches cleared');
        event.ports[0]?.postMessage({ success: true });
      });
      break;
      
    default:
      console.log('Service Worker: Unknown message type:', data.type);
  }
});

// Handle sync events (for background theme synchronization)
self.addEventListener('sync', (event) => {
  if (event.tag === 'theme-sync') {
    event.waitUntil(syncTheme());
  }
});

// Sync theme across contexts
async function syncTheme() {
  try {
    const clients = await self.clients.matchAll();
    
    for (const client of clients) {
      client.postMessage({ type: 'SYNC_THEME' });
    }
    
    console.log('Service Worker: Theme sync requested for all clients');
  } catch (error) {
    console.error('Service Worker: Theme sync failed:', error);
  }
}