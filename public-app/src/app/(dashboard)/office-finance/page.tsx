'use client';

import React, { useState } from 'react';
import { 
  Wallet, 
  Download, 
  RefreshCw,
  AlertCircle,
  Settings,
  TrendingUp,
  TrendingDown
} from 'lucide-react';
import { AuthGate } from '@/components/AuthGate';
import { SubscriptionGate } from '@/components/SubscriptionGate';
import { DashboardErrorBoundary } from '@/components/DashboardErrorBoundary';
import { 
  FinanceSummaryCards,
  IncomeByBuildingChart,
  ExpensesByCategoryChart,
  YearlyChart,
  RecentTransactions
} from '@/components/office-finance';
import { 
  useOfficeFinanceDashboard,
  useYearlySummary,
  useMarkIncomeReceived,
  useInitializeCategories
} from '@/hooks/useOfficeFinance';

function OfficeFinanceContent() {
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  
  const { 
    data: dashboardData, 
    isLoading: isDashboardLoading, 
    isError,
    error,
    refetch 
  } = useOfficeFinanceDashboard();
  
  const { 
    data: yearlySummary, 
    isLoading: isYearlyLoading 
  } = useYearlySummary(selectedYear);
  
  const markReceivedMutation = useMarkIncomeReceived();
  const initCategoriesMutation = useInitializeCategories();

  const handleMarkReceived = async (id: number) => {
    try {
      await markReceivedMutation.mutateAsync({ id });
    } catch (error) {
      console.error('Failed to mark income as received:', error);
    }
  };

  const handleInitCategories = async () => {
    try {
      await initCategoriesMutation.mutateAsync();
    } catch (error) {
      console.error('Failed to initialize categories:', error);
    }
  };

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <AlertCircle className="w-16 h-16 text-rose-400 mb-4" />
        <h2 className="text-xl font-semibold text-white mb-2">Σφάλμα φόρτωσης</h2>
        <p className="text-slate-400 mb-4">
          {error?.message || 'Δεν ήταν δυνατή η φόρτωση των οικονομικών στοιχείων'}
        </p>
        <button
          onClick={() => refetch()}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Επανάληψη
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="bg-gradient-to-br from-violet-500 to-purple-600 p-3 rounded-xl shadow-lg shadow-violet-500/20">
            <Wallet className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Οικονομικά Γραφείου</h1>
            <p className="text-slate-400">Διαχείριση εσόδων και εξόδων του γραφείου διαχείρισης</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={handleInitCategories}
            disabled={initCategoriesMutation.isPending}
            className="px-3 py-2 text-sm bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
            title="Αρχικοποίηση προεπιλεγμένων κατηγοριών"
          >
            <Settings className="w-4 h-4" />
            <span className="hidden sm:inline">Κατηγορίες</span>
          </button>
          
          <button
            onClick={() => refetch()}
            disabled={isDashboardLoading}
            className="px-3 py-2 text-sm bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isDashboardLoading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Ανανέωση</span>
          </button>
          
          <button className="px-3 py-2 text-sm bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg transition-colors flex items-center gap-2">
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Εξαγωγή</span>
          </button>
          
          <div className="flex gap-2">
            <button className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors flex items-center gap-2 shadow-lg shadow-emerald-500/20">
              <TrendingUp className="w-4 h-4" />
              <span>Νέο Έσοδο</span>
            </button>
            <button className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg transition-colors flex items-center gap-2 shadow-lg shadow-rose-500/20">
              <TrendingDown className="w-4 h-4" />
              <span>Νέο Έξοδο</span>
            </button>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <FinanceSummaryCards
        currentMonth={dashboardData?.current_month || null}
        previousMonth={dashboardData?.previous_month || null}
      />

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Income by Building */}
        <IncomeByBuildingChart
          data={dashboardData?.income_by_building || null}
          isLoading={isDashboardLoading}
        />

        {/* Expenses by Category */}
        <ExpensesByCategoryChart
          data={dashboardData?.expenses_by_category || null}
          isLoading={isDashboardLoading}
        />
      </div>

      {/* Yearly Chart */}
      <YearlyChart
        data={yearlySummary || dashboardData?.yearly_summary || null}
        isLoading={isDashboardLoading || isYearlyLoading}
        onYearChange={setSelectedYear}
      />

      {/* Recent Transactions */}
      <RecentTransactions
        recentExpenses={dashboardData?.recent_expenses || null}
        recentIncomes={dashboardData?.recent_incomes || null}
        pendingIncomes={dashboardData?.pending_incomes || null}
        isLoading={isDashboardLoading}
        onMarkReceived={handleMarkReceived}
      />

      {/* Quick Stats Footer */}
      {dashboardData && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-slate-800/30 rounded-xl border border-slate-700/50">
          <div className="text-center">
            <p className="text-2xl font-bold text-white">
              {dashboardData.income_by_building?.length || 0}
            </p>
            <p className="text-sm text-slate-400">Κτίρια με έσοδα</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-white">
              {dashboardData.expenses_by_category?.reduce((sum, c) => sum + c.count, 0) || 0}
            </p>
            <p className="text-sm text-slate-400">Έξοδα μήνα</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-amber-400">
              {dashboardData.pending_incomes?.length || 0}
            </p>
            <p className="text-sm text-slate-400">Εκκρεμή έσοδα</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-emerald-400">
              {dashboardData.yearly_summary?.monthly_data?.filter(m => m.net > 0).length || 0}/12
            </p>
            <p className="text-sm text-slate-400">Κερδοφόροι μήνες</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default function OfficeFinancePage() {
  return (
    <AuthGate requiredRoles={['manager', 'staff', 'superuser']}>
      <SubscriptionGate requiredFeature="office_finance">
        <DashboardErrorBoundary>
          <div className="p-6">
            <OfficeFinanceContent />
          </div>
        </DashboardErrorBoundary>
      </SubscriptionGate>
    </AuthGate>
  );
}

