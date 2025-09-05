'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface PerformanceMetrics {
  renderTime: number;
  memoryUsage: number;
  networkRequests: number;
  cacheHitRate: number;
  bundleSize: number;
}

interface PerformanceMonitorProps {
  showInProduction?: boolean;
  className?: string;
}

/**
 * Performance monitoring component for development and debugging
 */
export const PerformanceMonitor: React.FC<PerformanceMonitorProps> = ({
  showInProduction = false,
  className = ''
}) => {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    renderTime: 0,
    memoryUsage: 0,
    networkRequests: 0,
    cacheHitRate: 0,
    bundleSize: 0
  });
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Only show in development or if explicitly enabled for production
    const shouldShow = process.env.NODE_ENV === 'development' || showInProduction;
    setIsVisible(shouldShow);

    if (!shouldShow) return;

    const measurePerformance = () => {
      // Measure render time using Performance API
      const renderStart = performance.now();
      
      // Memory usage (if available)
      const memoryInfo = (performance as any).memory;
      const memoryUsage = memoryInfo ? memoryInfo.usedJSHeapSize / 1024 / 1024 : 0;

      // Network requests count
      const navigationEntries = performance.getEntriesByType('navigation');
      const resourceEntries = performance.getEntriesByType('resource');
      const networkRequests = resourceEntries.length;

      // Cache hit rate estimation
      const cachedResources = resourceEntries.filter((entry: any) => 
        entry.transferSize === 0 && entry.decodedBodySize > 0
      ).length;
      const cacheHitRate = networkRequests > 0 ? (cachedResources / networkRequests) * 100 : 0;

      // Bundle size estimation
      const jsResources = resourceEntries.filter((entry: any) => 
        entry.name.includes('.js')
      );
      const bundleSize = jsResources.reduce((total: number, entry: any) => 
        total + (entry.transferSize || 0), 0
      ) / 1024; // KB

      const renderEnd = performance.now();
      const renderTime = renderEnd - renderStart;

      setMetrics({
        renderTime,
        memoryUsage,
        networkRequests,
        cacheHitRate,
        bundleSize
      });
    };

    // Initial measurement
    measurePerformance();

    // Update metrics every 5 seconds
    const interval = setInterval(measurePerformance, 5000);

    return () => clearInterval(interval);
  }, [showInProduction]);

  if (!isVisible) return null;

  const getPerformanceStatus = (metric: keyof PerformanceMetrics, value: number) => {
    const thresholds = {
      renderTime: { good: 16, warning: 32 }, // 60fps = 16ms, 30fps = 32ms
      memoryUsage: { good: 50, warning: 100 }, // MB
      networkRequests: { good: 20, warning: 50 },
      cacheHitRate: { good: 80, warning: 60 }, // %
      bundleSize: { good: 500, warning: 1000 } // KB
    };

    const threshold = thresholds[metric];
    if (metric === 'cacheHitRate') {
      // Higher is better for cache hit rate
      if (value >= threshold.good) return 'good';
      if (value >= threshold.warning) return 'warning';
      return 'poor';
    } else {
      // Lower is better for other metrics
      if (value <= threshold.good) return 'good';
      if (value <= threshold.warning) return 'warning';
      return 'poor';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'good': return 'bg-green-500';
      case 'warning': return 'bg-yellow-500';
      case 'poor': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <Card className={`fixed bottom-4 right-4 w-80 z-50 ${className}`}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center justify-between">
          Performance Monitor
          <Badge variant="outline" className="text-xs">
            {process.env.NODE_ENV}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex items-center justify-between">
            <span>Render Time:</span>
            <div className="flex items-center gap-1">
              <span>{metrics.renderTime.toFixed(1)}ms</span>
              <div 
                className={`w-2 h-2 rounded-full ${getStatusColor(
                  getPerformanceStatus('renderTime', metrics.renderTime)
                )}`}
              />
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <span>Memory:</span>
            <div className="flex items-center gap-1">
              <span>{metrics.memoryUsage.toFixed(1)}MB</span>
              <div 
                className={`w-2 h-2 rounded-full ${getStatusColor(
                  getPerformanceStatus('memoryUsage', metrics.memoryUsage)
                )}`}
              />
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <span>Requests:</span>
            <div className="flex items-center gap-1">
              <span>{metrics.networkRequests}</span>
              <div 
                className={`w-2 h-2 rounded-full ${getStatusColor(
                  getPerformanceStatus('networkRequests', metrics.networkRequests)
                )}`}
              />
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <span>Cache Hit:</span>
            <div className="flex items-center gap-1">
              <span>{metrics.cacheHitRate.toFixed(1)}%</span>
              <div 
                className={`w-2 h-2 rounded-full ${getStatusColor(
                  getPerformanceStatus('cacheHitRate', metrics.cacheHitRate)
                )}`}
              />
            </div>
          </div>
          
          <div className="flex items-center justify-between col-span-2">
            <span>Bundle Size:</span>
            <div className="flex items-center gap-1">
              <span>{metrics.bundleSize.toFixed(1)}KB</span>
              <div 
                className={`w-2 h-2 rounded-full ${getStatusColor(
                  getPerformanceStatus('bundleSize', metrics.bundleSize)
                )}`}
              />
            </div>
          </div>
        </div>
        
        <div className="pt-2 border-t text-xs text-gray-500">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <span>Good</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-yellow-500" />
              <span>Warning</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-red-500" />
              <span>Poor</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

/**
 * Hook for measuring component render performance
 */
export const useRenderPerformance = (componentName: string) => {
  useEffect(() => {
    const startTime = performance.now();
    
    return () => {
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`${componentName} render time: ${renderTime.toFixed(2)}ms`);
        
        // Log warning for slow renders
        if (renderTime > 16) {
          console.warn(`Slow render detected in ${componentName}: ${renderTime.toFixed(2)}ms`);
        }
      }
    };
  });
};

/**
 * Performance measurement utilities
 */
export const performanceUtils = {
  measureAsync: async <T,>(name: string, fn: () => Promise<T>): Promise<T> => {
    const start = performance.now();
    try {
      const result = await fn();
      const end = performance.now();
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`${name} completed in ${(end - start).toFixed(2)}ms`);
      }
      
      return result;
    } catch (error) {
      const end = performance.now();
      
      if (process.env.NODE_ENV === 'development') {
        console.error(`${name} failed after ${(end - start).toFixed(2)}ms:`, error);
      }
      
      throw error;
    }
  },
  
  measureSync: <T,>(name: string, fn: () => T): T => {
    const start = performance.now();
    try {
      const result = fn();
      const end = performance.now();
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`${name} completed in ${(end - start).toFixed(2)}ms`);
      }
      
      return result;
    } catch (error) {
      const end = performance.now();
      
      if (process.env.NODE_ENV === 'development') {
        console.error(`${name} failed after ${(end - start).toFixed(2)}ms:`, error);
      }
      
      throw error;
    }
  }
};

export default PerformanceMonitor;
