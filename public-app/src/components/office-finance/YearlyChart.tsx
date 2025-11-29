'use client';

import React, { useState } from 'react';
import { BarChart3, ChevronLeft, ChevronRight } from 'lucide-react';
import type { YearlySummary } from '@/hooks/useOfficeFinance';

interface YearlyChartProps {
  data: YearlySummary | null;
  isLoading?: boolean;
  onYearChange?: (year: number) => void;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('el-GR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatCompactCurrency(value: number): string {
  if (Math.abs(value) >= 1000) {
    return `${(value / 1000).toFixed(1)}K`;
  }
  return value.toFixed(0);
}

const MONTH_NAMES = ['Ιαν', 'Φεβ', 'Μαρ', 'Απρ', 'Μάι', 'Ιουν', 'Ιουλ', 'Αυγ', 'Σεπ', 'Οκτ', 'Νοε', 'Δεκ'];

export function YearlyChart({ data, isLoading, onYearChange }: YearlyChartProps) {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(data?.year || currentYear);
  const [hoveredMonth, setHoveredMonth] = useState<number | null>(null);

  const handleYearChange = (delta: number) => {
    const newYear = selectedYear + delta;
    setSelectedYear(newYear);
    onYearChange?.(newYear);
  };

  if (isLoading) {
    return (
      <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="bg-blue-500/20 p-2.5 rounded-lg">
              <BarChart3 className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Ετήσια Επισκόπηση</h3>
              <p className="text-sm text-slate-400">Έσοδα vs Έξοδα</p>
            </div>
          </div>
        </div>
        <div className="h-64 flex items-end gap-2">
          {[...Array(12)].map((_, i) => (
            <div key={i} className="flex-1 flex flex-col gap-1">
              <div className="animate-pulse bg-slate-700 rounded-t" style={{ height: `${Math.random() * 60 + 20}%` }}></div>
              <div className="animate-pulse bg-slate-700 rounded-t" style={{ height: `${Math.random() * 40 + 10}%` }}></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-blue-500/20 p-2.5 rounded-lg">
            <BarChart3 className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Ετήσια Επισκόπηση</h3>
            <p className="text-sm text-slate-400">Δεν υπάρχουν δεδομένα</p>
          </div>
        </div>
      </div>
    );
  }

  const maxValue = Math.max(
    ...data.monthly_data.map(m => Math.max(m.income, m.expenses)),
    1
  );

  return (
    <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="bg-blue-500/20 p-2.5 rounded-lg">
            <BarChart3 className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Ετήσια Επισκόπηση</h3>
            <p className="text-sm text-slate-400">Έσοδα vs Έξοδα</p>
          </div>
        </div>
        
        {/* Year Selector */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleYearChange(-1)}
            className="p-1.5 rounded-lg hover:bg-slate-700/50 text-slate-400 hover:text-white transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="text-lg font-semibold text-white min-w-[60px] text-center">
            {data.year}
          </span>
          <button
            onClick={() => handleYearChange(1)}
            disabled={data.year >= currentYear}
            className="p-1.5 rounded-lg hover:bg-slate-700/50 text-slate-400 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-emerald-500/10 rounded-lg p-3 border border-emerald-500/20">
          <p className="text-xs text-emerald-400/80 mb-1">Συνολικά Έσοδα</p>
          <p className="text-lg font-bold text-emerald-400">{formatCurrency(data.total_income)}</p>
        </div>
        <div className="bg-rose-500/10 rounded-lg p-3 border border-rose-500/20">
          <p className="text-xs text-rose-400/80 mb-1">Συνολικά Έξοδα</p>
          <p className="text-lg font-bold text-rose-400">{formatCurrency(data.total_expenses)}</p>
        </div>
        <div className={`${data.net_result >= 0 ? 'bg-blue-500/10 border-blue-500/20' : 'bg-amber-500/10 border-amber-500/20'} rounded-lg p-3 border`}>
          <p className={`text-xs ${data.net_result >= 0 ? 'text-blue-400/80' : 'text-amber-400/80'} mb-1`}>Καθαρό Αποτέλεσμα</p>
          <p className={`text-lg font-bold ${data.net_result >= 0 ? 'text-blue-400' : 'text-amber-400'}`}>
            {formatCurrency(data.net_result)}
          </p>
        </div>
      </div>

      {/* Chart */}
      <div className="relative h-64">
        {/* Y-axis labels */}
        <div className="absolute left-0 top-0 bottom-8 w-12 flex flex-col justify-between text-xs text-slate-500">
          <span>{formatCompactCurrency(maxValue)}</span>
          <span>{formatCompactCurrency(maxValue / 2)}</span>
          <span>0</span>
        </div>

        {/* Chart area */}
        <div className="ml-14 h-full flex items-end gap-1">
          {data.monthly_data.map((month, index) => {
            const incomeHeight = (month.income / maxValue) * 100;
            const expenseHeight = (month.expenses / maxValue) * 100;
            const isHovered = hoveredMonth === index;
            const currentMonth = new Date().getMonth();
            const isFuture = data.year === currentYear && index > currentMonth;

            return (
              <div
                key={index}
                className="flex-1 flex flex-col items-center relative"
                onMouseEnter={() => setHoveredMonth(index)}
                onMouseLeave={() => setHoveredMonth(null)}
              >
                {/* Tooltip */}
                {isHovered && !isFuture && (
                  <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-slate-900 border border-slate-700 rounded-lg p-2 shadow-xl z-10 min-w-[120px]">
                    <p className="text-xs font-medium text-white mb-1">{MONTH_NAMES[index]} {data.year}</p>
                    <div className="flex items-center gap-2 text-xs">
                      <div className="w-2 h-2 rounded-full bg-emerald-500" />
                      <span className="text-slate-400">Έσοδα:</span>
                      <span className="text-emerald-400 font-medium">{formatCurrency(month.income)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <div className="w-2 h-2 rounded-full bg-rose-500" />
                      <span className="text-slate-400">Έξοδα:</span>
                      <span className="text-rose-400 font-medium">{formatCurrency(month.expenses)}</span>
                    </div>
                    <div className="border-t border-slate-700 mt-1 pt-1">
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-slate-400">Καθαρά:</span>
                        <span className={`font-medium ${month.net >= 0 ? 'text-blue-400' : 'text-amber-400'}`}>
                          {formatCurrency(month.net)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Bars */}
                <div 
                  className={`w-full flex gap-0.5 items-end h-[calc(100%-2rem)] ${isFuture ? 'opacity-30' : ''}`}
                  style={{ minHeight: '1px' }}
                >
                  {/* Income bar */}
                  <div
                    className={`flex-1 bg-emerald-500 rounded-t transition-all duration-300 ${isHovered ? 'bg-emerald-400' : ''}`}
                    style={{ height: `${incomeHeight}%`, minHeight: month.income > 0 ? '2px' : '0' }}
                  />
                  {/* Expense bar */}
                  <div
                    className={`flex-1 bg-rose-500 rounded-t transition-all duration-300 ${isHovered ? 'bg-rose-400' : ''}`}
                    style={{ height: `${expenseHeight}%`, minHeight: month.expenses > 0 ? '2px' : '0' }}
                  />
                </div>

                {/* Month label */}
                <span className={`text-xs mt-2 ${isHovered ? 'text-white font-medium' : 'text-slate-500'}`}>
                  {MONTH_NAMES[index]}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 mt-4 pt-4 border-t border-slate-700/50">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-emerald-500" />
          <span className="text-sm text-slate-400">Έσοδα</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-rose-500" />
          <span className="text-sm text-slate-400">Έξοδα</span>
        </div>
      </div>
    </div>
  );
}

export default YearlyChart;

