'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import type { CashFlowEntry } from '@/hooks/useOfficeDashboard';

interface CashFlowChartProps {
  data?: CashFlowEntry[];
  loading?: boolean;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('el-GR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

export function CashFlowChart({ data, loading = false }: CashFlowChartProps) {
  if (loading) {
    return (
      <Card className="border-0 shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Cash Flow
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card className="border-0 shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Cash Flow
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            Δεν υπάρχουν δεδομένα
          </div>
        </CardContent>
      </Card>
    );
  }

  // Calculate max values for scaling
  const maxValue = Math.max(
    ...data.map(d => Math.max(d.income, d.expenses))
  );

  // Calculate totals
  const totalIncome = data.reduce((sum, d) => sum + d.income, 0);
  const totalExpenses = data.reduce((sum, d) => sum + d.expenses, 0);
  const totalNet = totalIncome - totalExpenses;

  return (
    <Card className="border-0 shadow-md">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Cash Flow (6 μήνες)
          </CardTitle>
          <div className="flex items-center gap-4 text-sm">
            <span className="flex items-center gap-1 text-green-600">
              <div className="w-3 h-3 rounded-full bg-green-500" />
              Εισπράξεις
            </span>
            <span className="flex items-center gap-1 text-red-600">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              Δαπάνες
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="p-4 rounded-xl bg-green-50 border border-green-100">
            <div className="flex items-center gap-2 mb-1">
              <ArrowUpRight className="w-4 h-4 text-green-600" />
              <span className="text-sm text-green-700">Σύνολο Εισπράξεων</span>
            </div>
            <p className="text-xl font-bold text-green-700">{formatCurrency(totalIncome)}</p>
          </div>
          <div className="p-4 rounded-xl bg-red-50 border border-red-100">
            <div className="flex items-center gap-2 mb-1">
              <ArrowDownRight className="w-4 h-4 text-red-600" />
              <span className="text-sm text-red-700">Σύνολο Δαπανών</span>
            </div>
            <p className="text-xl font-bold text-red-700">{formatCurrency(totalExpenses)}</p>
          </div>
          <div className={`p-4 rounded-xl ${totalNet >= 0 ? 'bg-emerald-50 border-emerald-100' : 'bg-orange-50 border-orange-100'} border`}>
            <div className="flex items-center gap-2 mb-1">
              {totalNet >= 0 ? (
                <TrendingUp className="w-4 h-4 text-emerald-600" />
              ) : (
                <TrendingDown className="w-4 h-4 text-orange-600" />
              )}
              <span className={`text-sm ${totalNet >= 0 ? 'text-emerald-700' : 'text-orange-700'}`}>
                Καθαρό Αποτέλεσμα
              </span>
            </div>
            <p className={`text-xl font-bold ${totalNet >= 0 ? 'text-emerald-700' : 'text-orange-700'}`}>
              {formatCurrency(totalNet)}
            </p>
          </div>
        </div>

        {/* Simple Bar Chart */}
        <div className="space-y-4">
          {data.map((entry, index) => (
            <div key={index} className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-foreground">{entry.month}</span>
                <span className={`font-medium ${entry.net >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {entry.net >= 0 ? '+' : ''}{formatCurrency(entry.net)}
                </span>
              </div>
              <div className="flex gap-2 h-6">
                {/* Income Bar */}
                <div
                  className="bg-green-500 rounded-l-md transition-all duration-500"
                  style={{
                    width: `${(entry.income / maxValue) * 50}%`,
                    minWidth: entry.income > 0 ? '4px' : '0'
                  }}
                  title={`Εισπράξεις: ${formatCurrency(entry.income)}`}
                />
                {/* Expenses Bar */}
                <div
                  className="bg-red-500 rounded-r-md transition-all duration-500"
                  style={{
                    width: `${(entry.expenses / maxValue) * 50}%`,
                    minWidth: entry.expenses > 0 ? '4px' : '0'
                  }}
                  title={`Δαπάνες: ${formatCurrency(entry.expenses)}`}
                />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default CashFlowChart;
