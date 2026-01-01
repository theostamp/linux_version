import { useEffect, useRef } from 'react';

/**
 * Custom hook για automatic refresh όταν αλλάζει ο επιλεγμένος μήνας
 * Προσφέρει βελτιωμένο UX με visual feedback και προφυλάσσει από duplicate calls
 */
export const useMonthRefresh = (
  selectedMonth: string | undefined,
  refreshFunction: () => void | Promise<void>,
  componentName: string = 'Component'
) => {
  const previousMonthRef = useRef<string | undefined>(selectedMonth);
  const isInitialMountRef = useRef(true);
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Skip refresh on initial mount
    if (isInitialMountRef.current) {
      isInitialMountRef.current = false;
      previousMonthRef.current = selectedMonth;
      return;
    }

    // Only refresh if month actually changed
    if (previousMonthRef.current !== selectedMonth) {
      console.log(`🔄 ${componentName}: Month changed from ${previousMonthRef.current || 'current'} to ${selectedMonth || 'current'}`);

      // Clear any existing timeout
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }

      // Debounce the refresh to avoid rapid successive calls
      refreshTimeoutRef.current = setTimeout(() => {
        // Show visual notification
        showMonthChangeNotification(selectedMonth, componentName);

        // Execute refresh function
        try {
          const result = refreshFunction();
          if (result instanceof Promise) {
            result.catch(error => {
              console.error(`❌ ${componentName}: Error during month refresh:`, error);
            });
          }
        } catch (error) {
          console.error(`❌ ${componentName}: Error during month refresh:`, error);
        }
      }, 300); // 300ms debounce

      previousMonthRef.current = selectedMonth;
    }
  }, [selectedMonth, refreshFunction, componentName]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, []);
};

/**
 * Εμφανίζει ένα διακριτικό notification για την αλλαγή μήνα
 */
const showMonthChangeNotification = (selectedMonth: string | undefined, componentName: string) => {
  // Only show notification in production if explicitly enabled
  if (process.env.NODE_ENV === 'production' && !process.env.NEXT_PUBLIC_SHOW_MONTH_NOTIFICATIONS) {
    return;
  }

  const formatMonthName = (month: string | undefined) => {
    if (!month) return 'Τρέχων μήνας';
    try {
      return new Date(month + '-01').toLocaleDateString('el-GR', {
        month: 'long',
        year: 'numeric'
      });
    } catch {
      return month;
    }
  };

  const notification = document.createElement('div');
  notification.className = 'fixed top-4 right-4 bg-blue-500 text-white px-3 py-2 rounded-lg shadow-lg z-50 transform transition-all duration-300 translate-x-full text-sm';
  notification.innerHTML = `
    <div class="flex items-center gap-2">
      <div class="w-2 h-2 bg-white rounded-full animate-pulse"></div>
      <span>${componentName}: ${formatMonthName(selectedMonth)}</span>
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

export default useMonthRefresh;
