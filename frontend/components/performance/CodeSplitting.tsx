'use client';

import React, { lazy, Suspense } from 'react';
import dynamic from 'next/dynamic';
import RequestSkeleton from '@/components/RequestSkeleton';

/**
 * Route-based code splitting utilities
 */

// Create a generic skeleton component for loading states
const LoadingSkeleton = ({ className = "h-64 w-full" }: { className?: string }) => (
  <div className={`animate-pulse rounded-md bg-gray-200 ${className}`} />
);

// Lazy load dashboard components
export const DashboardPage = lazy(() => import('@/app/(dashboard)/dashboard/page'));
export const FinancialPage = lazy(() => import('@/app/(dashboard)/financial/page'));
export const MaintenancePage = lazy(() => import('@/app/(dashboard)/maintenance/page'));
export const ProjectsPage = lazy(() => import('@/app/(dashboard)/projects/page'));

// Dynamic imports with loading states - using existing components
export const DynamicFinancialDashboard = dynamic(
  () => import('@/components/financial/FinancialDashboard'),
  {
    loading: () => <LoadingSkeleton className="h-96 w-full" />,
    ssr: false
  }
);

// Placeholder for maintenance components (to be implemented)
export const DynamicMaintenanceTickets = dynamic(
  () => Promise.resolve({ default: () => <div>Maintenance Tickets - To be implemented</div> }),
  {
    loading: () => <LoadingSkeleton className="h-64 w-full" />,
    ssr: true
  }
);

export const DynamicProjectsList = dynamic(
  () => Promise.resolve({ default: () => <div>Projects List - To be implemented</div> }),
  {
    loading: () => <LoadingSkeleton className="h-64 w-full" />,
    ssr: true
  }
);

// Chart components - using placeholders for now
export const DynamicFinancialChart = dynamic(
  () => Promise.resolve({ default: () => <div>Financial Chart - To be implemented</div> }),
  {
    loading: () => <LoadingSkeleton className="h-80 w-full" />,
    ssr: false
  }
);

export const DynamicExpenseChart = dynamic(
  () => Promise.resolve({ default: () => <div>Expense Chart - To be implemented</div> }),
  {
    loading: () => <LoadingSkeleton className="h-80 w-full" />,
    ssr: false
  }
);

export const DynamicMaintenanceChart = dynamic(
  () => Promise.resolve({ default: () => <div>Maintenance Chart - To be implemented</div> }),
  {
    loading: () => <LoadingSkeleton className="h-80 w-full" />,
    ssr: false
  }
);

// Modal components - using existing ones where available
export const DynamicExpenseModal = dynamic(
  () => import('@/components/financial/ExpenseViewModal').then(mod => ({ default: mod.ExpenseViewModal })),
  {
    loading: () => <LoadingSkeleton className="h-96 w-full" />,
    ssr: false
  }
);

export const DynamicPaymentModal = dynamic(
  () => import('@/components/financial/AddPaymentModal').then(mod => ({ default: mod.AddPaymentModal })),
  {
    loading: () => <LoadingSkeleton className="h-96 w-full" />,
    ssr: false
  }
);

export const DynamicMaintenanceModal = dynamic(
  () => Promise.resolve({ default: () => <div>Maintenance Modal - To be implemented</div> }),
  {
    loading: () => <LoadingSkeleton className="h-96 w-full" />,
    ssr: false
  }
);

export const DynamicProjectModal = dynamic(
  () => Promise.resolve({ default: () => <div>Project Modal - To be implemented</div> }),
  {
    loading: () => <LoadingSkeleton className="h-96 w-full" />,
    ssr: false
  }
);

/**
 * Feature-based code splitting
 */

// Higher-order component for lazy loading with error boundary
export function withLazyLoading<T extends Record<string, any>>(
  importFn: () => Promise<{ default: React.ComponentType<T> }>,
  FallbackComponent: React.ComponentType = () => <LoadingSkeleton />
) {
  const LazyComponent = lazy(importFn);
  
  return function LazyWrapper(props: T) {
    return (
      <Suspense fallback={<FallbackComponent />}>
        <LazyComponent {...(props as any)} />
      </Suspense>
    );
  };
}

// Role-based component loading
export function createRoleBasedComponent(
  adminComponent: () => Promise<{ default: React.ComponentType<any> }>,
  managerComponent: () => Promise<{ default: React.ComponentType<any> }>,
  tenantComponent: () => Promise<{ default: React.ComponentType<any> }>
) {
  return function RoleBasedComponent({ userRole, ...props }: { userRole: string }) {
    let componentLoader;
    
    switch (userRole) {
      case 'admin':
        componentLoader = adminComponent;
        break;
      case 'manager':
        componentLoader = managerComponent;
        break;
      case 'tenant':
        componentLoader = tenantComponent;
        break;
      default:
        return <div>Unauthorized</div>;
    }
    
    const Component = lazy(componentLoader);
    
    return (
      <Suspense fallback={<LoadingSkeleton />}>
        <Component {...props} />
      </Suspense>
    );
  };
}

