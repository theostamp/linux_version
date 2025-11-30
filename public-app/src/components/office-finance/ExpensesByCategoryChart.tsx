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

// Using semantic colors
const CATEGORY_COLORS: Record<string, string> = {
  platform: 'bg-primary',
  staff: 'bg-indigo-500',
  utilities: 'bg-amber-500',
  equipment: 'bg-purple-500',
  professional: 'bg-teal-500',
  marketing: 'bg-pink-500',
  rent: 'bg-slate-500',
  insurance: 'bg-rose-500',
  taxes: 'bg-orange-500',
  fixed: 'bg-primary',
  operational: 'bg-cyan-500',
  collaborators: 'bg-violet-500',
  suppliers: 'bg-amber-500',
  taxes_legal: 'bg-orange-500',
  other: 'bg-slate-400',
};

const CATEGORY_BG_COLORS: Record<string, string> = {
  platform: 'bg-primary/10',
  staff: 'bg-indigo-500/10',
  utilities: 'bg-amber-500/10',
  equipment: 'bg-purple-500/10',
  professional: 'bg-teal-500/10',
  marketing: 'bg-pink-500/10',
  rent: 'bg-slate-500/10',
  insurance: 'bg-rose-500/10',
  taxes: 'bg-orange-500/10',
  fixed: 'bg-primary/10',
  operational: 'bg-cyan-500/10',
  collaborators: 'bg-violet-500/10',
  suppliers: 'bg-amber-500/10',
  taxes_legal: 'bg-orange-500/10',
  other: 'bg-slate-400/10',
};

export function ExpensesByCategoryChart({ data, isLoading }: ExpensesByCategoryChartProps) {
  if (isLoading) {
    return (
      <div className="bg-card rounded-xl border border-secondary p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-rose-500/10 p-2.5 rounded-lg">
            <PieChart className="w-5 h-5 text-rose-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">Έξοδα ανά Κατηγορία</h3>
            <p className="text-sm text-muted-foreground">Τρέχων μήνας</p>
          </div>
        </div>
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="animate-pulse flex items-center gap-3">
              <div className="w-10 h-10 bg-muted rounded-lg"></div>
              <div className="flex-1">
                <div className="h-4 bg-muted rounded w-1/2 mb-2"></div>
                <div className="h-3 bg-muted rounded w-1/4"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="bg-card rounded-xl border border-secondary p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-rose-500/10 p-2.5 rounded-lg">
            <PieChart className="w-5 h-5 text-rose-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">Έξοδα ανά Κατηγορία</h3>
            <p className="text-sm text-muted-foreground">Τρέχων μήνας</p>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Receipt className="w-12 h-12 text-muted-foreground/50 mb-3" />
          <p className="text-muted-foreground">Δεν υπάρχουν έξοδα</p>
          <p className="text-sm text-muted-foreground/70">για αυτόν τον μήνα</p>
        </div>
      </div>
    );
  }

  const totalExpenses = data.reduce((sum, d) => sum + d.total, 0);

  // Sort by total descending
  const sortedData = [...data].sort((a, b) => b.total - a.total);

  return (
    <div className="bg-card rounded-xl border border-secondary p-6 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="bg-rose-500/10 p-2.5 rounded-lg">
            <PieChart className="w-5 h-5 text-rose-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">Έξοδα ανά Κατηγορία</h3>
            <p className="text-sm text-muted-foreground">Τρέχων μήνας</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm text-muted-foreground">Σύνολο</p>
          <p className="text-lg font-bold text-rose-600">{formatCurrency(totalExpenses)}</p>
        </div>
      </div>

      {/* Category List */}
      <div className="space-y-3 max-h-[300px] overflow-y-auto">
        {sortedData.map((category) => {
          const percentage = (category.total / totalExpenses) * 100;
          const colorClass = CATEGORY_COLORS[category.category_type] || 'bg-slate-400';
          const bgColorClass = CATEGORY_BG_COLORS[category.category_type] || 'bg-slate-400/10';

          return (
            <div
              key={category.category_id}
              className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
            >
              <div className={`${bgColorClass} p-2 rounded-lg`}>
                <div className={`w-3 h-3 rounded-full ${colorClass}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground truncate">
                    {category.category_name}
                  </span>
                  <span className="text-sm font-semibold text-foreground ml-2">
                    {formatCurrency(category.total)}
                  </span>
                </div>
                <div className="flex items-center justify-between mt-1">
                  <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden mr-3">
                    <div
                      className={`h-full ${colorClass} rounded-full transition-all duration-500`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground w-12 text-right">
                    {percentage.toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 pt-4 border-t border-secondary">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            {data.reduce((sum, d) => sum + d.count, 0)} συναλλαγές
          </span>
          <div className="flex items-center gap-1 text-rose-600">
            <TrendingDown className="w-4 h-4" />
            <span>Μέσο έξοδο: {formatCurrency(totalExpenses / data.reduce((sum, d) => sum + d.count, 0))}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ExpensesByCategoryChart;
