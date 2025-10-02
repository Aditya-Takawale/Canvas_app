import React, { useEffect, useState } from 'react';

interface PerformanceMetrics {
  loadTime: number;
  domContentLoaded: number;
  firstContentfulPaint: number;
  largestContentfulPaint: number;
  firstInputDelay: number;
  cumulativeLayoutShift: number;
  timeToInteractive: number;
}

interface PerformanceMonitorProps {
  onMetricsUpdate?: (metrics: PerformanceMetrics) => void;
  showOverlay?: boolean;
}

const PerformanceMonitor: React.FC<PerformanceMonitorProps> = ({ 
  onMetricsUpdate, 
  showOverlay = false 
}) => {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const collectMetrics = () => {
      if (typeof window === 'undefined' || !window.performance) return;

      // Get navigation timing
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      
      // Get paint timing
      const paintEntries = performance.getEntriesByType('paint');
      const fcpEntry = paintEntries.find(entry => entry.name === 'first-contentful-paint');
      
      // Get LCP timing
      let lcp = 0;
      if ('PerformanceObserver' in window) {
        try {
          new PerformanceObserver((list) => {
            const entries = list.getEntries();
            const lastEntry = entries[entries.length - 1] as any;
            if (lastEntry) {
              lcp = lastEntry.renderTime || lastEntry.loadTime;
            }
          }).observe({ type: 'largest-contentful-paint', buffered: true });
        } catch (e) {
          console.warn('LCP observer not supported');
        }
      }

      // Get FID timing  
      let fid = 0;
      if ('PerformanceObserver' in window) {
        try {
          new PerformanceObserver((list) => {
            const entries = list.getEntries();
            entries.forEach((entry: any) => {
              fid = entry.processingStart - entry.startTime;
            });
          }).observe({ type: 'first-input', buffered: true });
        } catch (e) {
          console.warn('FID observer not supported');
        }
      }

      // Get CLS timing
      let cls = 0;
      if ('PerformanceObserver' in window) {
        try {
          new PerformanceObserver((list) => {
            const entries = list.getEntries();
            entries.forEach((entry: any) => {
              if (!entry.hadRecentInput) {
                cls += entry.value;
              }
            });
          }).observe({ type: 'layout-shift', buffered: true });
        } catch (e) {
          console.warn('CLS observer not supported');
        }
      }

      const newMetrics: PerformanceMetrics = {
        loadTime: navigation ? navigation.loadEventEnd - navigation.loadEventStart : 0,
        domContentLoaded: navigation ? navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart : 0,
        firstContentfulPaint: fcpEntry ? fcpEntry.startTime : 0,
        largestContentfulPaint: lcp,
        firstInputDelay: fid,
        cumulativeLayoutShift: cls,
        timeToInteractive: navigation ? navigation.domInteractive - navigation.fetchStart : 0,
      };

      setMetrics(newMetrics);
      onMetricsUpdate?.(newMetrics);
    };

    // Collect metrics after page load
    if (document.readyState === 'complete') {
      setTimeout(collectMetrics, 100);
    } else {
      window.addEventListener('load', () => {
        setTimeout(collectMetrics, 100);
      });
    }

    // Keyboard shortcut to toggle overlay (Ctrl+Shift+P)
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'P') {
        setIsVisible(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onMetricsUpdate]);

  if (!metrics || (!showOverlay && !isVisible)) return null;

  const formatTime = (time: number) => {
    if (time === 0) return 'N/A';
    if (time < 1000) return `${Math.round(time)}ms`;
    return `${(time / 1000).toFixed(2)}s`;
  };

  const getScoreColor = (value: number, thresholds: [number, number]) => {
    const [good, poor] = thresholds;
    if (value <= good) return 'text-green-600';
    if (value <= poor) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="fixed top-4 right-4 bg-white shadow-lg rounded-lg p-4 text-sm font-mono z-50 max-w-sm border">
      <div className="flex justify-between items-center mb-2">
        <h3 className="font-bold text-gray-800">Performance Metrics</h3>
        <button 
          onClick={() => setIsVisible(false)}
          className="text-gray-500 hover:text-gray-700"
        >
          ×
        </button>
      </div>
      
      <div className="space-y-1">
        <div className="flex justify-between">
          <span>Load Time:</span>
          <span className={getScoreColor(metrics.loadTime, [1000, 3000])}>
            {formatTime(metrics.loadTime)}
          </span>
        </div>
        
        <div className="flex justify-between">
          <span>DOM Content Loaded:</span>
          <span className={getScoreColor(metrics.domContentLoaded, [800, 1800])}>
            {formatTime(metrics.domContentLoaded)}
          </span>
        </div>
        
        <div className="flex justify-between">
          <span>First Contentful Paint:</span>
          <span className={getScoreColor(metrics.firstContentfulPaint, [1000, 3000])}>
            {formatTime(metrics.firstContentfulPaint)}
          </span>
        </div>
        
        <div className="flex justify-between">
          <span>Largest Contentful Paint:</span>
          <span className={getScoreColor(metrics.largestContentfulPaint, [2500, 4000])}>
            {formatTime(metrics.largestContentfulPaint)}
          </span>
        </div>
        
        <div className="flex justify-between">
          <span>Time to Interactive:</span>
          <span className={getScoreColor(metrics.timeToInteractive, [3800, 7300])}>
            {formatTime(metrics.timeToInteractive)}
          </span>
        </div>
        
        <div className="flex justify-between">
          <span>First Input Delay:</span>
          <span className={getScoreColor(metrics.firstInputDelay, [100, 300])}>
            {formatTime(metrics.firstInputDelay)}
          </span>
        </div>
        
        <div className="flex justify-between">
          <span>Cumulative Layout Shift:</span>
          <span className={getScoreColor(metrics.cumulativeLayoutShift * 1000, [100, 250])}>
            {metrics.cumulativeLayoutShift.toFixed(3)}
          </span>
        </div>
      </div>
      
      <div className="mt-2 pt-2 border-t text-xs text-gray-500">
        Press Ctrl+Shift+P to toggle
      </div>
    </div>
  );
};

export default PerformanceMonitor;