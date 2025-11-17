/**
 * useDashboardData Hook
 * 
 * Centralized data fetching for the main dashboard
 * Aggregates data from multiple sources for a unified overview
 */

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface DashboardOverview {
  buildings_count: number;
  apartments_count: number;
  total_balance: number;
  pending_obligations: number;
  pending_expenses: number;
  announcements_count: number;
  votes_count: number;
  requests_count: number;
  urgent_items: number;
  financial_summary: {
    total_reserve: number;
    total_pending_expenses: number;
    total_pending_obligations: number;
    collection_rate: number;
  } | null;
  recent_activity: Array<{
    type: 'announcement' | 'vote';
    id: number;
    title: string;
    date: string;
    is_urgent: boolean;
    building_id: number;
  }>;
  buildings: Array<{
    id: number;
    name: string;
    address: string;
    apartments_count: number;
    balance: number;
    pending_obligations: number;
    health_score: number;
  }>;
}

/**
 * Fetch dashboard overview data
 */
async function fetchDashboardOverview(): Promise<DashboardOverview> {
  try {
    const response = await api.get('/financial/dashboard/overview/');
    return response;
  } catch (error) {
    console.error('Error fetching dashboard overview:', error);
    throw error;
  }
}

/**
 * Hook to get dashboard overview data
 */
export function useDashboardData() {
  const query = useQuery({
    queryKey: ['dashboard', 'overview'],
    queryFn: fetchDashboardOverview,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
    retry: 2,
    refetchOnWindowFocus: true,
  });

  return {
    data: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}

export default useDashboardData;

