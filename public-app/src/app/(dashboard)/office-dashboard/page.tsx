'use client';

import React from 'react';
import { Loader2, LayoutDashboard, RefreshCw } from 'lucide-react';
import { useAuth } from '@/components/contexts/AuthContext';
import { useOfficeDashboard } from '@/hooks/useOfficeDashboard';
import AuthGate from '@/components/AuthGate';
import SubscriptionGate from '@/components/SubscriptionGate';
import { Button } from '@/components/ui/button';
import {
  AlertsPanel,
  PendingTasksList,
  PortfolioSnapshot,
  PremiumMixCard,
  OccupancyCard,
  CityDistributionCard,
  ResidentSearchCard,
  BuildingDirectoryCard,
} from '@/components/office-dashboard';

function OfficeDashboardContent() {
  const { user, isLoading: authLoading, isAuthReady } = useAuth();
  const { data, isLoading, isError, error, refetch } = useOfficeDashboard();
  const portfolioInsights = data?.portfolio_insights;
  const operationalAlerts = data?.alerts?.filter((alert) => alert.category !== 'financial');

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
          <LayoutDashboard className="h-16 w-16 text-destructive mx-auto mb-4" />
          <h2 className="page-title-sm mb-2">Σφάλμα φόρτωσης</h2>
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
          <h1 className="page-title flex items-center gap-3">
            <LayoutDashboard className="w-8 h-8 text-primary" />
            Εποπτεία Χαρτοφυλακίου
          </h1>
          <p className="text-muted-foreground mt-1">
            Συγκεντρωτική εικόνα κτιρίων, κατοίκων και λειτουργικών δεικτών
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            Εδώ βλέπετε το χαρτοφυλάκιό σας χωρίς οικονομική λεπτομέρεια
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

      {/* Operational Alerts */}
      {operationalAlerts && operationalAlerts.length > 0 && (
        <div className="mb-8">
          <AlertsPanel data={operationalAlerts} loading={isLoading} />
        </div>
      )}

      {/* Portfolio Snapshot */}
      <div className="mb-8">
        <PortfolioSnapshot data={portfolioInsights} loading={isLoading} />
      </div>

      {/* Insights Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <PremiumMixCard data={portfolioInsights} loading={isLoading} />
        <OccupancyCard data={portfolioInsights} loading={isLoading} />
        <CityDistributionCard data={portfolioInsights} loading={isLoading} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-8">
        <ResidentSearchCard />
        <BuildingDirectoryCard data={portfolioInsights} loading={isLoading} />
      </div>

      <div className="mb-8">
        <PendingTasksList data={data?.pending_tasks} loading={isLoading} />
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
