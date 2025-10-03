'use client';

import { BaseWidgetProps } from '@/types/kiosk';
import { Euro, TrendingUp, TrendingDown, PieChart, BarChart3 } from 'lucide-react';

export default function FinancialWidget({ data, isLoading, error }: BaseWidgetProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-300"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full text-red-300">
        <div className="text-center">
          <div className="text-2xl mb-2">⚠️</div>
          <p className="text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-hidden">
      <div className="flex items-center space-x-2 mb-4 pb-2 border-b border-emerald-500/20">
        <Euro className="w-6 h-6 text-emerald-300" />
        <h2 className="text-lg font-bold text-white">Φύλλο Κοινόχρηστων</h2>
      </div>
      
      <div className="h-full overflow-y-auto">
        {/* Φύλλο Κοινόχρηστων Image */}
        <div className="bg-white rounded-lg p-4 h-full flex items-center justify-center">
          <div className="text-center">
            <div className="bg-gradient-to-br from-emerald-100 to-green-100 rounded-xl p-8 border-2 border-emerald-200 shadow-lg max-w-full max-h-full">
              <div className="text-6xl mb-4">🧾</div>
              <h3 className="text-2xl font-bold text-emerald-800 mb-2">Φύλλο Κοινόχρηστων</h3>
              <div className="space-y-4 text-left max-w-md">
                <div className="bg-white p-4 rounded-lg border border-emerald-200">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-semibold text-emerald-700">Κτίριο:</span>
                    <span className="text-emerald-600">Αλκμάνος 22</span>
                  </div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-semibold text-emerald-700">Περίοδος:</span>
                    <span className="text-emerald-600">Δεκέμβριος 2024</span>
                  </div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-semibold text-emerald-700">Συνολικό ποσό:</span>
                    <span className="text-emerald-600 font-bold">€2,450.00</span>
                  </div>
                  <div className="border-t border-emerald-200 mt-3 pt-3">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="flex justify-between">
                        <span>Καύσιμα:</span>
                        <span>€850.00</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Ηλεκτρισμός:</span>
                        <span>€420.00</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Καθαριότητα:</span>
                        <span>€180.00</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Συντήρηση:</span>
                        <span>€650.00</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Ασφάλεια:</span>
                        <span>€200.00</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Άλλα έξοδα:</span>
                        <span>€150.00</span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 pt-3 border-t border-emerald-200">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-emerald-600">Μερίδιο ανά διαμέρισμα:</span>
                      <span className="font-bold text-emerald-800">€122.50</span>
                    </div>
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-sm text-emerald-600 font-semibold">
                    Προθεσμία πληρωμής: 31/01/2025
                  </div>
                  <div className="text-xs text-emerald-500 mt-1">
                    Πληρωμή στο IBAN: GR12 3456 7890 1234 5678 9012 345
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
