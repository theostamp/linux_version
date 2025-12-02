/**
 * useOfficeDashboard Hook
 * 
 * Fetches aggregated data for the Office Dashboard (Command Center)
 * Provides a unified view across ALL buildings for management offices.
 */

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

// Types
export interface PortfolioOverview {
  total_buildings: number;
  total_apartments: number;
  total_balance: number;
  total_obligations: number;
  total_reserve: number;
  payments_this_month: number;
  expenses_this_month: number;
  collection_rate: number;
  period: {
    month: number;
    year: number;
  };
}

export interface BuildingStatus {
  id: number;
  name: string;
  address: string;
  apartments_count: number;
  total_balance: number;
  total_obligations: number;
  reserve_fund: number;
  collection_rate: number;
  status: 'critical' | 'warning' | 'healthy';
}

export interface Debtor {
  apartment_id: number;
  apartment_number: string;
  building_name: string;
  building_id: number;
  owner_name: string;
  balance: number;
  last_payment_date: string | null;
  days_overdue: number;
}

export interface PendingTask {
  id: number;
  title: string;
  building_name: string;
  building_id: number | null;
  status: string;
  priority: string;
  created_at: string | null;
  days_pending: number;
}

export interface CashFlowEntry {
  month: string;
  income: number;
  expenses: number;
  net: number;
}

export interface Alert {
  type: 'critical' | 'warning' | 'info';
  category: string;
  message: string;
  action_url: string | null;
}

export interface OfficeDashboardData {
  overview: PortfolioOverview;
  buildings: BuildingStatus[];
  top_debtors: Debtor[];
  pending_tasks: PendingTask[];
  cash_flow: CashFlowEntry[];
  alerts: Alert[];
  generated_at: string;
}

/**
 * Fetch full office dashboard data
 */
async function fetchOfficeDashboard(): Promise<OfficeDashboardData> {
  try {
    const response = await api.get('/office-analytics/dashboard/');
    return response;
  } catch (error) {
    console.error('Error fetching office dashboard:', error);
    throw error;
  }
}

/**
 * Hook to get office dashboard data
 */
export function useOfficeDashboard() {
  const query = useQuery({
    queryKey: ['office-dashboard'],
    queryFn: fetchOfficeDashboard,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
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

export default useOfficeDashboard;

