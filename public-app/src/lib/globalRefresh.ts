/**
 * Global Refresh System
 * 
 * Provides centralized control for refreshing all data across the app.
 * Use this to trigger refreshes after mutations, window focus, or manual user actions.
 */

import { QueryClient } from '@tanstack/react-query';

// Singleton QueryClient instance (will be set by ReactQueryProvider)
let globalQueryClient: QueryClient | null = null;

export function setGlobalQueryClient(client: QueryClient) {
  globalQueryClient = client;
  console.log('[Global Refresh] Query client registered');
}

export function getGlobalQueryClient(): QueryClient | null {
  return globalQueryClient;
}

/**
 * Refresh all financial data (expenses, payments, balances)
 */
export async function refreshFinancialData() {
  if (!globalQueryClient) {
    console.warn('[Global Refresh] QueryClient not initialized');
    return;
  }

  console.log('[Global Refresh] Refreshing financial data...');
  
  await Promise.all([
    globalQueryClient.invalidateQueries({ queryKey: ['financial'] }),
    globalQueryClient.invalidateQueries({ queryKey: ['expenses'] }),
    globalQueryClient.invalidateQueries({ queryKey: ['payments'] }),
    globalQueryClient.invalidateQueries({ queryKey: ['apartment-balances'] }),
    globalQueryClient.invalidateQueries({ queryKey: ['transactions'] }),
  ]);

  await Promise.all([
    globalQueryClient.refetchQueries({ queryKey: ['financial'] }),
    globalQueryClient.refetchQueries({ queryKey: ['expenses'] }),
    globalQueryClient.refetchQueries({ queryKey: ['payments'] }),
    globalQueryClient.refetchQueries({ queryKey: ['apartment-balances'] }),
    globalQueryClient.refetchQueries({ queryKey: ['transactions'] }),
  ]);

  console.log('[Global Refresh] Financial data refreshed');
}

/**
 * Refresh all building-related data
 */
export async function refreshBuildingData() {
  if (!globalQueryClient) {
    console.warn('[Global Refresh] QueryClient not initialized');
    return;
  }

  console.log('[Global Refresh] Refreshing building data...');
  
  await globalQueryClient.invalidateQueries({ queryKey: ['buildings'] });
  await globalQueryClient.invalidateQueries({ queryKey: ['apartments'] });
  await globalQueryClient.refetchQueries({ queryKey: ['buildings'] });
  await globalQueryClient.refetchQueries({ queryKey: ['apartments'] });

  console.log('[Global Refresh] Building data refreshed');
}

/**
 * Refresh ALL data in the application
 */
export async function refreshAllData() {
  if (!globalQueryClient) {
    console.warn('[Global Refresh] QueryClient not initialized');
    return;
  }

  console.log('[Global Refresh] Refreshing ALL data...');
  
  // Invalidate everything
  await globalQueryClient.invalidateQueries();
  
  // Refetch all active queries
  await globalQueryClient.refetchQueries({ type: 'active' });

  console.log('[Global Refresh] ALL data refreshed');
}

/**
 * Setup automatic refresh on visibility change
 * Refreshes data when user returns to tab after being away
 */
export function setupVisibilityRefresh() {
  if (typeof window === 'undefined') return;

  let wasHidden = false;
  let hiddenTime = 0;

  const handleVisibilityChange = async () => {
    if (document.hidden) {
      wasHidden = true;
      hiddenTime = Date.now();
      console.log('[Global Refresh] Tab hidden');
    } else if (wasHidden) {
      const timeAway = Date.now() - hiddenTime;
      console.log(`[Global Refresh] Tab visible again after ${Math.round(timeAway / 1000)}s`);
      
      // If user was away for more than 30 seconds, refresh all data
      if (timeAway > 30000) {
        console.log('[Global Refresh] Long absence detected, refreshing all data');
        await refreshAllData();
      } else {
        // Short absence, just refresh financial data (most likely to change)
        await refreshFinancialData();
      }
      
      wasHidden = false;
    }
  };

  document.addEventListener('visibilitychange', handleVisibilityChange);
  
  return () => {
    document.removeEventListener('visibilitychange', handleVisibilityChange);
  };
}

/**
 * Setup automatic refresh on network reconnect
 * Refreshes data when internet connection is restored
 */
export function setupNetworkRefresh() {
  if (typeof window === 'undefined') return;

  const handleOnline = async () => {
    console.log('[Global Refresh] Network connection restored, refreshing data');
    await refreshAllData();
  };

  window.addEventListener('online', handleOnline);
  
  return () => {
    window.removeEventListener('online', handleOnline);
  };
}

/**
 * Setup custom refresh event listener
 * Other components can dispatch 'app:refresh' event to trigger refresh
 */
export function setupCustomRefreshEvent() {
  if (typeof window === 'undefined') return;

  const handleCustomRefresh = async (event: Event) => {
    const customEvent = event as CustomEvent<{ scope?: 'all' | 'financial' | 'buildings' }>;
    const scope = customEvent.detail?.scope || 'all';
    
    console.log(`[Global Refresh] Custom refresh triggered (scope: ${scope})`);
    
    switch (scope) {
      case 'financial':
        await refreshFinancialData();
        break;
      case 'buildings':
        await refreshBuildingData();
        break;
      case 'all':
      default:
        await refreshAllData();
        break;
    }
  };

  window.addEventListener('app:refresh', handleCustomRefresh);
  
  return () => {
    window.removeEventListener('app:refresh', handleCustomRefresh);
  };
}

/**
 * Initialize all global refresh mechanisms
 * Call this once in your app's root
 */
export function initializeGlobalRefresh() {
  console.log('[Global Refresh] Initializing global refresh system');
  
  const cleanupFns = [
    setupVisibilityRefresh(),
    setupNetworkRefresh(),
    setupCustomRefreshEvent(),
  ].filter(Boolean) as (() => void)[];

  // Return cleanup function
  return () => {
    console.log('[Global Refresh] Cleaning up global refresh system');
    cleanupFns.forEach(cleanup => cleanup());
  };
}

/**
 * Trigger a custom refresh event
 * Use this from anywhere in your app to trigger a refresh
 */
export function triggerRefresh(scope: 'all' | 'financial' | 'buildings' = 'all') {
  if (typeof window === 'undefined') return;
  
  window.dispatchEvent(new CustomEvent('app:refresh', { detail: { scope } }));
}

