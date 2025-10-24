'use client';

import React, { Suspense, lazy, ComponentType } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

interface LazyLoadWrapperProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  className?: string;
}

/**
 * Wrapper component for lazy loading with intersection observer
 */
export const LazyLoadWrapper: React.FC<LazyLoadWrapperProps> = ({
  children,
  fallback,
  className = ''
}) => {
  const defaultFallback = (
    <div className={`animate-pulse ${className}`}>
      <Skeleton className="h-32 w-full" />
    </div>
  );

  return (
    <Suspense fallback={fallback || defaultFallback}>
      {children}
    </Suspense>
  );
};

/**
 * Higher-order component for lazy loading
 */
export function withLazyLoading<P extends object>(
  Component: ComponentType<P>,
  fallback?: React.ReactNode
) {
  const LazyComponent = lazy(() => Promise.resolve({ default: Component }));
  
  const WrappedComponent = (props: P) => (
    <LazyLoadWrapper fallback={fallback}>
      <LazyComponent {...props} />
    </LazyLoadWrapper>
  );
  
  WrappedComponent.displayName = `LazyLoadWrapper(${Component.displayName || Component.name || 'Component'})`;
  
  return WrappedComponent;
}

/**
 * Intersection Observer based lazy loading
 */
export const IntersectionLazyLoad: React.FC<{
  children: React.ReactNode;
  threshold?: number;
  rootMargin?: string;
  className?: string;
}> = ({ 
  children, 
  threshold = 0.1, 
  rootMargin = '50px',
  className = ''
}) => {
  const [isIntersecting, setIsIntersecting] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsIntersecting(true);
          observer.disconnect();
        }
      },
      { threshold, rootMargin }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, [threshold, rootMargin]);

  return (
    <div ref={ref} className={className}>
      {isIntersecting ? children : <Skeleton className="h-32 w-full" />}
    </div>
  );
};

export default LazyLoadWrapper;
