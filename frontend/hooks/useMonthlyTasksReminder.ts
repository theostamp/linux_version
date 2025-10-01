'use client';

import { useQuery } from '@tanstack/react-query';
import { monthlyTasksApi } from '@/lib/api/notifications';

/**
 * Hook to fetch pending monthly notification tasks
 * Used for the reminder modal
 */
export function useMonthlyTasksReminder() {
  return useQuery({
    queryKey: ['monthly-tasks', 'pending'],
    queryFn: () => monthlyTasksApi.pending(),
    // Check every 5 minutes for pending tasks
    refetchInterval: 5 * 60 * 1000,
    // Check on window focus
    refetchOnWindowFocus: true,
    // Don't show stale data
    staleTime: 1 * 60 * 1000, // 1 minute
  });
}
