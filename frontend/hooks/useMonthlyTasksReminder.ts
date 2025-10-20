'use client';

import { useQuery } from '@tanstack/react-query';
import { monthlyTasksApi } from '@/lib/api/notifications';
import { useAuth } from '@/components/contexts/AuthContext';

/**
 * Hook to fetch pending monthly notification tasks
 * Used for the reminder modal
 * Only fetches if user has a tenant (has subscribed)
 */
export function useMonthlyTasksReminder() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['monthly-tasks', 'pending'],
    queryFn: () => monthlyTasksApi.pending(),
    // Only fetch if user has a tenant (has subscribed)
    enabled: !!user?.tenant,
    // Check every 5 minutes for pending tasks
    refetchInterval: 5 * 60 * 1000,
    // Check on window focus
    refetchOnWindowFocus: true,
    // Don't show stale data
    staleTime: 1 * 60 * 1000, // 1 minute
  });
}
