'use client';

import React from 'react';
import { PieChart, Receipt, TrendingDown } from 'lucide-react';
import type { ExpensesByCategory } from '@/hooks/useOfficeFinance';

interface ExpensesByCategoryChartProps {
  data: ExpensesByCategory[] | null;
  isLoading?: boolean;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('el-GR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

const CATEGORY_COLORS: Record<string, string> = {
  platform: 'bg-blue-500',
  staff: 'bg-indigo-500',
  utilities: 'bg-amber-500',
  equipment: 'bg-purple-500',
  professional: 'bg-emerald-500',
  marketing: 'bg-pink-500',
  rent: 'bg-slate-500',
  insurance: 'bg-red-500',
  taxes: 'bg-orange-500',
  other: 'bg-gray-500',
};

const CATEGORY_BG_COLORS: Record<string, string> = {
  platform: 'bg-blue-500/20',
  staff: 'bg-indigo-500/20',
  utilities: 'bg-amber-500/20',
  equipment: 'bg-purple-500/20',
  professional: 'bg-emerald-500/20',
  marketing: 'bg-pink-500/20',
  rent: 'bg-slate-500/20',
  insurance: 'bg-red-500/20',
  taxes: 'bg-orange-500/20',
  other: 'bg-gray-500/20',
};

export function ExpensesByCategoryChart({ data, isLoading }: ExpensesByCategoryChartProps) {
  if (isLoading) {
    return (
      <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-rose-500/20 p-2.5 rounded-lg">
            <PieChart className="w-5 h-5 text-rose-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Έξοδα ανά Κατηγορία</h3>
            <p className="text-sm text-slate-400">Τρέχων μήνας</p>
          </div>
        </div>
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="animate-pulse flex items-center gap-3">
              <div className="w-10 h-10 bg-slate-700 rounded-lg"></div>
              <div className="flex-1">
                <div className="h-4 bg-slate-700 rounded w-1/2 mb-2"></div>
                <div className="h-3 bg-slate-700 rounded w-1/4"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-rose-500/20 p-2.5 rounded-lg">
            <PieChart className="w-5 h-5 text-rose-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Έξοδα ανά Κατηγορία</h3>
            <p className="text-sm text-slate-400">Τρέχων μήνας</p>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Receipt className="w-12 h-12 text-slate-600 mb-3" />
          <p className="text-slate-400">Δεν υπάρχουν έξοδα</p>
          <p className="text-sm text-slate-500">για αυτόν τον μήνα</p>
        </div>
      </div>
    );
  }

  const totalExpenses = data.reduce((sum, d) => sum + d.total, 0);

  // Sort by total descending
  const sortedData = [...data].sort((a, b) => b.total - a.total);

  return (
    <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="bg-rose-500/20 p-2.5 rounded-lg">
            <PieChart className="w-5 h-5 text-rose-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Έξοδα ανά Κατηγορία</h3>
            <p className="text-sm text-slate-400">Τρέχων μήνας</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm text-slate-400">Σύνολο</p>
          <p className="text-lg font-bold text-rose-400">{formatCurrency(totalExpenses)}</p>
        </div>
      </div>

      {/* Donut Chart Visualization */}
      <div className="flex items-center justify-center mb-6">
        <div className="relative w-40 h-40">
          <svg viewBox="0 0 100 100" className="transform -rotate-90">
            {sortedData.reduce((acc, category) => {
              const percentage = (category.total / totalExpenses) * 100;
              const previousPercentage = acc.offset;
              const colorClass = CATEGORY_COLORS[category.category_type] || 'bg-gray-500';
              const strokeColor = colorClass.replace('bg-', 'stroke-').replace('-500', '-400');
              
              acc.elements.push(
                <circle
                  key={category.category_id}
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  className={strokeColor}
                  strokeWidth="12"
                  strokeDasharray={`${percentage * 2.51} ${251 - percentage * 2.51}`}
                  strokeDashoffset={`${-previousPercentage * 2.51}`}
                  style={{ transition: 'stroke-dasharray 0.5s ease' }}
                />
              );
              acc.offset += percentage;
              return acc;
            }, { elements: [] as React.ReactNode[], offset: 0 }).elements}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold text-white">
              {sortedData.length}
            </span>
            <span className="text-xs text-slate-400">κατηγορίες</span>
          </div>
        </div>
      </div>

      {/* Category List */}
      <div className="space-y-3 max-h-[300px] overflow-y-auto">
        {sortedData.map((category) => {
          const percentage = (category.total / totalExpenses) * 100;
          const colorClass = CATEGORY_COLORS[category.category_type] || 'bg-gray-500';
          const bgColorClass = CATEGORY_BG_COLORS[category.category_type] || 'bg-gray-500/20';

          return (
            <div
              key={category.category_id}
              className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-700/30 transition-colors"
            >
              <div className={`${bgColorClass} p-2 rounded-lg`}>
                <div className={`w-3 h-3 rounded-full ${colorClass}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-white truncate">
                    {category.category_name}
                  </span>
                  <span className="text-sm font-semibold text-white ml-2">
                    {formatCurrency(category.total)}
                  </span>
                </div>
                <div className="flex items-center justify-between mt-1">
                  <div className="flex-1 h-1.5 bg-slate-700/50 rounded-full overflow-hidden mr-3">
                    <div
                      className={`h-full ${colorClass} rounded-full transition-all duration-500`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <span className="text-xs text-slate-400 w-12 text-right">
                    {percentage.toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 pt-4 border-t border-slate-700/50">
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-400">
            {data.reduce((sum, d) => sum + d.count, 0)} συναλλαγές
          </span>
          <div className="flex items-center gap-1 text-rose-400">
            <TrendingDown className="w-4 h-4" />
            <span>Μέσο έξοδο: {formatCurrency(totalExpenses / data.reduce((sum, d) => sum + d.count, 0))}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ExpensesByCategoryChart;

