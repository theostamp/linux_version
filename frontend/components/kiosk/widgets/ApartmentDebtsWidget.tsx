'use client';

import { BaseWidgetProps } from '@/types/kiosk';
import { Euro, Home, TrendingUp } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useBuilding } from '@/components/contexts/BuildingContext';

interface ApartmentDebt {
  apartment_id: number;
  apartment_number: string;
  owner_name: string;
  net_obligation: number;
  current_balance: number;
  previous_balance: number;
  status: string;
}

export default function ApartmentDebtsWidget({ data, isLoading, error, settings, buildingId }: BaseWidgetProps & { buildingId?: number | null }) {
  const { currentBuilding, selectedBuilding } = useBuilding();
  const building = selectedBuilding || currentBuilding;
  const effectiveBuildingId = buildingId || building?.id;
  const [debts, setDebts] = useState<ApartmentDebt[]>([]);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDebts = async () => {
      if (!effectiveBuildingId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        // Use relative URL for kiosk context
        const apiUrl = `/api/financial/dashboard/apartment_balances/?building_id=${effectiveBuildingId}`;
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
          .sort((a: any, b: any) => 
            // Ταξινόμηση: αριθμητικά (1, 2, 3, 10) όχι αλφαβητικά
            parseInt(a.apartment_number) - parseInt(b.apartment_number)
          );
        
        setDebts(apartmentExpenses);
        setApiError(null);
      } catch (err) {
        console.error('Error fetching apartment debts:', err);
        setApiError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchDebts();
    
    // Refresh every 5 minutes
    const interval = setInterval(fetchDebts, 300000);
    return () => clearInterval(interval);
  }, [effectiveBuildingId]);

  if (isLoading || loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-300"></div>
      </div>
    );
  }

  if (error || apiError) {
    return (
      <div className="flex items-center justify-center h-full text-red-300">
        <div className="text-center">
          <div className="text-2xl mb-2">⚠️</div>
          <p className="text-sm">{error || apiError}</p>
        </div>
      </div>
    );
  }

  const totalExpenses = debts.reduce((sum, apt: any) => sum + (apt.displayAmount || apt.net_obligation || apt.current_balance), 0);

  // Calculate payment coverage percentage (mock for now)
  const paymentCoveragePercentage = 75; // TODO: Get from API

  return (
    <div className="h-full overflow-hidden flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-2 pb-2 border-b border-indigo-400/30">
        <div className="flex items-center space-x-1.5">
          <Euro className="w-5 h-5 text-indigo-300" />
          <h2 className="text-base font-bold text-white">Κοινόχρηστα</h2>
        </div>
        <div className="text-right">
          <div className="text-xs text-indigo-300">
            €{totalExpenses.toFixed(0)}
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
          debts.map((apt: any) => {
            const amount = apt.displayAmount || apt.net_obligation || apt.current_balance;

            return (
              <div
                key={apt.apartment_id}
                className="flex items-center justify-between py-1.5 px-2 hover:bg-indigo-800/20 rounded transition-all"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-white truncate font-medium">
                    {apt.owner_name || 'Μη καταχωρημένος'}
                  </p>
                </div>
                <div className="text-right ml-2 flex-shrink-0">
                  <div className="text-sm font-semibold text-indigo-200">
                    €{amount.toFixed(0)}
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
          <div className="mb-2">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="text-indigo-300 font-medium">Κάλυψη Μήνα</span>
              <span className="text-white font-bold">{paymentCoveragePercentage}%</span>
            </div>
            {/* Progress Bar */}
            <div className="w-full bg-indigo-950/50 rounded-full h-3 overflow-hidden border border-indigo-700/30">
              <div 
                className="h-full bg-gradient-to-r from-green-500 to-emerald-400 rounded-full transition-all duration-1000 shadow-lg shadow-green-500/50"
                style={{ width: `${paymentCoveragePercentage}%` }}
              ></div>
            </div>
          </div>
          
          {/* Stats */}
          <div className="grid grid-cols-2 gap-1.5 text-xs mt-2">
            <div className="bg-indigo-900/30 p-1.5 rounded text-center">
              <div className="text-indigo-300 font-bold">{debts.length}</div>
              <div className="text-indigo-400 text-[10px]">Διαμερίσματα</div>
            </div>
            <div className="bg-indigo-900/30 p-1.5 rounded text-center">
              <div className="text-indigo-300 font-bold">
                €{(totalExpenses / debts.length).toFixed(0)}
              </div>
              <div className="text-indigo-400 text-[10px]">Μέσος Όρος</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


