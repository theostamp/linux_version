'use client';

import React from 'react';
import { Loader2, LayoutDashboard, RefreshCw } from 'lucide-react';
import { useAuth } from '@/components/contexts/AuthContext';
import { useOfficeDashboard } from '@/hooks/useOfficeDashboard';
import AuthGate from '@/components/AuthGate';
import SubscriptionGate from '@/components/SubscriptionGate';
import { Button } from '@/components/ui/button';
import {
  PortfolioMetrics,
  BuildingsStatusTable,
  TopDebtorsCard,
  AlertsPanel,
  PendingTasksList,
  CashFlowChart,
} from '@/components/office-dashboard';

function OfficeDashboardContent() {
  const { user, isLoading: authLoading, isAuthReady } = useAuth();
  const { data, isLoading, isError, error, refetch } = useOfficeDashboard();

  if (!isAuthReady || authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-12 w-12 text-primary animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Φόρτωση...</p>
        </div>
      </div>
    );
  }

  // Check role
  const allowedRoles = ['manager', 'staff', 'superuser', 'internal_manager'];
  if (!user?.role || !allowedRoles.includes(user.role)) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <LayoutDashboard className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-foreground mb-2">Δεν έχετε πρόσβαση</h2>
          <p className="text-muted-foreground">
            Το Office Dashboard είναι διαθέσιμο μόνο για διαχειριστές.
          </p>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <LayoutDashboard className="h-16 w-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-foreground mb-2">Σφάλμα φόρτωσης</h2>
          <p className="text-muted-foreground mb-4">
            {error instanceof Error ? error.message : 'Αδυναμία φόρτωσης δεδομένων'}
          </p>
          <Button onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Επανάληψη
          </Button>
        </div>
      </div>
    );
  }

  return (
    <main className="px-4 py-6 md:px-8 lg:px-12 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-condensed flex items-center gap-3">
            <LayoutDashboard className="w-8 h-8 text-primary" />
            Κέντρο Ελέγχου Γραφείου
          </h1>
          <p className="text-muted-foreground mt-1">
            Συγκεντρωτική εικόνα όλων των κτιρίων και οικονομικών στοιχείων
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            Εδώ βλέπετε την συνολική εικόνα όλων των κτιρίων που διαχειρίζεστε
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => refetch()}
            disabled={isLoading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Ανανέωση
          </Button>
          {data?.generated_at && (
            <span className="text-xs text-muted-foreground">
              Τελευταία ενημέρωση: {new Date(data.generated_at).toLocaleTimeString('el-GR')}
            </span>
          )}
        </div>
      </div>

      {/* Alerts Panel - Top Priority */}
      {data?.alerts && data.alerts.length > 0 && (
        <div className="mb-8">
          <AlertsPanel data={data.alerts} loading={isLoading} />
        </div>
      )}

      {/* Portfolio Metrics */}
      <div className="mb-8">
        <PortfolioMetrics data={data?.overview} loading={isLoading} />
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mb-8">
        {/* Left Column */}
        <div className="space-y-8">
          <BuildingsStatusTable data={data?.buildings} loading={isLoading} />
          <PendingTasksList data={data?.pending_tasks} loading={isLoading} />
        </div>

        {/* Right Column */}
        <div className="space-y-8">
          <TopDebtorsCard data={data?.top_debtors} loading={isLoading} />
          <CashFlowChart data={data?.cash_flow} loading={isLoading} />
        </div>
      </div>
    </main>
  );
}

export default function OfficeDashboardPage() {
  return (
    <AuthGate role="any">
      <SubscriptionGate requiredStatus="any">
        <OfficeDashboardContent />
      </SubscriptionGate>
    </AuthGate>
  );
}

