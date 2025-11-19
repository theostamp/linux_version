'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useState, useEffect } from 'react';
import { setGlobalQueryClient, initializeGlobalRefresh } from '@/lib/globalRefresh';

export function ReactQueryProvider({ children }: { readonly children: React.ReactNode }) {
  const [client] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        // ✅ AGGRESSIVE: Data is stale immediately, but cached for 10min
        // This means: always check for fresh data, but use cache while fetching
        staleTime: 0, // Data is stale immediately (was 30 seconds)
        gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
        
        // ✅ SMART RETRY: Don't retry client errors, retry server errors up to 3 times
        retry: (failureCount: number, error: unknown) => {
          const apiError = error as { status?: number };
          if (apiError?.status && apiError.status >= 400 && apiError.status < 500) {
            return false; // Don't retry 4xx errors
          }
          return failureCount < 3; // Retry 5xx errors up to 3 times
        },
        retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 30000),
        
        // ✅ AUTO-REFRESH: Refetch on window focus, reconnect, and mount
        refetchOnWindowFocus: true, // Refetch when user returns to tab
        refetchOnReconnect: true,   // Refetch when internet reconnects
        refetchOnMount: 'always',    // Always refetch on component mount
        
        // ✅ NETWORK: Only fetch when online
        networkMode: 'online',
      },
      mutations: {
        retry: false, // Don't retry mutations
        networkMode: 'online',
      },
    },
  }));

  // ✅ Register global query client and setup auto-refresh system
  useEffect(() => {
    console.log('[ReactQueryProvider] Setting up global refresh system');
    setGlobalQueryClient(client);
    const cleanup = initializeGlobalRefresh();
    
    return () => {
      console.log('[ReactQueryProvider] Cleaning up global refresh system');
      cleanup();
    };
  }, [client]);

  return (
    <QueryClientProvider client={client}>
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}

