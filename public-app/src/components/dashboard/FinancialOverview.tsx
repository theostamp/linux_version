'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, DollarSign, AlertTriangle } from 'lucide-react';
import { formatCurrency, formatPercentage } from '@/lib/design-system';
import type { DashboardOverview } from '@/hooks/useDashboardData';

interface FinancialOverviewProps {
  data?: DashboardOverview;
  loading?: boolean;
}

export function FinancialOverview({ data, loading = false }: FinancialOverviewProps) {
  const financialSummary = data?.financial_summary;
  
  if (loading) {
    return (
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Οικονομική Επισκόπηση</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-3">
                <div className="h-4 w-24 bg-gray-300 rounded" />
              </CardHeader>
              <CardContent>
                <div className="h-8 w-20 bg-gray-300 rounded mb-2" />
                <div className="h-3 w-32 bg-gray-300 rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }
  
  if (!financialSummary) {
    return null;
  }
  
  const totalReserve = financialSummary.total_reserve || 0;
  const totalPendingExpenses = financialSummary.total_pending_expenses || 0;
  const totalPendingObligations = financialSummary.total_pending_obligations || 0;
  const collectionRate = financialSummary.collection_rate || 0;
  
  return (
    <div className="mb-8">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">
        💰 Οικονομική Επισκόπηση
      </h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Total Reserve Card */}
        <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium text-blue-900">
              Συνολικό Αποθεματικό
            </CardTitle>
            <DollarSign className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-900">
              {formatCurrency(totalReserve)}
            </div>
            <p className="text-xs text-blue-700 mt-1">
              {totalReserve >= 0 ? (
                <span className="flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" />
                  Θετικό υπόλοιπο
                </span>
              ) : (
                <span className="flex items-center gap-1">
                  <TrendingDown className="h-3 w-3" />
                  Αρνητικό υπόλοιπο
                </span>
              )}
            </p>
          </CardContent>
        </Card>
        
        {/* Pending Expenses Card */}
        <Card className="border-orange-200 bg-gradient-to-br from-orange-50 to-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium text-orange-900">
              Ανέκδοτες Δαπάνες
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-900">
              {formatCurrency(totalPendingExpenses)}
            </div>
            <p className="text-xs text-orange-700 mt-1">
              Δεν έχουν εκδοθεί
            </p>
          </CardContent>
        </Card>
        
        {/* Collection Rate Card */}
        <Card className="border-green-200 bg-gradient-to-br from-green-50 to-white">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium text-green-900">
              Ποσοστό Είσπραξης
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-900">
              {formatPercentage(collectionRate)}
            </div>
            <p className="text-xs text-green-700 mt-1">
              Οφειλές: {formatCurrency(totalPendingObligations)}
            </p>
            {/* Progress Bar */}
            <div className="mt-3 w-full bg-green-200 rounded-full h-2">
              <div
                className="bg-green-600 h-2 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(collectionRate, 100)}%` }}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default FinancialOverview;


