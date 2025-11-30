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
          <div key={i} className="bg-card rounded-xl p-6 animate-pulse border border-secondary shadow-sm">
            <div className="h-4 bg-muted rounded w-1/2 mb-4"></div>
            <div className="h-8 bg-muted rounded w-3/4"></div>
          </div>
        ))}
      </div>
    );
  }

  // Use total expenses/income, not just paid/received
  const totalExpenses = currentMonth.expenses.total;
  const totalIncome = currentMonth.income.total;
  
  const incomeChange = previousMonth 
    ? calculateChange(totalIncome, previousMonth.income)
    : null;
  
  const expenseChange = previousMonth
    ? calculateChange(totalExpenses, previousMonth.expenses)
    : null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Income Card */}
      <div className="relative overflow-hidden rounded-xl border border-teal-200 bg-gradient-to-br from-teal-50 to-white p-6 shadow-sm">
        <div className="absolute -right-4 -top-4 w-24 h-24 rounded-full bg-teal-100/50 blur-2xl" />
        <div className="relative">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-sm text-slate-600">Έσοδα Μήνα</p>
              <p className="text-xs text-slate-500">{getMonthName(currentMonth.month)}</p>
            </div>
            <div className="bg-teal-100 p-2.5 rounded-lg">
              <TrendingUp className="w-5 h-5 text-teal-600" />
            </div>
          </div>
          <div className="mb-2">
            <span className="text-2xl font-bold text-slate-900">
              {formatCurrency(totalIncome)}
            </span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {incomeChange && (
              <div className={`flex items-center gap-1 text-xs ${
                incomeChange.isPositive ? 'text-teal-600' : 'text-rose-600'
              }`}>
                {incomeChange.isPositive ? (
                  <ArrowUpRight className="w-3 h-3" />
                ) : (
                  <ArrowDownRight className="w-3 h-3" />
                )}
                <span>{incomeChange.value.toFixed(1)}%</span>
                <span className="text-slate-500">vs προηγ.</span>
              </div>
            )}
            {currentMonth.income.pending > 0 && (
              <span className="text-xs text-slate-500">
                {formatCurrency(currentMonth.income.pending)} εκκρεμεί
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Expenses Card */}
      <div className="relative overflow-hidden rounded-xl border border-rose-200 bg-gradient-to-br from-rose-50 to-white p-6 shadow-sm">
        <div className="absolute -right-4 -top-4 w-24 h-24 rounded-full bg-rose-100/50 blur-2xl" />
        <div className="relative">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-sm text-slate-600">Έξοδα Μήνα</p>
              <p className="text-xs text-slate-500">{getMonthName(currentMonth.month)}</p>
            </div>
            <div className="bg-rose-100 p-2.5 rounded-lg">
              <TrendingDown className="w-5 h-5 text-rose-600" />
            </div>
          </div>
          <div className="mb-2">
            <span className="text-2xl font-bold text-slate-900">
              {formatCurrency(totalExpenses)}
            </span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {expenseChange && (
              <div className={`flex items-center gap-1 text-xs ${
                !expenseChange.isPositive ? 'text-teal-600' : 'text-rose-600'
              }`}>
                {!expenseChange.isPositive ? (
                  <ArrowUpRight className="w-3 h-3" />
                ) : (
                  <ArrowDownRight className="w-3 h-3" />
                )}
                <span>{expenseChange.value.toFixed(1)}%</span>
                <span className="text-slate-500">vs προηγ.</span>
              </div>
            )}
            {currentMonth.expenses.unpaid > 0 && (
              <span className="text-xs text-amber-600">
                +{formatCurrency(currentMonth.expenses.unpaid)} απλήρωτα
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Net Result Card */}
      <div className={`relative overflow-hidden rounded-xl border ${
        currentMonth.net_result >= 0 
          ? 'border-primary/30 bg-gradient-to-br from-indigo-50 to-white' 
          : 'border-rose-200 bg-gradient-to-br from-rose-50 to-white'
      } p-6 shadow-sm`}>
        <div className={`absolute -right-4 -top-4 w-24 h-24 rounded-full ${
          currentMonth.net_result >= 0 ? 'bg-indigo-100/50' : 'bg-rose-100/50'
        } blur-2xl`} />
        <div className="relative">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-sm text-slate-600">Καθαρό Αποτέλεσμα</p>
              <p className="text-xs text-slate-500">{getMonthName(currentMonth.month)}</p>
            </div>
            <div className={`${currentMonth.net_result >= 0 ? 'bg-indigo-100' : 'bg-rose-100'} p-2.5 rounded-lg`}>
              <Wallet className={`w-5 h-5 ${currentMonth.net_result >= 0 ? 'text-primary' : 'text-rose-600'}`} />
            </div>
          </div>
          <div className="mb-2">
            <span className={`text-2xl font-bold ${
              currentMonth.net_result >= 0 ? 'text-slate-900' : 'text-rose-600'
            }`}>
              {formatCurrency(currentMonth.net_result)}
            </span>
          </div>
        </div>
      </div>

      {/* Pending Income Card */}
      <div className="relative overflow-hidden rounded-xl border border-primary/30 bg-gradient-to-br from-indigo-50 to-white p-6 shadow-sm">
        <div className="absolute -right-4 -top-4 w-24 h-24 rounded-full bg-indigo-100/50 blur-2xl" />
        <div className="relative">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-sm text-slate-600">Εκκρεμή Έσοδα</p>
              <p className="text-xs text-slate-500">Αναμένεται είσπραξη</p>
            </div>
            <div className="bg-indigo-100 p-2.5 rounded-lg">
              <Clock className="w-5 h-5 text-primary" />
            </div>
          </div>
          <div className="mb-2">
            <span className="text-2xl font-bold text-slate-900">
              {formatCurrency(currentMonth.income.pending)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">
              {currentMonth.income.count} εγγραφ{currentMonth.income.count === 1 ? 'ή' : 'ές'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default FinanceSummaryCards;
