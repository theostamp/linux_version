'use client';

import { Building, Loader2 } from 'lucide-react';
import { useAuth } from '@/components/contexts/AuthContext';
import { useBuilding } from '@/components/contexts/BuildingContext';
import { useBuildings } from '@/hooks/useBuildings';
import { useAnnouncements } from '@/hooks/useAnnouncements';
import AnnouncementsCarousel from '@/components/AnnouncementsCarousel';
import ErrorMessage from '@/components/ErrorMessage';
import AuthGate from '@/components/AuthGate';
import SubscriptionGate from '@/components/SubscriptionGate';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import useDashboardData from '@/hooks/useDashboardData';
import { 
  HeroSection, 
  FinancialOverview, 
  QuickActionsGrid, 
  ActivityFeed, 
  BuildingHealthCards,
  DashboardErrorBoundary 
} from '@/components/dashboard';

function DashboardContent() {
  const { user, isLoading: authLoading, isAuthReady } = useAuth();
  const { selectedBuilding, buildings } = useBuilding();
  const { data: buildingsData, isLoading: buildingsLoading } = useBuildings();
  const { data: announcements = [], isLoading: announcementsLoading } = useAnnouncements(selectedBuilding?.id);
  
  // Use the new centralized dashboard data hook
  // Fetch data for all buildings (overall summary)
  const { data: dashboardData, isLoading: dashboardLoading, isError, error: dashboardError } = useDashboardData();
  
  // Fetch data for selected building only
  const { data: buildingDashboardData, isLoading: buildingDashboardLoading } = useDashboardData(selectedBuilding?.id);

  const isLoading = authLoading || buildingsLoading || announcementsLoading || dashboardLoading;

  if (!isAuthReady || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-12 w-12 text-primary animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Φόρτωση dashboard...</p>
        </div>
      </div>
    );
  }

  if (isError && dashboardError) {
    console.error('Dashboard error:', dashboardError);
    // Don't block the entire page for dashboard errors - show partial data
  }

  const effectiveBuildings = buildingsData || buildings || [];

  return (
    <main>
      {/* Section 1: Όλα τα Κτίρια - Overall Summary */}
      <div className="mb-12">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-foreground mb-2">Όλα τα Κτίρια</h2>
          <p className="text-muted-foreground">Συγκεντρωτικά στοιχεία από όλα τα κτίρια</p>
        </div>

        {/* Hero Section with Key Metrics - All Buildings */}
        <HeroSection data={dashboardData} loading={dashboardLoading} />

        {/* Financial Overview - All Buildings */}
        <FinancialOverview data={dashboardData} loading={dashboardLoading} />
      </div>

      {/* Section 2: Επιλεγμένο Κτίριο - Selected Building Only */}
      {selectedBuilding && (
        <div className="mb-12 border-t-4 border-primary pt-8">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-foreground mb-2">{selectedBuilding.name}</h2>
            <p className="text-muted-foreground">{selectedBuilding.address}</p>
          </div>

          {/* Hero Section with Key Metrics - Selected Building */}
          <HeroSection data={buildingDashboardData} loading={buildingDashboardLoading} showWelcome={false} />

          {/* Financial Overview - Selected Building */}
          <FinancialOverview data={buildingDashboardData} loading={buildingDashboardLoading} />
        </div>
      )}

      {/* Quick Actions Grid */}
      <QuickActionsGrid data={dashboardData} loading={dashboardLoading} />

      {/* Activity Feed */}
      <ActivityFeed data={dashboardData} loading={dashboardLoading} />

      {/* Building Health Cards */}
      <BuildingHealthCards data={dashboardData} loading={dashboardLoading} />

      {/* Announcements Carousel */}
      {announcements.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-foreground mb-4">📢 Πρόσφατες Ανακοινώσεις</h2>
          <AnnouncementsCarousel announcements={announcements} />
        </div>
      )}

      {/* Buildings List - Fallback for when no dashboard data */}
      {effectiveBuildings.length > 0 && !dashboardData?.buildings?.length && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-foreground mb-4">🏢 Τα Κτίριά σας</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {effectiveBuildings.map((building) => (
              <Link
                key={building.id}
                href={`/buildings/${building.id}`}
                className="block border-0 rounded-lg p-6 shadow-md hover:shadow-lg transition-all duration-200 bg-card group"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-md flex items-center justify-center group-hover:bg-primary/20 transition-colors shadow-sm">
                    <Building className="w-6 h-6 text-primary" />
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Διαμερίσματα</p>
                    <p className="text-2xl font-bold text-foreground">{building.total_apartments || 0}</p>
                  </div>
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-1">{building.name}</h3>
                <p className="text-sm text-muted-foreground truncate">{building.address}</p>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {effectiveBuildings.length === 0 && (
        <div className="bg-card rounded-lg shadow-lg p-8">
          <div className="text-center">
            <Building className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-foreground mb-2">Δεν υπάρχουν κτίρια ακόμα</h2>
            <p className="text-muted-foreground mb-6">
              Ξεκινήστε προσθέτοντας το πρώτο σας κτίριο για να αρχίσετε τη διαχείριση.
            </p>
            <Link href="/buildings/new">
              <Button>
                Προσθήκη Κτιρίου
              </Button>
            </Link>
          </div>
        </div>
      )}
    </main>
  );
}

export default function DashboardPage() {
  return (
    <AuthGate role="any">
      <SubscriptionGate requiredStatus="any">
        <DashboardErrorBoundary>
          <DashboardContent />
        </DashboardErrorBoundary>
      </SubscriptionGate>
    </AuthGate>
  );
}

