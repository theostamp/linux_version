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
      <div className="mb-8 rounded-2xl border border-border bg-card/50 p-4 md:p-6">
        <h2 className="text-xl font-semibold text-foreground mb-4">Οικονομική Επισκόπηση</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse bg-card border border-border">
              <CardHeader className="pb-3">
                <div className="h-4 w-24 rounded bg-muted" />
              </CardHeader>
              <CardContent>
                <div className="h-8 w-20 rounded mb-2 bg-muted" />
                <div className="h-3 w-32 rounded bg-muted" />
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
    <div className="mb-8 rounded-2xl border border-border bg-card/50 p-4 md:p-6">
      <h2 className="text-xl font-semibold text-foreground mb-4">
        💰 Οικονομική Επισκόπηση
      </h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total Reserve Card */}
        <Card className="bg-card border border-border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium text-foreground">
              Συνολικό Αποθεματικό
            </CardTitle>
            <DollarSign className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {formatCurrency(totalReserve)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {totalReserve >= 0 ? (
                <span className="flex items-center gap-1">
                  <TrendingUp className="h-3 w-3 text-primary" />
                  Θετικό υπόλοιπο
                </span>
              ) : (
                <span className="flex items-center gap-1">
                  <TrendingDown className="h-3 w-3 text-destructive" />
                  Αρνητικό υπόλοιπο
                </span>
              )}
            </p>
          </CardContent>
        </Card>
        
        {/* Pending Expenses Card */}
        <Card className="bg-card border border-border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium text-foreground">
              Ανέκδοτες Δαπάνες
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {formatCurrency(totalPendingExpenses)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Δεν έχουν εκδοθεί
            </p>
          </CardContent>
        </Card>
        
        {/* Collection Rate Card */}
        <Card className="bg-card border border-border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-medium text-foreground">
              Ποσοστό Είσπραξης
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {formatPercentage(collectionRate)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Οφειλές: {formatCurrency(totalPendingObligations)}
            </p>
            {/* Progress Bar */}
            <div className="mt-3 w-full rounded-full h-2 bg-primary/20">
              <div
                className="rounded-full h-2 bg-primary transition-all duration-500"
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


