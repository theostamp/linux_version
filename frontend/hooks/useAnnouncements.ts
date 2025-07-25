// frontend/hooks/useAnnouncements.ts

import { useQuery } from '@tanstack/react-query';
import { fetchAnnouncements } from '@/lib/api';
import { useAuth } from '@/components/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';

export function useAnnouncements(buildingId?: number | null) {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [hasShownAuthError, setHasShownAuthError] = useState(false);
  
  // Check authentication status
  useEffect(() => {
    if (!authLoading && !isAuthenticated && !hasShownAuthError) {
      console.log('[useAnnouncements] User not authenticated, redirecting to login');
      toast.error('Παρακαλώ συνδεθείτε για να δείτε τις ανακοινώσεις');
      setHasShownAuthError(true);
      
      // Μικρή καθυστέρηση για να προλάβει να εμφανιστεί το toast
      setTimeout(() => {
        router.push('/login');
      }, 1000);
    }
  }, [isAuthenticated, authLoading, router, hasShownAuthError]);

  return useQuery({
    queryKey: ['announcements', buildingId],
    queryFn: async () => {
      try {
        return await fetchAnnouncements(buildingId);
      } catch (error: any) {
        console.error('[useAnnouncements] Error fetching announcements:', error);
        
        // Handle authentication errors
        if (error?.response?.status === 401 && !hasShownAuthError) {
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
    retry: (failureCount, error: any) => {
      // Don't retry on authentication errors
      if (error?.response?.status === 401) return false;
      return failureCount < 2; // Μειώνουμε τις προσπάθειες από 3 σε 2
    },
    staleTime: 30000, // 30 seconds
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });
}
