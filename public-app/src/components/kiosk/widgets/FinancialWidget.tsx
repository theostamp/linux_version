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
        <h2 className="text-lg font-bold text-white">Οικονομικά Στοιχεία</h2>
      </div>

      <div className="h-full overflow-y-auto">
        <div className="space-y-4">
          {/* Financial Overview Cards */}
          <div className="bg-gradient-to-br from-emerald-900/40 to-green-900/40 backdrop-blur-sm p-4 rounded-xl border border-emerald-500/30">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-emerald-100">Σύνοψη Οικονομικών</h3>
              <div className="flex items-center">
                <TrendingUp className="w-4 h-4 text-green-400" />
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-white mb-1">€0</div>
              <div className="w-full bg-emerald-900/50 rounded-full h-3">
                <div className="h-3 rounded-full transition-all bg-green-400" style={{width: '0%'}}></div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gradient-to-br from-blue-900/40 to-indigo-900/40 backdrop-blur-sm p-3 rounded-xl border border-blue-500/30">
              <div className="flex items-center space-x-2 mb-2">
                <Euro className="w-4 h-4 text-blue-300" />
                <h4 className="text-xs font-semibold text-blue-100">Συνολικές Πληρωμές</h4>
              </div>
              <div className="text-lg font-bold text-white">€0</div>
            </div>

            <div className="bg-gradient-to-br from-green-900/40 to-emerald-900/40 backdrop-blur-sm p-3 rounded-xl border border-green-500/30">
              <div className="flex items-center space-x-2 mb-2">
                <TrendingUp className="w-4 h-4 text-green-300" />
                <h4 className="text-xs font-semibold text-green-100">Εισπράχθηκαν</h4>
              </div>
              <div className="text-lg font-bold text-white">€0</div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-yellow-900/40 to-amber-900/40 backdrop-blur-sm p-4 rounded-xl border border-yellow-500/30">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-yellow-100">Εκκρεμότητες</h3>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                <div className="w-2 h-2 bg-red-400 rounded-full"></div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="text-center">
                <div className="text-lg font-bold text-yellow-300">0</div>
                <div className="text-xs text-yellow-200">Εκκρεμείς</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-red-300">0</div>
                <div className="text-xs text-red-200">Ληγμένες</div>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-900/40 to-violet-900/40 backdrop-blur-sm p-4 rounded-xl border border-purple-500/30">
            <div className="flex items-center space-x-2 mb-3">
              <BarChart3 className="w-4 h-4 text-purple-300" />
              <h3 className="text-sm font-semibold text-purple-100">Τάση Εισπράξεων</h3>
            </div>
            <div className="flex items-center justify-center h-16">
              <div className="flex items-end space-x-1">
                <div className="bg-purple-400 rounded-t" style={{width: '8px', height: '20px', opacity: 0.6}}></div>
                <div className="bg-purple-400 rounded-t" style={{width: '8px', height: '30px', opacity: 0.6}}></div>
                <div className="bg-purple-400 rounded-t" style={{width: '8px', height: '25px', opacity: 0.6}}></div>
                <div className="bg-purple-400 rounded-t" style={{width: '8px', height: '35px', opacity: 0.6}}></div>
                <div className="bg-purple-400 rounded-t" style={{width: '8px', height: '40px', opacity: 0.6}}></div>
                <div className="bg-purple-400 rounded-t" style={{width: '8px', height: '45px', opacity: 0.6}}></div>
                <div className="bg-purple-400 rounded-t" style={{width: '8px', height: '0px', opacity: 1}}></div>
              </div>
            </div>
            <div className="text-center mt-2">
              <div className="text-xs text-purple-300">Τρέχουσα περίοδος: 0%</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="bg-gradient-to-br from-gray-800/40 to-slate-800/40 backdrop-blur-sm p-2 rounded-lg border border-gray-600/30 text-center">
              <PieChart className="w-4 h-4 mx-auto mb-1 text-gray-300" />
              <div className="text-xs text-gray-300">Αναφορά</div>
            </div>
            <div className="bg-gradient-to-br from-gray-800/40 to-slate-800/40 backdrop-blur-sm p-2 rounded-lg border border-gray-600/30 text-center">
              <Euro className="w-4 h-4 mx-auto mb-1 text-gray-300" />
              <div className="text-xs text-gray-300">Καταθέσεις</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
