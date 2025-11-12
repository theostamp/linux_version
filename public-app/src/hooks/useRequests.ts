'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchRequests } from '@/lib/api';
import type { UserRequest } from '@/types/userRequests';
import { useAuth } from '@/components/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

export function useRequests(buildingId?: number | null) {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [hasShownAuthError, setHasShownAuthError] = useState(false);
  
  // Check authentication status
  useEffect(() => {
    if (!authLoading && !isAuthenticated && !hasShownAuthError) {
      console.log('[useRequests] User not authenticated, redirecting to login');
      toast.error('Παρακαλώ συνδεθείτε για να δείτε τα αιτήματα');
      setHasShownAuthError(true);
      
      // Μικρή καθυστέρηση για να προλάβει να εμφανιστεί το toast
      setTimeout(() => {
        router.push('/login');
      }, 1000);
    }
  }, [isAuthenticated, authLoading, router, hasShownAuthError]);

  return useQuery<UserRequest[]>({
    queryKey: ['requests', buildingId],
    queryFn: async () => {
      try {
        return await fetchRequests({ buildingId });
      } catch (error: unknown) {
        console.error('[useRequests] Error fetching requests:', error);
        
        const err = error as { status?: number; response?: { status?: number } };
        // Handle authentication errors
        if ((err?.status === 401 || err?.response?.status === 401) && !hasShownAuthError) {
          toast.error('Η συνεδρία σας έληξε. Παρακαλώ συνδεθείτε ξανά.');
          setHasShownAuthError(true);
          
          // Μικρή καθυστέρηση για να προλάβει να εμφανιστεί το toast
          setTimeout(() => {
            router.push('/login');
          }, 1000);
        }
        
        throw error;
      }
    },
    enabled: isAuthenticated && buildingId !== undefined && !authLoading,
    retry: (failureCount, error: unknown) => {
      const err = error as { status?: number; response?: { status?: number } };
      // Don't retry on authentication errors
      if (err?.status === 401 || err?.response?.status === 401) return false;
      return failureCount < 2;
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchInterval: false,
  });
}

