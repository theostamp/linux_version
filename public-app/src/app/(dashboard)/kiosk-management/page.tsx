'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Monitor, Settings, Eye, Plus, BarChart3, Activity, AlertCircle, RefreshCw } from 'lucide-react';
import AuthGate from '@/components/AuthGate';
import { useBuilding } from '@/components/contexts/BuildingContext';
import { BentoGrid, BentoGridItem } from '@/components/ui/bento-grid';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { Card } from '@/components/ui/card';
import { StatCard } from '@/components/ui/stat-card';

export default function KioskManagementPage() {
  return (
    <AuthGate role="any">
      <KioskManagementContent />
    </AuthGate>
  );
}

interface KioskStats {
  totalWidgets: number;
  enabledWidgets: number;
  totalScenes: number;
  enabledScenes: number;
  lastUpdated: Date;
}

function KioskManagementContent() {
  const { currentBuilding, selectedBuilding, buildings, isLoading: isBuildingLoading, isLoadingContext } = useBuilding();
  const building = selectedBuilding || currentBuilding;

  const [stats, setStats] = useState<KioskStats | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch kiosk statistics
  const fetchStats = async () => {
    if (!building?.id) {
      setIsLoadingStats(false);
      return;
    }

    try {
      setError(null);
      setIsLoadingStats(true);

      // Fetch widgets and scenes in parallel
      const [widgetsRes, scenesRes] = await Promise.all([
        api.get(`/api/kiosk/configs/?building_id=${building.id}`),
        api.get(`/api/kiosk/scenes/?building_id=${building.id}`)
      ]);

      const widgets = widgetsRes.data.widgets || [];
      const scenes = scenesRes.data.scenes || [];

      const enabledWidgets = widgets.filter((w: any) => w.enabled).length;
      const enabledScenes = scenes.filter((s: any) => s.isEnabled).length;

      setStats({
        totalWidgets: widgets.length,
        enabledWidgets,
        totalScenes: scenes.length,
        enabledScenes,
        lastUpdated: new Date(),
      });
    } catch (err: any) {
      console.error('Failed to fetch kiosk stats:', err);
      setError(err.response?.data?.detail || 'Αποτυχία φόρτωσης στατιστικών');
      toast.error('Αποτυχία φόρτωσης στατιστικών kiosk');
    } finally {
      setIsLoadingStats(false);
    }
  };

  // Handle manual refresh
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchStats();
    setIsRefreshing(false);
    toast.success('Τα στατιστικά ενημερώθηκαν');
  };

  // Fetch stats when building changes
  useEffect(() => {
    if (!isBuildingLoading && !isLoadingContext && building?.id) {
      fetchStats();
    }
  }, [building?.id, isBuildingLoading, isLoadingContext]);

  // Show loading skeleton
  if (isBuildingLoading || isLoadingContext) {
    return <LoadingSkeleton />;
  }

  // Show error state
  if (error && !stats) {
    return <ErrorState error={error} onRetry={fetchStats} />;
  }

  // Show empty state if no building selected
  if (!building) {
    return <EmptyBuildingState />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-card rounded-xl p-6 border border-slate-200/50 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="page-title mb-2 flex items-center">
              <Monitor className="w-8 h-8 mr-3 text-accent-primary" />
              Kiosk Management
            </h1>
            <p className="text-muted-foreground">
              Διαχείριση και παραμετροποίηση του συστήματος kiosk
            </p>
          </div>
          <div className="flex items-center gap-4 bg-secondary/20 p-3 rounded-lg border border-slate-200/50">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Τρέχον Κτίριο</p>
              <p className="text-base font-bold text-foreground">{building.name}</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="ml-auto"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              Ανανέωση
            </Button>
          </div>
        </div>
      </div>

      {/* Bento Grid Layout */}
      <BentoGrid className="max-w-[1920px] auto-rows-auto gap-4">

        {/* Row 1: Stats */}
        {isLoadingStats ? (
          // Using Bento Items for skeleton to maintain layout
          [1, 2, 3, 4].map(i => (
            <BentoGridItem key={i} className="col-span-1" header={<Skeleton className="h-24 w-full" />} />
          ))
        ) : (
          <>
            <StatCard
              title="Ενεργά Scenes"
              value={stats?.enabledScenes || 0}
              subtitle={`από ${stats?.totalScenes || 0} σύνολο`}
              icon={<Monitor className="w-5 h-5" />}
              color="purple"
            />
            <StatCard
              title="Ενεργά Widgets"
              value={stats?.enabledWidgets || 0}
              subtitle={`από ${stats?.totalWidgets || 0} σύνολο`}
              icon={<Settings className="w-5 h-5" />}
              color="info"
            />
            <StatCard
              title="Κτίρια"
              value={buildings.length}
              subtitle="διαθέσιμα"
              icon={<BarChart3 className="w-5 h-5" />}
              color="success"
            />
            <StatCard
              title="Τελευταία Ενημέρωση"
              value={stats?.lastUpdated.toLocaleTimeString('el-GR', { hour: '2-digit', minute: '2-digit' }) || '--:--'}
              subtitle={stats?.lastUpdated.toLocaleDateString('el-GR')}
              icon={<Activity className="w-5 h-5" />}
              color="default"
            />
          </>
        )}

        {/* Row 2: Main Actions */}
        <BentoGridItem
          className="md:col-span-2"
          title="Γρήγορη Ρύθμιση με Scenes"
          description="Χρησιμοποιήστε έτοιμα templates για άμεση εμφάνιση"
          header={
            <div className="flex gap-3 mt-4">
              <Button asChild className="flex-1 bg-purple-600 hover:bg-purple-700 text-white">
                <Link href="/kiosk-management/scenes">
                  <Eye className="w-4 h-4 mr-2" />
                  Διαχείριση Scenes
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/kiosk-management/preview">
                  <Monitor className="w-4 h-4 mr-2" />
                  Preview
                </Link>
              </Button>
            </div>
          }
          icon={<Monitor className="w-4 h-4 text-purple-500" />}
        />

        <BentoGridItem
          className="md:col-span-2"
          title="Προχωρημένη Προσαρμογή"
          description="Δημιουργήστε custom εμφάνιση με ξεχωριστά widgets"
          header={
            <div className="flex gap-3 mt-4">
              <Button asChild className="flex-1" variant="outline">
                <Link href="/kiosk-management/widgets">
                  <Settings className="w-4 h-4 mr-2" />
                  Widgets
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/kiosk-management/widgets/create">
                  <Plus className="w-4 h-4 mr-2" />
                  Νέο Widget
                </Link>
              </Button>
            </div>
          }
          icon={<Settings className="w-4 h-4 text-blue-500" />}
        />

        {/* Row 3: Secondary Actions & Activity */}
        <BentoGridItem
          className="md:col-span-1"
          title="Live Preview"
          description="Προεπισκόπηση display"
          header={
            <Link href="/kiosk-management/preview" className="block mt-2 group">
              <div className="flex items-center justify-center p-4 bg-green-50 dark:bg-green-900/10 rounded-lg border border-green-100 dark:border-green-900/30 group-hover:bg-green-100 dark:group-hover:bg-green-900/20 transition-colors">
                <Eye className="w-8 h-8 text-green-600 dark:text-green-400" />
              </div>
            </Link>
          }
        />

        <BentoGridItem
          className="md:col-span-1"
          title="Ρυθμίσεις"
          description="Γενικές ρυθμίσεις"
          header={
            <Link href="/kiosk-management/settings" className="block mt-2 group">
              <div className="flex items-center justify-center p-4 bg-orange-50 dark:bg-orange-900/10 rounded-lg border border-orange-100 dark:border-orange-900/30 group-hover:bg-orange-100 dark:group-hover:bg-orange-900/20 transition-colors">
                <Settings className="w-8 h-8 text-orange-600 dark:text-orange-400" />
              </div>
            </Link>
          }
        />

        <BentoGridItem
          className="md:col-span-1"
          title="Public Kiosk"
          description="Άνοιγμα σε νέο tab"
          header={
            <Link href="/kiosk" target="_blank" className="block mt-2 group">
              <div className="flex items-center justify-center p-4 bg-purple-50 dark:bg-purple-900/10 rounded-lg border border-purple-100 dark:border-purple-900/30 group-hover:bg-purple-100 dark:group-hover:bg-purple-900/20 transition-colors">
                <Monitor className="w-8 h-8 text-purple-600 dark:text-purple-400" />
              </div>
            </Link>
          }
        />

        <BentoGridItem
          className="md:col-span-1"
          title="Δραστηριότητα"
          description="Πρόσφατες ενημερώσεις"
          header={
            <div className="space-y-2 mt-2 text-sm">
              {stats && stats.totalWidgets > 0 ? (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <span>{stats.enabledWidgets} widgets ενεργά</span>
                </div>
              ) : (
                <span className="text-muted-foreground">Καμία δραστηριότητα</span>
              )}
            </div>
          }
        />

      </BentoGrid>
    </div>
  );
}

