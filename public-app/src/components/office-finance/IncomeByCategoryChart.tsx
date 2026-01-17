'use client';

import React from 'react';
import { PieChart, Wallet, TrendingUp } from 'lucide-react';
import type { IncomeByCategory } from '@/hooks/useOfficeFinance';

interface IncomeByCategoryChartProps {
  data: IncomeByCategory[] | null;
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

const GROUP_COLORS: Record<string, string> = {
  building_fees: 'bg-emerald-500',
  services: 'bg-blue-500',
  commissions: 'bg-violet-500',
  product_sales: 'bg-amber-500',
  other: 'bg-slate-400',
};

const GROUP_BG_COLORS: Record<string, string> = {
  building_fees: 'bg-emerald-500/10',
  services: 'bg-blue-500/10',
  commissions: 'bg-violet-500/10',
  product_sales: 'bg-amber-500/10',
  other: 'bg-slate-400/10',
};

export function IncomeByCategoryChart({ data, isLoading }: IncomeByCategoryChartProps) {
  if (isLoading) {
    return (
      <div className="bg-card rounded-xl border border-secondary p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-emerald-500/10 p-2.5 rounded-lg">
            <PieChart className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">Έσοδα ανά Κατηγορία</h3>
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
          <div className="bg-emerald-500/10 p-2.5 rounded-lg">
            <PieChart className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">Έσοδα ανά Κατηγορία</h3>
            <p className="text-sm text-muted-foreground">Τρέχων μήνας</p>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Wallet className="w-12 h-12 text-muted-foreground/50 mb-3" />
          <p className="text-muted-foreground">Δεν υπάρχουν έσοδα</p>
          <p className="text-sm text-muted-foreground/70">για αυτόν τον μήνα</p>
        </div>
      </div>
    );
  }

  const totalIncome = data.reduce((sum, d) => sum + d.total, 0);
  const totalCount = data.reduce((sum, d) => sum + d.count, 0);
  const sortedData = [...data].sort((a, b) => b.total - a.total);

  return (
    <div className="bg-card rounded-xl border border-secondary p-6 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="bg-emerald-500/10 p-2.5 rounded-lg">
            <PieChart className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">Έσοδα ανά Κατηγορία</h3>
            <p className="text-sm text-muted-foreground">Τρέχων μήνας</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm text-muted-foreground">Σύνολο</p>
          <p className="text-lg font-bold text-emerald-600">{formatCurrency(totalIncome)}</p>
        </div>
      </div>

      <div className="space-y-3 max-h-[300px] overflow-y-auto">
        {sortedData.map((category) => {
          const percentage = totalIncome > 0 ? (category.total / totalIncome) * 100 : 0;
          const groupKey = category.group_type || 'other';
          const colorClass = GROUP_COLORS[groupKey] || 'bg-slate-400';
          const bgColorClass = GROUP_BG_COLORS[groupKey] || 'bg-slate-400/10';

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
            {totalCount} συναλλαγές
          </span>
          <div className="flex items-center gap-1 text-emerald-600">
            <TrendingUp className="w-4 h-4" />
            <span>Μέσο έσοδο: {formatCurrency(totalCount > 0 ? totalIncome / totalCount : 0)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default IncomeByCategoryChart;
