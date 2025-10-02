// Service Worker Registration and Asset Preloading Utilities

interface PreloadOptions {
  priority?: 'high' | 'low';
  as?: 'script' | 'style' | 'image' | 'fetch';
  crossorigin?: 'anonymous' | 'use-credentials';
}

class PerformanceOptimizer {
  private isServiceWorkerSupported: boolean;
  private swRegistration: ServiceWorkerRegistration | null = null;

  constructor() {
    this.isServiceWorkerSupported = 'serviceWorker' in navigator;
  }

  // Register service worker for caching
  async registerServiceWorker(): Promise<boolean> {
    if (!this.isServiceWorkerSupported) {
      console.log('Service Worker not supported');
      return false;
    }

    try {
      this.swRegistration = await navigator.serviceWorker.register('/sw.js');
      
      // Handle updates
      this.swRegistration.addEventListener('updatefound', () => {
        const newWorker = this.swRegistration?.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New version available
              this.notifyNewVersion();
            }
          });
        }
      });

      console.log('Service Worker registered successfully');
      return true;
    } catch (error) {
      console.error('Service Worker registration failed:', error);
      return false;
    }
  }

  // Preload critical resources
  preloadResource(url: string, options: PreloadOptions = {}): void {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.href = url;
    
    if (options.as) link.as = options.as;
    if (options.crossorigin) link.crossOrigin = options.crossorigin;
    if (options.priority === 'high') link.setAttribute('importance', 'high');
    
    document.head.appendChild(link);
  }

  // Preload critical app resources
  preloadCriticalResources(): void {
    // Preload key chunks that will be needed soon
    this.preloadResource('/static/js/vendors.chunk.js', { as: 'script', priority: 'high' });
    this.preloadResource('/static/js/react.chunk.js', { as: 'script', priority: 'high' });
    this.preloadResource('/static/css/main.css', { as: 'style', priority: 'high' });
    
    // Preload login art image
    this.preloadResource('/login-art.png', { as: 'image' });
  }

  // Lazy preload less critical resources
  lazyPreloadResources(): void {
    // Use requestIdleCallback for non-critical preloading
    const preloadWhenIdle = () => {
      this.preloadResource('/static/js/ui.chunk.js', { as: 'script' });
      this.preloadResource('/static/js/fabric.chunk.js', { as: 'script' });
    };

    if ('requestIdleCallback' in window) {
      requestIdleCallback(preloadWhenIdle);
    } else {
      setTimeout(preloadWhenIdle, 2000);
    }
  }

  // Prefetch resources for likely next pages
  prefetchNextPageResources(): void {
    // Prefetch canvas page resources when user is on login
    if (window.location.pathname === '/login') {
      setTimeout(() => {
        this.preloadResource('/api/rooms', { as: 'fetch' });
      }, 1000);
    }
    
    // Prefetch room resources when user is on rooms page
    if (window.location.pathname === '/rooms') {
      setTimeout(() => {
        this.preloadResource('/static/js/fabric.chunk.js', { as: 'script' });
      }, 500);
    }
  }

  // Image optimization utilities
  loadOptimizedImage(src: string, alt: string, className?: string): HTMLImageElement {
    const img = new Image();
    img.alt = alt;
    if (className) img.className = className;
    
    // Use modern formats if supported
    if (this.supportsWebP()) {
      const webpSrc = src.replace(/\.(jpg|jpeg|png)$/i, '.webp');
      img.src = webpSrc;
      
      // Fallback to original format
      img.onerror = () => {
        img.src = src;
      };
    } else {
      img.src = src;
    }
    
    // Add loading attribute for lazy loading
    img.loading = 'lazy';
    img.decoding = 'async';
    
    return img;
  }

  // Check WebP support
  supportsWebP(): boolean {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
  }

  // Notify user of new version
  private notifyNewVersion(): void {
    // You can implement a toast notification here
    console.log('New version available! Refresh to update.');
    
    // Auto-refresh after 5 seconds (optional)
    // setTimeout(() => window.location.reload(), 5000);
  }

  // Clear all caches (useful for debugging)
  async clearCaches(): Promise<void> {
    if (this.swRegistration) {
      const messageChannel = new MessageChannel();
      
      return new Promise((resolve) => {
        messageChannel.port1.onmessage = (event) => {
          if (event.data?.success) {
            console.log('Caches cleared successfully');
            resolve();
          }
        };
        
        this.swRegistration?.active?.postMessage(
          { type: 'CLEAR_CACHE' },
          [messageChannel.port2]
        );
      });
    }
  }

  // Initialize all performance optimizations
  async initialize(): Promise<void> {
    // Register service worker
    await this.registerServiceWorker();
    
    // Preload critical resources immediately
    this.preloadCriticalResources();
    
    // Lazy preload when browser is idle
    this.lazyPreloadResources();
    
    // Prefetch based on current page
    this.prefetchNextPageResources();
    
    console.log('Performance Optimizer initialized');
  }
}

// Create singleton instance
export const performanceOptimizer = new PerformanceOptimizer();

// Auto-initialize on DOM content loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    performanceOptimizer.initialize();
  });
} else {
  // DOM already loaded
  performanceOptimizer.initialize();
}

export default PerformanceOptimizer;