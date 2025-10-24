'use client';

import { useEffect, useState, useRef } from 'react';
import { Activity, Clock, Zap, AlertTriangle } from 'lucide-react';

interface PerformanceMetrics {
  renderTime: number;
  memoryUsage: number;
  networkRequests: number;
  errorCount: number;
  lastUpdate: Date;
}

interface PerformanceMonitorProps {
  enabled?: boolean;
  onMetricsUpdate?: (metrics: PerformanceMetrics) => void;
}

export default function PerformanceMonitor({ 
  enabled = false, 
  onMetricsUpdate 
}: PerformanceMonitorProps) {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    renderTime: 0,
    memoryUsage: 0,
    networkRequests: 0,
    errorCount: 0,
    lastUpdate: new Date()
  });
  
  const renderStartTime = useRef<number>(0);
  const networkRequestCount = useRef<number>(0);
  const errorCount = useRef<number>(0);

  // Track render performance
  useEffect(() => {
    if (!enabled) return;

    renderStartTime.current = performance.now();
    
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry) => {
        if (entry.entryType === 'measure') {
          const renderTime = entry.duration;
          setMetrics(prev => ({
            ...prev,
            renderTime,
            lastUpdate: new Date()
          }));
        }
      });
    });

    observer.observe({ entryTypes: ['measure'] });

    return () => {
      observer.disconnect();
      if (renderStartTime.current > 0) {
        performance.measure('kiosk-render', renderStartTime.current.toString());
      }
    };
  }, [enabled]);

  // Track memory usage
  useEffect(() => {
    if (!enabled) return;

    const updateMemoryUsage = () => {
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        const usedMB = Math.round(memory.usedJSHeapSize / 1024 / 1024);
        setMetrics(prev => ({
          ...prev,
          memoryUsage: usedMB,
          lastUpdate: new Date()
        }));
      }
    };

    updateMemoryUsage();
    const interval = setInterval(updateMemoryUsage, 5000); // Update every 5 seconds

    return () => clearInterval(interval);
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

  // Notify parent component of metrics updates
  useEffect(() => {
    if (onMetricsUpdate) {
      onMetricsUpdate(metrics);
    }
  }, [metrics, onMetricsUpdate]);

  if (!enabled) {
    return null;
  }

  const getPerformanceStatus = (renderTime: number, memoryUsage: number) => {
    if (renderTime > 100 || memoryUsage > 100) return 'poor';
    if (renderTime > 50 || memoryUsage > 50) return 'fair';
    return 'good';
  };

  const status = getPerformanceStatus(metrics.renderTime, metrics.memoryUsage);
  const statusColor = status === 'good' ? 'text-green-400' : status === 'fair' ? 'text-yellow-400' : 'text-red-400';

  return (
    <div className="fixed top-4 right-4 bg-black/80 backdrop-blur-sm p-3 rounded-lg border border-gray-600/30 text-white text-xs z-50">
      <div className="flex items-center space-x-2 mb-2">
        <Activity className="w-4 h-4" />
        <span className="font-semibold">Performance</span>
        <div className={`w-2 h-2 rounded-full ${
          status === 'good' ? 'bg-green-400' : status === 'fair' ? 'bg-yellow-400' : 'bg-red-400'
        }`}></div>
      </div>
      
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-1">
            <Clock className="w-3 h-3" />
            <span>Render:</span>
          </div>
          <span className={statusColor}>
            {metrics.renderTime.toFixed(1)}ms
          </span>
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-1">
            <Zap className="w-3 h-3" />
            <span>Memory:</span>
          </div>
          <span className={statusColor}>
            {metrics.memoryUsage}MB
          </span>
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-1">
            <Activity className="w-3 h-3" />
            <span>Requests:</span>
          </div>
          <span className="text-blue-400">
            {metrics.networkRequests}
          </span>
        </div>
        
        {metrics.errorCount > 0 && (
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-1">
              <AlertTriangle className="w-3 h-3" />
              <span>Errors:</span>
            </div>
            <span className="text-red-400">
              {metrics.errorCount}
            </span>
          </div>
        )}
      </div>
      
      <div className="mt-2 pt-2 border-t border-gray-600/30 text-gray-400">
        Updated: {metrics.lastUpdate.toLocaleTimeString()}
      </div>
    </div>
  );
}