// Loading Skeleton for the entire page
function LoadingSkeleton() {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header Skeleton */}
      <Card className="p-6 bg-gradient-to-r from-purple-100 to-purple-200">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <Skeleton className="h-8 w-3/4 mb-2 bg-purple-300" />
            <Skeleton className="h-4 w-1/2 bg-purple-300" />
          </div>
          <div className="text-right">
            <Skeleton className="h-4 w-24 mb-2 bg-purple-300 ml-auto" />
            <Skeleton className="h-6 w-32 bg-purple-300 ml-auto" />
          </div>
        </div>
      </Card>

      {/* Stats Skeleton */}
      <StatsLoadingSkeleton />

      {/* Actions Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="p-6">
            <div className="text-center">
              <Skeleton className="w-12 h-12 rounded-xl mx-auto mb-4" />
              <Skeleton className="h-5 w-3/4 mx-auto mb-2" />
              <Skeleton className="h-4 w-full mx-auto" />
            </div>
          </Card>
        ))}
      </div>

      {/* Activity Skeleton */}
      <Card className="p-6">
        <Skeleton className="h-6 w-48 mb-4" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3 flex-1">
                <Skeleton className="w-2 h-2 rounded-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
              <Skeleton className="h-3 w-20" />
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

// Stats Loading Skeleton
function StatsLoadingSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {[1, 2, 3, 4].map((i) => (
        <Card key={i} className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <Skeleton className="h-4 w-24 mb-2" />
              <Skeleton className="h-8 w-16 mb-1" />
              <Skeleton className="h-3 w-20" />
            </div>
            <Skeleton className="w-8 h-8 rounded-lg" />
          </div>
        </Card>
      ))}
    </div>
  );
}

// Error State Component
function ErrorState({ error, onRetry }: { error: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
        <AlertCircle className="w-8 h-8 text-red-600" />
      </div>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Σφάλμα Φόρτωσης</h2>
      <p className="text-gray-600 mb-6 max-w-md">{error}</p>
      <Button onClick={onRetry} className="gap-2">
        <RefreshCw className="w-4 h-4" />
        Δοκιμάστε Ξανά
      </Button>
    </div>
  );
}

// Empty Building State Component
function EmptyBuildingState() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
        <Monitor className="w-8 h-8 text-gray-400" />
      </div>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Δεν έχει επιλεγεί κτίριο</h2>
      <p className="text-gray-600 mb-6 max-w-md">
        Παρακαλώ επιλέξτε ένα κτίριο από το μενού για να δείτε τις ρυθμίσεις kiosk.
      </p>
      <Link href="/buildings">
        <Button className="gap-2">
          <BarChart3 className="w-4 h-4" />
          Προβολή Κτιρίων
        </Button>
      </Link>
    </div>
  );
}
