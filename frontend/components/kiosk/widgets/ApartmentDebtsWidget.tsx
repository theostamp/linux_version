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

  return (
    <div className="h-full overflow-hidden flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-purple-500/20">
        <div className="flex items-center space-x-2">
          <Euro className="w-6 h-6 text-purple-300" />
          <h2 className="text-lg font-bold text-white">Τα Κοινόχρηστα Συνοπτικά</h2>
        </div>
        <div className="text-right">
          <div className="text-xs text-purple-200">Σύνολο Μήνα</div>
          <div className="text-lg font-bold text-purple-300">
            €{totalExpenses.toFixed(2)}
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
            
            // Ενιαίος χρωματισμός σύμφωνα με την παλέτα της σκηνής (purple/indigo)
            const bgColor = 'from-purple-900/30 to-indigo-900/30';
            const borderColor = 'border-purple-500/20';

            return (
              <div
                key={apt.apartment_id}
                className={`bg-gradient-to-br ${bgColor} backdrop-blur-sm p-3 rounded-lg border ${borderColor} transition-all hover:scale-[1.01] hover:border-purple-400/30`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3 flex-1 min-w-0">
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500/20 to-indigo-500/20 flex items-center justify-center border border-purple-400/30">
                        <Home className="w-5 h-5 text-purple-300" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-white text-sm truncate">
                        Διαμέρισμα {apt.apartment_number}
                      </h3>
                      <p className="text-xs text-purple-200/70 truncate">
                        {apt.owner_name || 'Μη καταχωρημένος'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right ml-3 flex-shrink-0">
                    <div className="text-lg font-bold text-white">
                      €{amount.toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer Stats */}
      {debts.length > 0 && (
        <div className="mt-3 pt-3 border-t border-purple-500/20">
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-gradient-to-br from-purple-900/30 to-indigo-900/30 backdrop-blur-sm p-2 rounded-lg border border-purple-500/20 text-center">
              <div className="text-lg font-bold text-purple-300">{debts.length}</div>
              <div className="text-xs text-purple-200">Διαμερίσματα</div>
            </div>
            <div className="bg-gradient-to-br from-indigo-900/30 to-purple-900/30 backdrop-blur-sm p-2 rounded-lg border border-indigo-500/20 text-center">
              <div className="text-lg font-bold text-indigo-300">
                €{(totalExpenses / debts.length).toFixed(0)}
              </div>
              <div className="text-xs text-indigo-200">Μέσος Όρος</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