// Conditional loading based on feature flags
export function createConditionalComponent(
  condition: boolean,
  componentLoader: () => Promise<{ default: React.ComponentType<any> }>,
  FallbackComponent?: React.ComponentType
) {
  if (!condition) {
    return FallbackComponent || (() => null);
  }
  
  const Component = lazy(componentLoader);
  
  return function ConditionalComponent(props: any) {
    return (
      <Suspense fallback={<LoadingSkeleton />}>
        <Component {...props} />
      </Suspense>
    );
  };
}

// Feature-based dynamic imports
export const FeatureComponents = {
  Financial: {
    CommonExpenses: dynamic(() => Promise.resolve({ default: () => <div>Common Expenses - To be implemented</div> }), { ssr: false }),
    PaymentTracking: dynamic(() => Promise.resolve({ default: () => <div>Payment Tracking - To be implemented</div> }), { ssr: false }),
    FinancialReports: dynamic(() => Promise.resolve({ default: () => <div>Financial Reports - To be implemented</div> }), { ssr: false })
  },
  Maintenance: {
    TicketManagement: dynamic(() => Promise.resolve({ default: () => <div>Ticket Management - To be implemented</div> }), { ssr: false }),
    WorkOrders: dynamic(() => Promise.resolve({ default: () => <div>Work Orders - To be implemented</div> }), { ssr: false }),
    ScheduledMaintenance: dynamic(() => Promise.resolve({ default: () => <div>Scheduled Maintenance - To be implemented</div> }), { ssr: false })
  },
  Projects: {
    ProjectManagement: dynamic(() => Promise.resolve({ default: () => <div>Project Management - To be implemented</div> }), { ssr: false }),
    RFQManagement: dynamic(() => Promise.resolve({ default: () => <div>RFQ Management - To be implemented</div> }), { ssr: false }),
    OfferTracking: dynamic(() => Promise.resolve({ default: () => <div>Offer Tracking - To be implemented</div> }), { ssr: false })
  }
};

/**
 * Memoized components for performance
 */
export const MemoizedComponents = {
  FinancialDashboard: React.memo(DynamicFinancialDashboard),
  MaintenanceTickets: React.memo(DynamicMaintenanceTickets),
  ProjectsList: React.memo(DynamicProjectsList)
};

/**
 * Preload utilities
 */
export const preloadComponents = {
  financial: () => import('@/components/financial/FinancialDashboard'),
  maintenance: () => Promise.resolve({ default: () => <div>Maintenance - To be implemented</div> }),
  projects: () => Promise.resolve({ default: () => <div>Projects - To be implemented</div> })
};

// Preload function
export function preloadComponent(componentName: keyof typeof preloadComponents) {
  return preloadComponents[componentName]();
}

/**
 * Async component wrapper with error handling
 */
export function createAsyncComponent<T extends Record<string, any>>(
  importFn: () => Promise<{ default: React.ComponentType<T> }>,
  options: {
    fallback?: React.ComponentType;
    onError?: (error: Error) => void;
    retry?: boolean;
  } = {}
) {
  const { fallback = () => <LoadingSkeleton />, onError, retry = true } = options;
  
  return function AsyncComponent(props: T) {
    const [error, setError] = React.useState<Error | null>(null);
    const [retryCount, setRetryCount] = React.useState(0);
    
    const Component = React.useMemo(() => {
      return lazy(async () => {
        try {
          return await importFn();
        } catch (err) {
          const error = err as Error;
          setError(error);
          onError?.(error);
          
          if (retry && retryCount < 3) {
            setRetryCount(prev => prev + 1);
            // Retry after delay
            await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
            return await importFn();
          }
          
          throw error;
        }
      });
    }, [retryCount]);
    
    if (error && (!retry || retryCount >= 3)) {
      return (
        <div className="p-4 border border-red-200 rounded-md bg-red-50">
          <p className="text-red-800">Failed to load component</p>
          {retry && (
            <button 
              onClick={() => {
                setError(null);
                setRetryCount(0);
              }}
              className="mt-2 px-3 py-1 bg-red-600 text-white rounded text-sm"
            >
              Retry
            </button>
          )}
        </div>
      );
    }
    
    const FallbackComponent = fallback;
    return (
      <Suspense fallback={<FallbackComponent />}>
        <Component {...(props as any)} />
      </Suspense>
    );
  };
}

/**
 * Bundle splitting utilities
 */
export const BundleGroups = {
  core: () => import('@/components/financial/FinancialDashboard'),
  charts: () => Promise.resolve({ default: () => <div>Charts Bundle - To be implemented</div> }),
  modals: () => Promise.resolve({ default: () => <div>Modals Bundle - To be implemented</div> }),
  forms: () => Promise.resolve({ default: () => <div>Forms Bundle - To be implemented</div> })
};

// Export utility for measuring bundle sizes
export function measureBundleSize(bundleName: string) {
  if (typeof window !== 'undefined' && 'performance' in window) {
    const entries = performance.getEntriesByType('navigation');
    console.log(`Bundle ${bundleName} performance:`, entries);
  }
}
