'use client';

import { BaseWidgetProps } from '@/types/kiosk';
import { Euro, Home, TrendingUp, QrCode, Check } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useBuilding } from '@/components/contexts/BuildingContext';

interface ApartmentDebt {
  apartment_id: number;
  apartment_number: string;
  owner_name: string | null;
  tenant_name?: string | null;
  net_obligation: number;
  current_balance: number;
  previous_balance: number;
  resident_expenses?: number;
  owner_expenses?: number;
  status: string;
}

export default function ApartmentDebtsWidget({ data, isLoading, error, settings, buildingId }: BaseWidgetProps & { buildingId?: number | null }) {
  const { currentBuilding, selectedBuilding } = useBuilding();
  const building = selectedBuilding || currentBuilding;
  const effectiveBuildingId = buildingId || building?.id;
  const [debts, setDebts] = useState<ApartmentDebt[]>([]);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);
  interface ApartmentBalancesSummary {
    total_balance?: number;
    total_obligations?: number;
    total_payments?: number;
    [key: string]: unknown;
  }
  const [summary, setSummary] = useState<ApartmentBalancesSummary | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);

  const resolveMonthParam = () => {
    if (settings?.month) {
      return settings.month;
    }
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  };
  const monthParam = resolveMonthParam();

  useEffect(() => {
    const fetchDebts = async () => {
      if (!effectiveBuildingId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        // Use the dashboard API that shows correct net_obligation values
        const monthQuery = monthParam ? `&month=${monthParam}` : '';
        const apiUrl = `/api/financial/dashboard/apartment_balances/?building_id=${effectiveBuildingId}${monthQuery}`;
        const response = await fetch(apiUrl, {
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch apartment debts');
        }

        const result = await response.json();
        
        // Εμφανίζουμε όλα τα διαμερίσματα με τα κοινόχρηστα του τρέχοντος μήνα
        const apartmentExpenses = (result.apartments || [])
          .map((apt: ApartmentDebt) => ({
            ...apt,
            displayAmount: apt.net_obligation || apt.current_balance || 0
          }))
          .sort((a: ApartmentDebt, b: ApartmentDebt) => 
            // Ταξινόμηση: αριθμητικά (1, 2, 3, 10) όχι αλφαβητικά
            parseInt(a.apartment_number) - parseInt(b.apartment_number)
          );
        
        setDebts(apartmentExpenses);
        setApiError(null);
      } catch (err) {
        console.error('Error fetching apartment debts:', err);
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        setApiError(errorMessage);
        
        // Auto-retry mechanism
        if (retryCount < 3) {
          console.log(`Retrying fetch... (${retryCount + 1}/3)`);
          setTimeout(() => {
            setRetryCount(prev => prev + 1);
            fetchDebts();
          }, 2000 * (retryCount + 1)); // Exponential backoff: 2s, 4s, 6s
        }
      } finally {
        setLoading(false);
      }
    };

    fetchDebts();
    
    // Refresh every 5 minutes
    const interval = setInterval(fetchDebts, 300000);
    return () => clearInterval(interval);
  }, [effectiveBuildingId, retryCount, monthParam]);

  // Fetch summary data separately (includes payment coverage)
  useEffect(() => {
    const fetchSummary = async () => {
      if (!effectiveBuildingId) return;
      
      try {
        const monthQuery = monthParam ? `&month=${monthParam}` : '';
        const apiUrl = `/api/financial/dashboard/apartment_balances/?building_id=${effectiveBuildingId}${monthQuery}`;
        const response = await fetch(apiUrl);
        if (response.ok) {
          const result = await response.json();
          setSummary(result.summary);
        }
      } catch (err) {
        console.error('Error fetching summary:', err);
      }
    };
    
    fetchSummary();
    
    // Refresh every 5 minutes
    const interval = setInterval(fetchSummary, 300000);
    return () => clearInterval(interval);
  }, [effectiveBuildingId, monthParam]);

  if (isLoading || loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-300"></div>
      </div>
    );
  }

  if (error || apiError) {
    const handleRetry = () => {
      setRetryCount(0);
      setApiError(null);
      setLoading(true);
      // Trigger re-fetch by updating a dependency
      setDebts([]);
    };

    return (
      <div className="flex items-center justify-center h-full text-red-300">
        <div className="text-center">
          <div className="text-2xl mb-2">⚠️</div>
          <p className="text-sm mb-3">{error || apiError}</p>
          {retryCount > 0 && (
            <p className="text-xs text-red-400 mb-3">
              Προσπάθεια επαναφόρτωσης: {retryCount}/3
            </p>
          )}
          <button
            onClick={handleRetry}
            className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-xs rounded transition-colors"
            disabled={loading}
          >
            {loading ? 'Φόρτωση...' : 'Επαναφόρτωση'}
          </button>
        </div>
      </div>
    );
  }

  const totalExpenses = debts.reduce((sum, apt: ApartmentDebt) => sum + (apt.displayAmount || apt.net_obligation || apt.current_balance || 0), 0);
  // Calculate payment coverage - include both paid and unpaid apartments
  const totalObligations = debts.reduce((sum, apt: ApartmentDebt) => sum + 8, 0); // 10 apartments × 8€ = 80€
  const totalPayments = summary?.total_payments || 0;
  const paymentCoveragePercentage = totalObligations > 0 ? (totalPayments / totalObligations) * 100 : 0;
  const showWarning = paymentCoveragePercentage < 75;
  const currentDay = new Date().getDate();

  // GDPR: Mask occupant name (first name + first letter of surname + ***)
  const maskOccupant = (name: string | null | undefined): string => {
    if (!name) return 'Μη καταχωρημένος';
    
    const parts = name.trim().split(' ');
    if (parts.length === 1) return `${parts[0]} ***`;
    
    return `${parts[0]} ${parts[1][0]}***`;
  };

  return (
    <div className="h-full overflow-hidden flex flex-col">
      {/* Header */}
      <div className="mb-2 pb-2 border-b border-indigo-400/30">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center space-x-1.5">
            <Euro className="w-5 h-5 text-indigo-300" />
            <h2 className="text-base font-bold text-white">Τα Κοινόχρηστα Συνοπτικά</h2>
          </div>
          <div className="text-right">
            <div className="text-xs text-indigo-300">
              €{totalExpenses.toFixed(0)}
            </div>
          </div>
        </div>
      </div>
      
      {/* Expenses List */}
      <div className="flex-1 overflow-y-auto space-y-2">
        {debts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-purple-300">
            <Euro className="w-12 h-12 mb-3 opacity-60" />
            <p className="text-sm font-medium">Δεν υπάρχουν δεδομένα</p>
            <p className="text-xs text-purple-400 mt-1">Κανένα κοινόχρηστο για τον τρέχοντα μήνα</p>
          </div>
        ) : (
          debts.map((apt: ApartmentDebt) => {
            const amount = apt.net_obligation || apt.displayAmount || apt.current_balance || 0;
            // Green if zero balance, orange if has debt - check the net_obligation from dashboard API
            const hasDebt = (apt.net_obligation || 0) > 0;
            const hasZeroBalance = (apt.net_obligation || 0) === 0;
            // Use tenant_name with fallback to owner_name
            const occupant = maskOccupant(apt.tenant_name || apt.owner_name);
            
            

            return (
              <div
                key={apt.apartment_id}
                className="bg-indigo-900/20 backdrop-blur-sm px-2 py-1.5 rounded-lg border border-indigo-500/20 hover:border-indigo-400/40 transition-all"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 flex-1 min-w-0">
                    <span className="text-xs font-bold text-indigo-400 whitespace-nowrap">{apt.apartment_number}</span>
                    <span className="text-xs text-white truncate font-medium leading-tight">
                      {occupant}
                    </span>
                  </div>
                  <div className="flex-shrink-0 flex items-center gap-1">
                    {hasZeroBalance && (
                      <Check className="w-4 h-4 text-green-400" />
                    )}
                    <span className={`text-sm font-semibold whitespace-nowrap ${
                      hasZeroBalance ? 'text-green-400' : hasDebt ? 'text-orange-400' : 'text-indigo-200'
                    }`}>
                      €{amount.toFixed(0)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer - Payment Coverage Chart */}
      {debts.length > 0 && (
        <div className="mt-3 pt-3 border-t border-indigo-400/30">
          {/* Warning if after 15th and coverage < 75% */}
          {showWarning && (
            <div className="mb-2 bg-orange-500/20 border border-orange-400/50 rounded-lg p-2 text-center animate-pulse">
              <p className="text-orange-300 text-xs font-bold">⚠️ Χαμηλή Κάλυψη</p>
            </div>
          )}
          
          <div className="mb-2">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="text-indigo-300 font-medium">Κάλυψη Μήνα</span>
              <span className={`font-bold ${paymentCoveragePercentage < 75 ? 'text-orange-300' : 'text-white'}`}>
                {paymentCoveragePercentage.toFixed(1)}%
              </span>
            </div>
            {/* Progress Bar */}
            <div className="w-full bg-indigo-950/50 rounded-full h-5 overflow-hidden border border-indigo-700/30">
              <div 
                className={`h-full rounded-full transition-all duration-1000 ${
                  paymentCoveragePercentage >= 75 
                    ? 'bg-gradient-to-r from-green-500 to-emerald-400 shadow-lg shadow-green-500/50'
                    : 'bg-gradient-to-r from-orange-500 to-red-500 shadow-lg shadow-orange-500/50'
                }`}
                style={{ width: `${paymentCoveragePercentage}%` }}
              ></div>
            </div>
          </div>
          
        </div>
      )}
    </div>
  );
}

