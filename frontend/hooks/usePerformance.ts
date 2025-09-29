'use client';

import { useEffect, useState, useCallback, useRef } from 'react';

interface PerformanceMetrics {
  renderTime: number;
  memoryUsage: number;
  networkRequests: number;
  errorCount: number;
  fps: number;
  lastUpdate: Date;
}

interface UsePerformanceOptions {
  enabled?: boolean;
  updateInterval?: number;
  onMetricsUpdate?: (metrics: PerformanceMetrics) => void;
}

export function usePerformance(options: UsePerformanceOptions = {}) {
  const {
    enabled = false,
    updateInterval = 5000,
    onMetricsUpdate
  } = options;

  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    renderTime: 0,
    memoryUsage: 0,
    networkRequests: 0,
    errorCount: 0,
    fps: 60,
    lastUpdate: new Date()
  });

  const renderStartTime = useRef<number>(0);
  const networkRequestCount = useRef<number>(0);
  const errorCount = useRef<number>(0);
  const frameCount = useRef<number>(0);
  const lastFrameTime = useRef<number>(0);

  // Track render performance
  const trackRenderStart = useCallback(() => {
    if (!enabled) return;
    renderStartTime.current = performance.now();
  }, [enabled]);

  const trackRenderEnd = useCallback(() => {
    if (!enabled || renderStartTime.current === 0) return;
    
    const renderTime = performance.now() - renderStartTime.current;
    setMetrics(prev => ({
      ...prev,
      renderTime,
      lastUpdate: new Date()
    }));
    
    renderStartTime.current = 0;
  }, [enabled]);

  // Track FPS
  const trackFPS = useCallback(() => {
    if (!enabled) return;

    const now = performance.now();
    frameCount.current++;

    if (lastFrameTime.current === 0) {
      lastFrameTime.current = now;
      return;
    }

    const deltaTime = now - lastFrameTime.current;
    if (deltaTime >= 1000) {
      const fps = Math.round((frameCount.current * 1000) / deltaTime);
      setMetrics(prev => ({
        ...prev,
        fps,
        lastUpdate: new Date()
      }));
      
      frameCount.current = 0;
      lastFrameTime.current = now;
    }
  }, [enabled]);

  // Track memory usage
  const updateMemoryUsage = useCallback(() => {
    if (!enabled || typeof window === 'undefined') return;

    if ('memory' in performance) {
      const memory = (performance as any).memory;
      const usedMB = Math.round(memory.usedJSHeapSize / 1024 / 1024);
      setMetrics(prev => ({
        ...prev,
        memoryUsage: usedMB,
        lastUpdate: new Date()
      }));
    }
  }, [enabled]);

  // Track network requests
  useEffect(() => {
    if (!enabled) return;

    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      networkRequestCount.current++;
      setMetrics(prev => ({
        ...prev,
        networkRequests: networkRequestCount.current,
        lastUpdate: new Date()
      }));
      
      try {
        const response = await originalFetch(...args);
        return response;
      } catch (error) {
        errorCount.current++;
        setMetrics(prev => ({
          ...prev,
          errorCount: errorCount.current,
          lastUpdate: new Date()
        }));
        throw error;
      }
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, [enabled]);

  // Performance monitoring interval
  useEffect(() => {
    if (!enabled) return;

    const interval = setInterval(() => {
      updateMemoryUsage();
    }, updateInterval);

    return () => clearInterval(interval);
  }, [enabled, updateInterval, updateMemoryUsage]);

  // FPS tracking
  useEffect(() => {
    if (!enabled) return;

    let animationFrameId: number;
    
    const measureFPS = () => {
      trackFPS();
      animationFrameId = requestAnimationFrame(measureFPS);
    };

    measureFPS();

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [enabled, trackFPS]);

  // Notify parent component of metrics updates
  useEffect(() => {
    if (onMetricsUpdate) {
      onMetricsUpdate(metrics);
    }
  }, [metrics, onMetricsUpdate]);

  // Performance optimization utilities
  const debounce = useCallback(<T extends (...args: any[]) => any>(
    func: T,
    delay: number
  ): ((...args: Parameters<T>) => void) => {
    let timeoutId: NodeJS.Timeout;
    return (...args: Parameters<T>) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func(...args), delay);
    };
  }, []);

  const throttle = useCallback(<T extends (...args: any[]) => any>(
    func: T,
    delay: number
  ): ((...args: Parameters<T>) => void) => {
    let lastCall = 0;
    return (...args: Parameters<T>) => {
      const now = Date.now();
      if (now - lastCall >= delay) {
        lastCall = now;
        func(...args);
      }
    };
  }, []);

  // Memoization helper
  const memoize = useCallback(<T extends (...args: any[]) => any>(
    func: T
  ): T => {
    const cache = new Map();
    return ((...args: Parameters<T>) => {
      const key = JSON.stringify(args);
      if (cache.has(key)) {
        return cache.get(key);
      }
      const result = func(...args);
      cache.set(key, result);
      return result;
    }) as T;
  }, []);

  // Get performance recommendations
  const getRecommendations = useCallback(() => {
    const recommendations: string[] = [];

    if (metrics.renderTime > 100) {
      recommendations.push('Consider optimizing component rendering');
    }

    if (metrics.memoryUsage > 100) {
      recommendations.push('High memory usage detected - check for memory leaks');
    }

    if (metrics.fps < 30) {
      recommendations.push('Low FPS detected - consider reducing animations');
    }

    if (metrics.errorCount > 5) {
      recommendations.push('Multiple errors detected - check error handling');
    }

    if (metrics.networkRequests > 50) {
      recommendations.push('High network activity - consider caching');
    }

    return recommendations;
  }, [metrics]);

  return {
    metrics,
    trackRenderStart,
    trackRenderEnd,
    debounce,
    throttle,
    memoize,
    getRecommendations,
    isEnabled: enabled
  };
}

// Performance optimization hook for components
export function useOptimizedCallback<T extends (...args: any[]) => any>(
  callback: T,
  deps: React.DependencyList,
  optimization: 'debounce' | 'throttle' | 'memoize' = 'memoize',
  delay?: number
): T {
  const { debounce, throttle, memoize } = usePerformance({ enabled: true });

  return React.useCallback(() => {
    switch (optimization) {
      case 'debounce':
        return debounce(callback, delay || 300);
      case 'throttle':
        return throttle(callback, delay || 100);
      case 'memoize':
      default:
        return memoize(callback);
    }
  }, deps) as T;
}

// Performance monitoring component
export function usePerformanceMonitor(
  componentName: string,
  options: UsePerformanceOptions = {}
) {
  const { trackRenderStart, trackRenderEnd, metrics } = usePerformance(options);

  useEffect(() => {
    trackRenderStart();
    return () => trackRenderEnd();
  }, [trackRenderStart, trackRenderEnd]);

  useEffect(() => {
    if (options.onMetricsUpdate) {
      options.onMetricsUpdate({
        ...metrics,
        componentName
      } as any);
    }
  }, [metrics, componentName, options.onMetricsUpdate]);

  return {
    metrics,
    trackRenderStart,
    trackRenderEnd
  };
}
