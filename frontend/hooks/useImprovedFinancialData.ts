import { useState, useEffect, useCallback, useMemo } from 'react';
import { api } from '@/lib/api';
import { ImprovedFinancialData } from '@/types/improved-financial';

interface UseImprovedFinancialDataProps {
  buildingId: number;
  selectedMonth?: string;
}

interface UseImprovedFinancialDataReturn {
  data: ImprovedFinancialData | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export const useImprovedFinancialData = ({
  buildingId,
  selectedMonth
}: UseImprovedFinancialDataProps): UseImprovedFinancialDataReturn => {
  const [data, setData] = useState<ImprovedFinancialData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      console.log(`🔄 useImprovedFinancialData: Fetching data for building ${buildingId}, month: ${selectedMonth || 'current'}`);
      
      const params = new URLSearchParams({
        building_id: buildingId.toString(),
        ...(selectedMonth && { month: selectedMonth })
      });
      
      const response = await api.get(`/financial/dashboard/improved-summary/?${params}`);
      
      // Transform the response data to match our improved structure
      const transformedData: ImprovedFinancialData = {
        monthly_invoice: {
          previous_month_expenses: {
            operational_expenses: response.data.previous_month_expenses || 0,
            month_name: response.data.previous_month_name || 'Προηγούμενος μήνας'
          },
          current_month_charges: {
            management_fees: response.data.management_fees || 0,
            reserve_fund_contribution: response.data.reserve_fund_contribution || 0,
            month_name: response.data.current_month_name || 'Τρέχων μήνας'
          },
          invoice_total: response.data.invoice_total || 0
        },
        total_obligations: {
          current_invoice: response.data.current_invoice || 0,
          previous_balances: response.data.previous_balances || 0,
          grand_total: response.data.grand_total || 0
        },
        obligation_coverage: {
          current_invoice_coverage: {
            paid: response.data.current_invoice_paid || 0,
            total: response.data.current_invoice_total || 0,
            percentage: response.data.current_invoice_coverage_percentage || 0
          },
          total_obligations_coverage: {
            paid: response.data.total_paid || 0,
            total: response.data.total_obligations || 0,
            percentage: response.data.total_coverage_percentage || 0
          }
        },
        reserve_fund: {
          current_amount: response.data.current_reserve || 0,
          target_amount: response.data.reserve_target || 0,
          monthly_contribution: response.data.reserve_monthly_contribution || 0,
          progress_percentage: response.data.reserve_progress_percentage || 0
        },
        apartment_count: response.data.apartment_count || 0,
        has_monthly_activity: response.data.has_monthly_activity || false
      };
      
      setData(transformedData);
      console.log(`✅ useImprovedFinancialData: Data loaded successfully`);
    } catch (error) {
      console.error('Error fetching improved financial data:', error);
      setError('Σφάλμα κατά τη φόρτωση των οικονομικών στοιχείων');
    } finally {
      setIsLoading(false);
    }
  }, [buildingId, selectedMonth]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    data,
    isLoading,
    error,
    refetch: fetchData
  };
};
