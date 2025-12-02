'use client';

import React from 'react';
import { Building2, TrendingUp } from 'lucide-react';
import type { IncomeByBuilding } from '@/hooks/useOfficeFinance';

interface IncomeByBuildingChartProps {
  data: IncomeByBuilding[] | null;
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

const COLORS = [
  'bg-teal-500',
  'bg-primary',
  'bg-violet-500',
  'bg-amber-500',
  'bg-rose-500',
  'bg-cyan-500',
  'bg-pink-500',
  'bg-indigo-500',
];

export function IncomeByBuildingChart({ data, isLoading }: IncomeByBuildingChartProps) {
  if (isLoading) {
    return (
      <div className="bg-card rounded-xl border border-secondary p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-teal-500/20 p-2.5 rounded-lg">
            <Building2 className="w-5 h-5 text-teal-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">Έσοδα ανά Κτίριο</h3>
            <p className="text-sm text-muted-foreground">Τρέχων μήνας</p>
          </div>
        </div>
        <div className="space-y-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="h-4 bg-muted rounded w-1/3 mb-2"></div>
              <div className="h-6 bg-muted rounded w-full"></div>
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
          <div className="bg-teal-500/20 p-2.5 rounded-lg">
            <Building2 className="w-5 h-5 text-teal-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">Έσοδα ανά Κτίριο</h3>
            <p className="text-sm text-muted-foreground">Τρέχων μήνας</p>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Building2 className="w-12 h-12 text-muted-foreground/50 mb-3" />
          <p className="text-muted-foreground">Δεν υπάρχουν έσοδα από κτίρια</p>
          <p className="text-sm text-muted-foreground/70">για αυτόν τον μήνα</p>
        </div>
      </div>
    );
  }

  const maxValue = Math.max(...data.map(d => d.total));
  const totalIncome = data.reduce((sum, d) => sum + d.total, 0);

  return (
    <div className="bg-card rounded-xl border border-secondary p-6 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="bg-teal-500/20 p-2.5 rounded-lg">
            <Building2 className="w-5 h-5 text-teal-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">Έσοδα ανά Κτίριο</h3>
            <p className="text-sm text-muted-foreground">Τρέχων μήνας</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm text-muted-foreground">Σύνολο</p>
          <p className="text-lg font-bold text-teal-600">{formatCurrency(totalIncome)}</p>
        </div>
      </div>

      <div className="space-y-4">
        {data.map((building, index) => {
          const percentage = (building.total / maxValue) * 100;
          const sharePercentage = (building.total / totalIncome) * 100;
          const colorClass = COLORS[index % COLORS.length];

          return (
            <div key={building.building_id} className="group">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${colorClass}`} />
                  <span className="text-sm font-medium text-foreground truncate max-w-[200px]">
                    {building.building_name}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground">
                    {sharePercentage.toFixed(1)}%
                  </span>
                  <span className="text-sm font-semibold text-foreground">
                    {formatCurrency(building.total)}
                  </span>
                </div>
              </div>
              
              <div className="relative h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className={`absolute inset-y-0 left-0 ${colorClass} rounded-full transition-all duration-500 ease-out`}
                  style={{ width: `${percentage}%` }}
                />
              </div>
              
              {building.building_address && (
                <p className="text-xs text-muted-foreground mt-1 truncate opacity-0 group-hover:opacity-100 transition-opacity">
                  {building.building_address}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {data.length > 0 && (
        <div className="mt-6 pt-4 border-t border-secondary">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {data.length} κτίρι{data.length === 1 ? 'ο' : 'α'} με έσοδα
            </span>
            <div className="flex items-center gap-1 text-teal-600">
              <TrendingUp className="w-4 h-4" />
              <span>Μέσος όρος: {formatCurrency(totalIncome / data.length)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default IncomeByBuildingChart;
