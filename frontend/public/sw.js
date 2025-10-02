// Service Worker for Canvas App Performance Optimization

const CACHE_NAME = 'canvas-app-v1';
const STATIC_CACHE = 'canvas-static-v1';
const DYNAMIC_CACHE = 'canvas-dynamic-v1';

// Critical resources to cache immediately
const STATIC_ASSETS = [
  '/',
  '/static/js/bundle.js',
  '/static/css/main.css',
  '/manifest.json',
  '/favicon.ico',
];

// Cache strategies for different types of resources
const CACHE_STRATEGIES = {
  // Static assets - Cache first with network fallback
  static: ['js', 'css', 'ico', 'png', 'jpg', 'jpeg', 'svg', 'woff', 'woff2'],
  
  // API calls - Network first with cache fallback
  api: ['/api/'],
  
  // HTML pages - Network first with cache fallback
  pages: ['html'],
};

// Install event - Cache critical resources
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => {
        console.log('Service Worker: Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - Clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
              console.log('Service Worker: Deleting old cache', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => self.clients.claim())
  );
});

// Fetch event - Implement caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests
  if (request.method !== 'GET') return;
  
  // Skip chrome-extension and non-http requests
  if (!request.url.startsWith('http')) return;
  
  event.respondWith(
    handleRequest(request, url)
  );
});

async function handleRequest(request, url) {
  const requestType = getRequestType(url);
  
  try {
    switch (requestType) {
      case 'static':
        return await cacheFirst(request);
      
      case 'api':
        return await networkFirst(request);
      
      case 'page':
        return await networkFirst(request);
      
      default:
        return await cacheFirst(request);
    }
  } catch (error) {
    console.error('Service Worker: Fetch error', error);
    return fetch(request);
  }
}

function getRequestType(url) {
  // Check for API calls
  if (url.pathname.startsWith('/api/')) {
    return 'api';
  }
  
  // Check for static assets
  const extension = url.pathname.split('.').pop();
  if (CACHE_STRATEGIES.static.includes(extension)) {
    return 'static';
  }
  
  // Check for HTML pages
  if (extension === 'html' || url.pathname === '/' || !extension) {
    return 'page';
  }
  
  return 'static';
}

// Cache first strategy - Good for static assets
async function cacheFirst(request) {
  const cachedResponse = await caches.match(request);
  
  if (cachedResponse) {
    // Update cache in background
    updateCacheInBackground(request);
    return cachedResponse;
  }
  
  // Not in cache, fetch from network and cache
  const networkResponse = await fetch(request);
  const responseToCache = networkResponse.clone();
  
  const cache = await caches.open(STATIC_CACHE);
  cache.put(request, responseToCache);
  
  return networkResponse;
}

// Network first strategy - Good for API calls and HTML
async function networkFirst(request) {
  try {
    const networkResponse = await fetch(request);
    
    // Cache successful responses
    if (networkResponse.ok) {
      const responseToCache = networkResponse.clone();
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, responseToCache);
    }
    
    return networkResponse;
  } catch (error) {
    // Network failed, try cache
    const cachedResponse = await caches.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return offline fallback for pages
    if (getRequestType(new URL(request.url)) === 'page') {
      return new Response(
        `<html>
          <body>
            <h1>Offline</h1>
            <p>You are currently offline. Please check your connection.</p>
          </body>
        </html>`,
        { 
          headers: { 'Content-Type': 'text/html' },
          status: 200 
        }
      );
    }
    
    throw error;
  }
}

// Background cache update
async function updateCacheInBackground(request) {
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, networkResponse);
    }
  } catch (error) {
    // Ignore background update errors
    console.log('Background cache update failed', error);
  }
}

// Message handling for cache management
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    clearAllCaches().then(() => {
      event.ports[0].postMessage({ success: true });
    });
  }
});

async function clearAllCaches() {
  const cacheNames = await caches.keys();
  return Promise.all(
    cacheNames.map(cacheName => caches.delete(cacheName))
  );
}