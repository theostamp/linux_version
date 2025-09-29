import { useEffect, useRef, useCallback } from 'react';

/**
 * Custom hook για automatic refresh του financial dashboard
 * όταν γίνονται αλλαγές στις δαπάνες ή τις εισπράξεις
 */
export const useFinancialAutoRefresh = (
  refreshFunctions: {
    loadSummary?: () => void | Promise<void>;
    loadExpenses?: () => void | Promise<void>;
    loadPayments?: () => void | Promise<void>;
    loadApartmentBalances?: () => void | Promise<void>;
    loadObligations?: () => void | Promise<void>;
  },
  dependencies: {
    buildingId?: number;
    selectedMonth?: string;
  } = {},
  options: {
    enableAutoRefresh?: boolean;
    refreshInterval?: number;
    componentName?: string;
  } = {}
) => {
  const {
    enableAutoRefresh = true,
    refreshInterval = 5000, // 5 seconds
    componentName = 'FinancialAutoRefresh'
  } = options;

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastRefreshRef = useRef<number>(Date.now());
  const isRefreshingRef = useRef<boolean>(false);

  // Function to execute all refresh functions
  const executeRefresh = useCallback(async () => {
    if (isRefreshingRef.current) {
      console.log(`🔄 ${componentName}: Refresh already in progress, skipping...`);
      return;
    }

    try {
      isRefreshingRef.current = true;
      console.log(`🔄 ${componentName}: Executing automatic refresh...`);

      const refreshPromises: Promise<void>[] = [];

      // Execute all provided refresh functions
      if (refreshFunctions.loadSummary) {
        const result = refreshFunctions.loadSummary();
        if (result instanceof Promise) {
          refreshPromises.push(result);
        }
      }

      if (refreshFunctions.loadExpenses) {
        const result = refreshFunctions.loadExpenses();
        if (result instanceof Promise) {
          refreshPromises.push(result);
        }
      }

      if (refreshFunctions.loadPayments) {
        const result = refreshFunctions.loadPayments();
        if (result instanceof Promise) {
          refreshPromises.push(result);
        }
      }

      if (refreshFunctions.loadApartmentBalances) {
        const result = refreshFunctions.loadApartmentBalances();
        if (result instanceof Promise) {
          refreshPromises.push(result);
        }
      }

      if (refreshFunctions.loadObligations) {
        const result = refreshFunctions.loadObligations();
        if (result instanceof Promise) {
          refreshPromises.push(result);
        }
      }

      // Wait for all refresh operations to complete
      if (refreshPromises.length > 0) {
        await Promise.allSettled(refreshPromises);
      }

      lastRefreshRef.current = Date.now();
      console.log(`✅ ${componentName}: Automatic refresh completed successfully`);
      
      // Αφαιρέθηκε το success notification
      // showRefreshNotification('success', componentName);

    } catch (error) {
      console.error(`❌ ${componentName}: Error during automatic refresh:`, error);
      // Αφαιρέθηκε το error notification
      // showRefreshNotification('error', componentName);
    } finally {
      isRefreshingRef.current = false;
    }
  }, [refreshFunctions, componentName]);

  // Manual refresh function
  const manualRefresh = useCallback(async () => {
    console.log(`🔄 ${componentName}: Manual refresh triggered`);
    await executeRefresh();
  }, [executeRefresh, componentName]);

  // Start automatic refresh interval
  useEffect(() => {
    if (!enableAutoRefresh || !dependencies.buildingId) {
      return;
    }

    console.log(`🔄 ${componentName}: Starting automatic refresh interval (${refreshInterval}ms)`);

    intervalRef.current = setInterval(() => {
      const timeSinceLastRefresh = Date.now() - lastRefreshRef.current;
      
      // Only refresh if enough time has passed since last refresh
      if (timeSinceLastRefresh >= refreshInterval) {
        executeRefresh();
      }
    }, refreshInterval);

    // Initial refresh
    executeRefresh();

    return () => {
      if (intervalRef.current) {
        console.log(`🔄 ${componentName}: Stopping automatic refresh interval`);
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [enableAutoRefresh, dependencies.buildingId, refreshInterval, executeRefresh, componentName]);

  // Refresh when dependencies change
  useEffect(() => {
    if (dependencies.buildingId || dependencies.selectedMonth) {
      console.log(`🔄 ${componentName}: Dependencies changed, triggering refresh`);
      executeRefresh();
    }
  }, [dependencies.buildingId, dependencies.selectedMonth, executeRefresh, componentName]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return {
    manualRefresh,
    isRefreshing: isRefreshingRef.current,
    lastRefresh: lastRefreshRef.current
  };
};

/**
 * Εμφανίζει notification για το refresh status
 */
const showRefreshNotification = (type: 'success' | 'error', componentName: string) => {
  // Only show notifications in development or if explicitly enabled
  if (process.env.NODE_ENV === 'production' && !process.env.NEXT_PUBLIC_SHOW_REFRESH_NOTIFICATIONS) {
    return;
  }

  const notification = document.createElement('div');
  const bgColor = type === 'success' ? 'bg-green-500' : 'bg-red-500';
  const icon = type === 'success' ? '✅' : '❌';
  const message = type === 'success' ? 'Ενημερώθηκε' : 'Σφάλμα ενημέρωσης';

  notification.className = `fixed top-4 right-4 ${bgColor} text-white px-3 py-2 rounded-lg shadow-lg z-50 transform transition-all duration-300 translate-x-full text-sm`;
  notification.innerHTML = `
    <div class="flex items-center gap-2">
      <span>${icon}</span>
      <span>${componentName}: ${message}</span>
    </div>
  `;
  
  document.body.appendChild(notification);
  
  // Animate in
  requestAnimationFrame(() => {
    notification.classList.remove('translate-x-full');
  });
  
  // Remove after 2 seconds
  setTimeout(() => {
    notification.classList.add('translate-x-full');
    setTimeout(() => {
      if (document.body.contains(notification)) {
        document.body.removeChild(notification);
      }
    }, 300);
  }, 2000);
};

export default useFinancialAutoRefresh;
