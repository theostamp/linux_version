'use client';

import React from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  ArrowUpRight,
  ArrowDownRight,
  Clock
} from 'lucide-react';
import type { MonthSummary, PreviousMonthSummary } from '@/hooks/useOfficeFinance';

interface FinanceSummaryCardsProps {
  currentMonth: MonthSummary | null;
  previousMonth: PreviousMonthSummary | null;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('el-GR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
  }).format(value);
}

function getMonthName(month: number): string {
  const months = [
    'Ιανουάριος', 'Φεβρουάριος', 'Μάρτιος', 'Απρίλιος',
    'Μάιος', 'Ιούνιος', 'Ιούλιος', 'Αύγουστος',
    'Σεπτέμβριος', 'Οκτώβριος', 'Νοέμβριος', 'Δεκέμβριος'
  ];
  return months[month - 1] || '';
}

function calculateChange(current: number, previous: number): { value: number; isPositive: boolean } {
  if (previous === 0) return { value: 0, isPositive: true };
  const change = ((current - previous) / previous) * 100;
  return { value: Math.abs(change), isPositive: change >= 0 };
}

export function FinanceSummaryCards({ currentMonth, previousMonth }: FinanceSummaryCardsProps) {
  if (!currentMonth) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-slate-800/50 rounded-xl p-6 animate-pulse">
            <div className="h-4 bg-slate-700 rounded w-1/2 mb-4"></div>
            <div className="h-8 bg-slate-700 rounded w-3/4"></div>
          </div>
        ))}
      </div>
    );
  }

  const incomeChange = previousMonth 
    ? calculateChange(currentMonth.income.received, previousMonth.income)
    : null;
  
  const expenseChange = previousMonth
    ? calculateChange(currentMonth.expenses.paid, previousMonth.expenses)
    : null;

  const cards = [
    {
      title: 'Έσοδα Μήνα',
      subtitle: getMonthName(currentMonth.month),
      value: currentMonth.income.received,
      subValue: currentMonth.income.pending > 0 
        ? `+${formatCurrency(currentMonth.income.pending)} εκκρεμεί`
        : null,
      icon: TrendingUp,
      color: 'emerald',
      bgGradient: 'from-emerald-500/20 to-emerald-600/5',
      iconBg: 'bg-emerald-500/20',
      iconColor: 'text-emerald-400',
      change: incomeChange,
    },
    {
      title: 'Έξοδα Μήνα',
      subtitle: getMonthName(currentMonth.month),
      value: currentMonth.expenses.paid,
      subValue: currentMonth.expenses.unpaid > 0
        ? `+${formatCurrency(currentMonth.expenses.unpaid)} απλήρωτα`
        : null,
      icon: TrendingDown,
      color: 'rose',
      bgGradient: 'from-rose-500/20 to-rose-600/5',
      iconBg: 'bg-rose-500/20',
      iconColor: 'text-rose-400',
      change: expenseChange,
      invertChange: true, // For expenses, less is better
    },
    {
      title: 'Καθαρό Αποτέλεσμα',
      subtitle: getMonthName(currentMonth.month),
      value: currentMonth.net_result,
      icon: Wallet,
      color: currentMonth.net_result >= 0 ? 'blue' : 'amber',
      bgGradient: currentMonth.net_result >= 0 
        ? 'from-blue-500/20 to-blue-600/5'
        : 'from-amber-500/20 to-amber-600/5',
      iconBg: currentMonth.net_result >= 0 ? 'bg-blue-500/20' : 'bg-amber-500/20',
      iconColor: currentMonth.net_result >= 0 ? 'text-blue-400' : 'text-amber-400',
    },
    {
      title: 'Εκκρεμή Έσοδα',
      subtitle: 'Αναμένεται είσπραξη',
      value: currentMonth.income.pending,
      icon: Clock,
      color: 'violet',
      bgGradient: 'from-violet-500/20 to-violet-600/5',
      iconBg: 'bg-violet-500/20',
      iconColor: 'text-violet-400',
      count: currentMonth.income.count,
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, index) => {
        const Icon = card.icon;
        
        return (
          <div
            key={index}
            className={`relative overflow-hidden rounded-xl border border-slate-700/50 bg-gradient-to-br ${card.bgGradient} backdrop-blur-sm p-6`}
          >
            {/* Background decoration */}
            <div className="absolute -right-4 -top-4 w-24 h-24 rounded-full bg-white/5 blur-2xl" />
            
            <div className="relative">
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-sm text-slate-400">{card.title}</p>
                  <p className="text-xs text-slate-500">{card.subtitle}</p>
                </div>
                <div className={`${card.iconBg} p-2.5 rounded-lg`}>
                  <Icon className={`w-5 h-5 ${card.iconColor}`} />
                </div>
              </div>

              {/* Value */}
              <div className="mb-2">
                <span className={`text-2xl font-bold ${
                  card.value >= 0 ? 'text-white' : 'text-rose-400'
                }`}>
                  {formatCurrency(card.value)}
                </span>
              </div>

              {/* Sub value or change indicator */}
              <div className="flex items-center gap-2">
                {card.change && (
                  <div className={`flex items-center gap-1 text-xs ${
                    (card.invertChange ? !card.change.isPositive : card.change.isPositive)
                      ? 'text-emerald-400'
                      : 'text-rose-400'
                  }`}>
                    {(card.invertChange ? !card.change.isPositive : card.change.isPositive) ? (
                      <ArrowUpRight className="w-3 h-3" />
                    ) : (
                      <ArrowDownRight className="w-3 h-3" />
                    )}
                    <span>{card.change.value.toFixed(1)}%</span>
                    <span className="text-slate-500">vs προηγ.</span>
                  </div>
                )}
                {card.subValue && (
                  <span className="text-xs text-slate-400">{card.subValue}</span>
                )}
                {card.count !== undefined && (
                  <span className="text-xs text-slate-500">
                    {card.count} εγγραφ{card.count === 1 ? 'ή' : 'ές'}
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default FinanceSummaryCards;

