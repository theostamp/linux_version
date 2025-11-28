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

import { BentoGrid, BentoGridItem } from '@/components/ui/bento-grid';

function DashboardContent() {
  const { user, isLoading: authLoading, isAuthReady } = useAuth();
  const { selectedBuilding, buildings } = useBuilding();
  const { data: buildingsData, isLoading: buildingsLoading } = useBuildings();
  const { data: announcements = [], isLoading: announcementsLoading } = useAnnouncements(selectedBuilding?.id);
  
  // Use the new centralized dashboard data hook
  const { data: dashboardData, isLoading: dashboardLoading, isError, error: dashboardError } = useDashboardData();
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
  }

  const effectiveBuildings = buildingsData || buildings || [];

  return (
    <main className="p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2 mb-8">
        <div>
          <h2 className="text-3xl font-bold tracking-tight font-condensed">
            {selectedBuilding ? selectedBuilding.name : 'Επισκόπηση Χαρτοφυλακίου'}
          </h2>
          <p className="text-muted-foreground">
            {selectedBuilding ? selectedBuilding.address : 'Συγκεντρωτικά στοιχεία για όλα τα κτίρια'}
          </p>
        </div>
        {/* Optional: Add Date Range Picker or other global actions here */}
      </div>

      <BentoGrid className="max-w-[1920px] auto-rows-auto gap-4">
        
        {/* 1. Hero Metrics (Full Width) */}
        <BentoGridItem
          className="md:col-span-3"
          header={
            <HeroSection 
              data={selectedBuilding ? buildingDashboardData : dashboardData} 
              loading={selectedBuilding ? buildingDashboardLoading : dashboardLoading}
              showWelcome={!selectedBuilding}
            />
          }
        />

        {/* 2. Financial Overview (Main Chart) - 2 Columns */}
        <BentoGridItem
          className="md:col-span-2 md:row-span-2"
          title="Οικονομική Εικόνα"
          description="Έσοδα και Έξοδα τρέχοντος έτους"
          header={
            <FinancialOverview 
              data={selectedBuilding ? buildingDashboardData : dashboardData} 
              loading={selectedBuilding ? buildingDashboardLoading : dashboardLoading} 
            />
          }
        />

        {/* 3. Quick Actions (Side Panel) - 1 Column */}
        <BentoGridItem
          className="md:col-span-1"
          title="Γρήγορες Ενέργειες"
          header={
            <QuickActionsGrid 
              data={dashboardData} 
              loading={dashboardLoading} 
            />
          }
        />

        {/* 4. Activity Feed & Health - Mixed Columns */}
        <BentoGridItem
          className="md:col-span-1"
          title="Πρόσφατη Δραστηριότητα"
          header={
            <ActivityFeed 
              data={dashboardData} 
              loading={dashboardLoading} 
            />
          }
        />
        
        {/* 5. Health Cards - Μόνο για managers/admins, ΟΧΙ για residents */}
        {user?.role !== 'resident' && (
        <BentoGridItem
          className="md:col-span-3"
          title="Κατάσταση Κτιρίων"
          header={
            <BuildingHealthCards 
              data={dashboardData} 
              loading={dashboardLoading} 
            />
          }
        />
        )}

        {/* 6. Announcements (if any) */}
        {announcements.length > 0 && (
          <BentoGridItem
            className="md:col-span-3"
            title="Ανακοινώσεις"
            header={
              <AnnouncementsCarousel announcements={announcements} />
            }
          />
        )}
      </BentoGrid>

      {/* Empty State / New User */}
      {effectiveBuildings.length === 0 && (
        <div className="mt-8 bg-card rounded-xl shadow-lg p-8 text-center border border-dashed border-slate-200/60">
          <Building className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-foreground mb-2">Δεν υπάρχουν κτίρια ακόμα</h2>
          <p className="text-muted-foreground mb-6">
            Ξεκινήστε προσθέτοντας το πρώτο σας κτίριο για να αρχίσετε τη διαχείριση.
          </p>
          <Link href="/buildings/new">
            <Button size="lg" className="shadow-lg">
              Προσθήκη Κτιρίου
            </Button>
          </Link>
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

