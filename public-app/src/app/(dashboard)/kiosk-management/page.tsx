'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Monitor, Settings, Eye, Plus, BarChart3, Activity, AlertCircle, RefreshCw } from 'lucide-react';
import AuthGate from '@/components/AuthGate';
import { useBuilding } from '@/components/contexts/BuildingContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { api } from '@/lib/api';
import { toast } from 'sonner';

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
      <div className="bg-gradient-to-r from-purple-600 to-purple-700 rounded-xl p-6 text-white shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2 flex items-center">
              <Monitor className="w-8 h-8 mr-3" />
              Kiosk Management Dashboard
            </h1>
            <p className="text-purple-100">
              Διαχείριση και παραμετροποίηση του συστήματος kiosk για όλα τα κτίρια
            </p>
          </div>
          <div className="text-right flex flex-col gap-2">
            <div>
              <p className="text-sm text-purple-200">Τρέχον Κτίριο</p>
              <p className="text-lg font-semibold">{building.name}</p>
            </div>
            <Button 
              variant="secondary" 
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

      {/* Statistics Cards */}
      {isLoadingStats ? (
        <StatsLoadingSkeleton />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-6 hover:shadow-md transition-all duration-300 animate-in fade-in slide-in-from-bottom-4 fill-mode-backwards" style={{ animationDelay: '0ms' }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Ενεργά Scenes</p>
                <p className="text-3xl font-bold text-purple-600 tabular-nums">{stats?.enabledScenes || 0}</p>
                <p className="text-xs text-gray-500 mt-1">από {stats?.totalScenes || 0} σύνολο</p>
              </div>
              <div className="bg-purple-100 p-3 rounded-lg">
                <Monitor className="w-8 h-8 text-purple-600" />
              </div>
            </div>
          </Card>
          <Card className="p-6 hover:shadow-md transition-all duration-300 animate-in fade-in slide-in-from-bottom-4 fill-mode-backwards" style={{ animationDelay: '100ms' }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Ενεργά Widgets</p>
                <p className="text-3xl font-bold text-blue-600 tabular-nums">{stats?.enabledWidgets || 0}</p>
                <p className="text-xs text-gray-500 mt-1">από {stats?.totalWidgets || 0} σύνολο</p>
              </div>
              <div className="bg-blue-100 p-3 rounded-lg">
                <Settings className="w-8 h-8 text-blue-600" />
              </div>
            </div>
          </Card>
          <Card className="p-6 hover:shadow-md transition-all duration-300 animate-in fade-in slide-in-from-bottom-4 fill-mode-backwards" style={{ animationDelay: '200ms' }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Κτίρια</p>
                <p className="text-3xl font-bold text-green-600 tabular-nums">{buildings.length}</p>
                <p className="text-xs text-gray-500 mt-1">διαθέσιμα</p>
              </div>
              <div className="bg-green-100 p-3 rounded-lg">
                <BarChart3 className="w-8 h-8 text-green-600" />
              </div>
            </div>
          </Card>
          <Card className="p-6 hover:shadow-md transition-all duration-300 animate-in fade-in slide-in-from-bottom-4 fill-mode-backwards" style={{ animationDelay: '300ms' }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Τελευταία Ενημέρωση</p>
                <p className="text-sm font-bold text-gray-700 tabular-nums">
                  {stats?.lastUpdated.toLocaleTimeString('el-GR', { hour: '2-digit', minute: '2-digit' })}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {stats?.lastUpdated.toLocaleDateString('el-GR')}
                </p>
              </div>
              <div className="bg-green-100 p-3 rounded-lg">
                <div className="w-4 h-4 bg-green-500 rounded-full animate-pulse" />
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link href="/kiosk-management/widgets" className="group">
          <Card className="p-6 hover:shadow-lg transition-all duration-300 group-hover:scale-[1.02] border-2 border-transparent hover:border-purple-200 cursor-pointer">
            <div className="text-center">
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:bg-purple-600 transition-all duration-300">
                <Settings className="w-6 h-6 text-purple-600 group-hover:text-white transition-colors duration-300" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2 group-hover:text-purple-600 transition-colors">Διαχείριση Widgets</h3>
              <p className="text-sm text-gray-600 group-hover:text-gray-700 transition-colors">Προσθήκη, επεξεργασία και διαγραφή widgets</p>
            </div>
          </Card>
        </Link>
        <Link href="/kiosk-management/widgets/create" className="group">
          <Card className="p-6 hover:shadow-lg transition-all duration-300 group-hover:scale-[1.02] border-2 border-transparent hover:border-blue-200 cursor-pointer">
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:bg-blue-600 transition-all duration-300">
                <Plus className="w-6 h-6 text-blue-600 group-hover:text-white transition-colors duration-300" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">Δημιουργία Widget</h3>
              <p className="text-sm text-gray-600 group-hover:text-gray-700 transition-colors">Δημιουργία νέου custom widget</p>
            </div>
          </Card>
        </Link>
        <Link href="/kiosk-management/preview" className="group">
          <Card className="p-6 hover:shadow-lg transition-all duration-300 group-hover:scale-[1.02] border-2 border-transparent hover:border-green-200 cursor-pointer">
            <div className="text-center">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:bg-green-600 transition-all duration-300">
                <Eye className="w-6 h-6 text-green-600 group-hover:text-white transition-colors duration-300" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2 group-hover:text-green-600 transition-colors">Live Preview</h3>
              <p className="text-sm text-gray-600 group-hover:text-gray-700 transition-colors">Προεπισκόπηση του kiosk display</p>
            </div>
          </Card>
        </Link>
        <Link href="/kiosk-management/settings" className="group">
          <Card className="p-6 hover:shadow-lg transition-all duration-300 group-hover:scale-[1.02] border-2 border-transparent hover:border-orange-200 cursor-pointer">
            <div className="text-center">
              <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:bg-orange-600 transition-all duration-300">
                <Settings className="w-6 h-6 text-orange-600 group-hover:text-white transition-colors duration-300" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2 group-hover:text-orange-600 transition-colors">Ρυθμίσεις</h3>
              <p className="text-sm text-gray-600 group-hover:text-gray-700 transition-colors">Γενικές ρυθμίσεις kiosk</p>
            </div>
          </Card>
        </Link>
      </div>

      {/* Recent Activity */}
      <Card className="p-6 hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <Activity className="w-5 h-5 text-purple-600" />
            Πρόσφατη Δραστηριότητα
          </h2>
          {stats && (
            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
              Τελευταία ενημέρωση: {stats.lastUpdated.toLocaleTimeString('el-GR', { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>
        <div className="space-y-3">
          {stats && stats.totalWidgets > 0 ? (
            <>
              <div className="flex items-center justify-between p-3 bg-gradient-to-r from-green-50 to-green-100/50 rounded-lg border border-green-200 hover:border-green-300 transition-colors">
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-sm text-gray-700">
                    <strong>{stats.enabledWidgets}</strong> widgets ενεργά στο κτίριο <strong>{building.name}</strong>
                  </span>
                </div>
                <span className="text-xs text-gray-500 bg-white px-2 py-1 rounded">τώρα</span>
              </div>
              {stats.totalScenes > 0 && (
                <div className="flex items-center justify-between p-3 bg-gradient-to-r from-blue-50 to-blue-100/50 rounded-lg border border-blue-200 hover:border-blue-300 transition-colors">
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                    <span className="text-sm text-gray-700">
                      <strong>{stats.enabledScenes}</strong> scenes διαμορφωμένα και έτοιμα προς χρήση
                    </span>
                  </div>
                  <span className="text-xs text-gray-500 bg-white px-2 py-1 rounded">τώρα</span>
                </div>
              )}
              <div className="flex items-center justify-between p-3 bg-gradient-to-r from-purple-50 to-purple-100/50 rounded-lg border border-purple-200 hover:border-purple-300 transition-colors">
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-purple-500 rounded-full" />
                  <span className="text-sm text-gray-700">
                    Σύστημα kiosk ενεργό για το κτίριο <strong>{building.name}</strong>
                  </span>
                </div>
                <span className="text-xs text-gray-500 bg-white px-2 py-1 rounded">τώρα</span>
              </div>
            </>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Activity className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm">Δεν υπάρχει πρόσφατη δραστηριότητα</p>
              <p className="text-xs mt-1">Δημιουργήστε το πρώτο σας widget για να ξεκινήσετε</p>
            </div>
          )}
        </div>
      </Card>

      <Card className="p-6 bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200 shadow-sm">
        <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
          <Monitor className="w-6 h-6 mr-2 text-blue-600" />
          Πρόσβαση στο Public Kiosk
        </h2>
        <p className="text-gray-600 mb-4">
          Το public kiosk είναι διαθέσιμο σε όλους τους κατοίκους χωρίς ανάγκη σύνδεσης.
        </p>
        <div className="flex flex-wrap gap-3">
          <Button asChild>
            <Link href="/kiosk" target="_blank">
              <Eye className="w-4 h-4 mr-2" />
              Άνοιγμα Public Kiosk
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/kiosk-management/preview">
              <Monitor className="w-4 h-4 mr-2" />
              Management Preview
            </Link>
          </Button>
        </div>
      </Card>
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
