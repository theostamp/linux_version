'use client';

import { BaseWidgetProps } from '@/types/kiosk';
import { Euro, Home, AlertCircle, TrendingUp } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useBuilding } from '@/components/contexts/BuildingContext';

interface ApartmentDebt {
  apartment_id: number;
  apartment_number: string;
  owner_name: string;
  net_obligation: number;
  current_balance: number;
  status: string;
}

export default function ApartmentDebtsWidget({ data, isLoading, error, settings }: BaseWidgetProps) {
  const { currentBuilding, selectedBuilding } = useBuilding();
  const building = selectedBuilding || currentBuilding;
  const [debts, setDebts] = useState<ApartmentDebt[]>([]);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDebts = async () => {
      if (!building?.id) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/financial/dashboard/apartment_balances/?building_id=${building.id}`, {
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch apartment debts');
        }

        const result = await response.json();
        
        // Φιλτράρουμε μόνο διαμερίσματα με οφειλές (net_obligation > 0)
        const apartmentsWithDebts = (result.apartments || [])
          .filter((apt: ApartmentDebt) => apt.net_obligation > 0)
          .sort((a: ApartmentDebt, b: ApartmentDebt) => b.net_obligation - a.net_obligation);
        
        setDebts(apartmentsWithDebts);
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
  }, [building?.id]);

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

  const totalDebt = debts.reduce((sum, apt) => sum + apt.net_obligation, 0);

  return (
    <div className="h-full overflow-hidden flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-orange-500/20">
        <div className="flex items-center space-x-2">
          <Euro className="w-6 h-6 text-orange-300" />
          <h2 className="text-lg font-bold text-white">Οφειλές Διαμερισμάτων</h2>
        </div>
        <div className="text-right">
          <div className="text-xs text-orange-200">Σύνολο</div>
          <div className="text-lg font-bold text-orange-300">
            €{totalDebt.toFixed(2)}
          </div>
        </div>
      </div>
      
      {/* Debts List */}
      <div className="flex-1 overflow-y-auto space-y-2">
        {debts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-emerald-300">
            <TrendingUp className="w-12 h-12 mb-3 opacity-60" />
            <p className="text-sm font-medium">Δεν υπάρχουν οφειλές!</p>
            <p className="text-xs text-emerald-400 mt-1">Όλα τα διαμερίσματα είναι ενημερωμένα</p>
          </div>
        ) : (
          debts.map((apt) => {
            // Καθορισμός χρώματος ανάλογα με το ύψος της οφειλής
            let bgColor = 'from-blue-900/40 to-indigo-900/40';
            let borderColor = 'border-blue-500/30';
            let statusColor = 'text-blue-300';
            
            if (apt.net_obligation > 500) {
              bgColor = 'from-red-900/40 to-rose-900/40';
              borderColor = 'border-red-500/30';
              statusColor = 'text-red-300';
            } else if (apt.net_obligation > 200) {
              bgColor = 'from-orange-900/40 to-amber-900/40';
              borderColor = 'border-orange-500/30';
              statusColor = 'text-orange-300';
            } else if (apt.net_obligation > 100) {
              bgColor = 'from-yellow-900/40 to-orange-900/40';
              borderColor = 'border-yellow-500/30';
              statusColor = 'text-yellow-300';
            }

            return (
              <div
                key={apt.apartment_id}
                className={`bg-gradient-to-br ${bgColor} backdrop-blur-sm p-3 rounded-lg border ${borderColor} transition-all hover:scale-[1.02]`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3 flex-1 min-w-0">
                    <div className="flex-shrink-0">
                      <div className={`w-10 h-10 rounded-full bg-gradient-to-br from-white/10 to-white/5 flex items-center justify-center border ${borderColor}`}>
                        <Home className="w-5 h-5 text-white/80" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <h3 className="font-bold text-white text-sm truncate">
                          {apt.apartment_number}
                        </h3>
                        {apt.net_obligation > 300 && (
                          <AlertCircle className={`w-3.5 h-3.5 ${statusColor} flex-shrink-0`} />
                        )}
                      </div>
                      <p className="text-xs text-white/70 truncate">
                        {apt.owner_name || 'Μη καταχωρημένος'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right ml-3 flex-shrink-0">
                    <div className={`text-lg font-bold ${statusColor}`}>
                      €{apt.net_obligation.toFixed(2)}
                    </div>
                    <div className="text-xs text-white/60">
                      {apt.status || 'Οφειλή'}
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
        <div className="mt-3 pt-3 border-t border-orange-500/20">
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-gradient-to-br from-orange-900/30 to-red-900/30 backdrop-blur-sm p-2 rounded-lg border border-orange-500/20 text-center">
              <div className="text-lg font-bold text-orange-300">{debts.length}</div>
              <div className="text-xs text-orange-200">Διαμερίσματα</div>
            </div>
            <div className="bg-gradient-to-br from-red-900/30 to-rose-900/30 backdrop-blur-sm p-2 rounded-lg border border-red-500/20 text-center">
              <div className="text-lg font-bold text-red-300">
                €{(totalDebt / debts.length).toFixed(0)}
              </div>
              <div className="text-xs text-red-200">Μ.Ο. Οφειλή</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


