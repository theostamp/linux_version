'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Building, Loader2, CalendarDays, Clock, MessageSquare, Vote as VoteIcon } from 'lucide-react';
import { useAuth } from '@/components/contexts/AuthContext';
import { useBuilding } from '@/components/contexts/BuildingContext';
import { useBuildings } from '@/hooks/useBuildings';
import { useAnnouncements } from '@/hooks/useAnnouncements';
import { useVotes } from '@/hooks/useVotes';
import { useRequests } from '@/hooks/useRequests';
import AnnouncementsCarousel from '@/components/AnnouncementsCarousel';
import ErrorMessage from '@/components/ErrorMessage';
import AuthGate from '@/components/AuthGate';
import SubscriptionGate from '@/components/SubscriptionGate';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import useDashboardData from '@/hooks/useDashboardData';
import { 
  HeroSection, 
  FinancialOverview, 
  QuickActionsGrid, 
  ActivityFeed, 
  BuildingHealthCards,
  DashboardErrorBoundary 
} from '@/components/dashboard';
import { isResident } from '@/lib/roleUtils';

import { BentoGrid, BentoGridItem } from '@/components/ui/bento-grid';

const parseDate = (value?: string | null) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const formatDate = (value?: string | null) => {
  const date = parseDate(value);
  if (!date) return '—';
  return date.toLocaleDateString('el-GR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

const formatDateRange = (start?: string | null, end?: string | null) => {
  const startFormatted = formatDate(start);
  const endFormatted = formatDate(end);
  return `${startFormatted} – ${endFormatted}`;
};

const differenceInDays = (value?: string | null) => {
  const target = parseDate(value);
  if (!target) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
};

const REQUEST_STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  pending: { label: 'Σε εκκρεμότητα', className: 'bg-amber-100 text-amber-700 border-amber-200' },
  in_progress: { label: 'Σε εξέλιξη', className: 'bg-blue-100 text-blue-700 border-blue-200' },
  approved: { label: 'Εγκεκριμένο', className: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  scheduled: { label: 'Προγραμματισμένο', className: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
};

const getRequestStatusToken = (status?: string) => {
  if (!status) {
    return { label: 'Άγνωστη', className: 'bg-slate-100 text-slate-600 border-slate-200' };
  }
  return REQUEST_STATUS_CONFIG[status] ?? {
    label: status.replace(/_/g, ' '),
    className: 'bg-slate-100 text-slate-600 border-slate-200',
  };
};

function DashboardContent() {
  const { user, isLoading: authLoading, isAuthReady } = useAuth();
  const router = useRouter();

  // Redirect residents to my-apartment page
  useEffect(() => {
    if (isAuthReady && user && isResident(user)) {
      router.replace('/my-apartment');
    }
  }, [isAuthReady, user, router]);
  const { currentBuilding, selectedBuilding, buildings } = useBuilding();
  const { data: buildingsData, isLoading: buildingsLoading } = useBuildings();
  const activeBuildingId = selectedBuilding?.id ?? currentBuilding?.id ?? null;
  const { data: announcements = [], isLoading: announcementsLoading } = useAnnouncements(activeBuildingId);
  const { data: votesRaw = [], isLoading: votesLoading } = useVotes(activeBuildingId);
  const { data: requestsRaw = [], isLoading: requestsLoading } = useRequests(activeBuildingId);
  
  // Use the new centralized dashboard data hook
  const { data: dashboardData, isLoading: dashboardLoading, isError, error: dashboardError } = useDashboardData();
  const { data: buildingDashboardData, isLoading: buildingDashboardLoading } = useDashboardData(activeBuildingId ?? undefined);

  const isLoading = authLoading || buildingsLoading || dashboardLoading;

  // Don't render dashboard for residents - they're being redirected
  if (isAuthReady && user && isResident(user)) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-12 w-12 text-primary animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Ανακατεύθυνση στη σελίδα διαμερίσματος...</p>
        </div>
      </div>
    );
  }

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

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const filteredAnnouncements = announcements
    .filter((announcement) => {
      const endDate = parseDate(announcement.end_date);
      if (endDate && endDate < today) {
        return false;
      }
      return true;
    })
    .sort((a, b) => {
      const aDate = parseDate(a.start_date) ?? parseDate(a.created_at);
      const bDate = parseDate(b.start_date) ?? parseDate(b.created_at);
      if (!aDate || !bDate) return 0;
      return aDate.getTime() - bDate.getTime();
    });

  const dedupedVotes = votesRaw.filter((vote, index, self) => index === self.findIndex((v) => v.id === vote.id));
  const filteredVotes = dedupedVotes
    .filter((vote) => {
      const endDate = parseDate(vote.end_date);
      if (endDate && endDate < today) {
        return false;
      }
      if (vote.is_active === false) {
        return false;
      }
      return true;
    })
    .sort((a, b) => {
      const aDate = parseDate(a.end_date) ?? parseDate(a.start_date);
      const bDate = parseDate(b.end_date) ?? parseDate(b.start_date);
      if (!aDate || !bDate) return 0;
      return aDate.getTime() - bDate.getTime();
    })
    .slice(0, 3);

  const filteredRequests = requestsRaw
    .filter((request) => {
      const status = request.status ?? '';
      if (['completed', 'cancelled', 'rejected'].includes(status)) {
        return false;
      }
      const completionDate = parseDate(request.completed_at);
      if (completionDate && completionDate < today) {
        return false;
      }
      const estimatedDate = parseDate(request.estimated_completion);
      if (estimatedDate && estimatedDate < today) {
        return false;
      }
      return true;
    })
    .sort((a, b) => {
      const aDate = parseDate(a.estimated_completion) ?? parseDate(a.created_at);
      const bDate = parseDate(b.estimated_completion) ?? parseDate(b.created_at);
      if (!aDate || !bDate) return 0;
      return aDate.getTime() - bDate.getTime();
    })
    .slice(0, 3);
 
  return (
    <main className="px-4 py-6 md:px-8 lg:px-12 max-w-[1400px] mx-auto">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between mb-10">
        <div>
          <h2 className="text-3xl font-bold tracking-tight font-condensed">
            {selectedBuilding ? selectedBuilding.name : 'Επισκόπηση Χαρτοφυλακίου'}
          </h2>
          <p className="text-muted-foreground">
            {selectedBuilding ? selectedBuilding.address : 'Συγκεντρωτικά στοιχεία για όλα τα κτίρια'}
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            {selectedBuilding 
              ? 'Εδώ βλέπετε την συνολική εικόνα του κτιρίου που έχετε επιλέξει'
              : 'Εδώ βλέπετε την συνολική εικόνα όλων των κτιρίων που διαχειρίζεστε'}
          </p>
        </div>
        {/* Optional: Add Date Range Picker or other global actions here */}
      </div>

      <BentoGrid className="md:grid-cols-12 md:auto-rows-[minmax(16rem,auto)] gap-6 lg:gap-8 xl:gap-10 max-w-none">
        
        {/* 1. Hero Metrics (Full Width) */}
        <BentoGridItem
          className="md:col-span-12"
          header={
            <HeroSection 
              data={selectedBuilding ? buildingDashboardData : dashboardData} 
              loading={selectedBuilding ? buildingDashboardLoading : dashboardLoading}
              showWelcome={!selectedBuilding}
            />
          }
        />

        {/* 2. Financial Overview (Main Chart) */}
        <BentoGridItem
          className="md:col-span-12 lg:col-span-7 xl:col-span-7"
          title="Οικονομική Εικόνα"
          description="Έσοδα και Έξοδα τρέχοντος έτους"
          header={
            <FinancialOverview 
              data={activeBuildingId ? buildingDashboardData : dashboardData} 
              loading={activeBuildingId ? buildingDashboardLoading : dashboardLoading} 
            />
          }
        />

        {/* 3. Quick Actions (Side Panel) */}
        <BentoGridItem
          className="md:col-span-12 lg:col-span-5 xl:col-span-5"
          title="Γρήγορες Ενέργειες"
          description="Συντομεύσεις για καθημερινές εργασίες"
          header={
            <QuickActionsGrid 
              data={dashboardData} 
              loading={dashboardLoading} 
            />
          }
        />

        {/* 4. Active Votes Overview */}
        <BentoGridItem
          className="md:col-span-12 lg:col-span-4"
          title="Ενεργές Ψηφοφορίες"
          description="Ψηφοφορίες που λήγουν σύντομα"
          header={
            <div className="flex h-full flex-col gap-4">
              {votesLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-14 w-full" />
                  <Skeleton className="h-14 w-full" />
                  <Skeleton className="h-14 w-full" />
                </div>
              ) : filteredVotes.length === 0 ? (
                <div className="flex min-h-[140px] items-center justify-center rounded-xl border border-dashed border-border/60 bg-muted/40 px-4 text-center text-sm text-muted-foreground">
                  Δεν υπάρχουν ενεργές ή προγραμματισμένες ψηφοφορίες.
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredVotes.map((vote) => {
                    const daysLeft = differenceInDays(vote.end_date);
                    return (
                      <Link
                        key={vote.id}
                        href={`/votes/${vote.id}`}
                        className="block rounded-xl border border-border/40 bg-background px-4 py-3 transition-colors hover:bg-muted/50"
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-blue-700">
                            <VoteIcon className="h-4 w-4" />
                          </div>
                          <div className="flex-1 space-y-1">
                            <p className="text-sm font-semibold text-foreground line-clamp-2">
                              {vote.title}
                            </p>
                            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                              <span className="inline-flex items-center gap-1">
                                <CalendarDays className="h-3 w-3" />
                                {formatDateRange(vote.start_date, vote.end_date)}
                              </span>
                              {typeof daysLeft === 'number' && daysLeft >= 0 && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-blue-700">
                                  <Clock className="h-3 w-3" />
                                  {daysLeft === 0 ? 'Λήγει σήμερα' : `Σε ${daysLeft} ${daysLeft === 1 ? 'ημέρα' : 'ημέρες'}`}
                                </span>
                              )}
                              {!selectedBuilding && vote.building_name && (
                                <span className="inline-flex items-center gap-1 rounded-full border border-border/50 bg-background px-2 py-0.5">
                                  🏢 {vote.building_name}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
              <div className="pt-1">
                <Link href="/votes" className="text-sm font-medium text-primary hover:text-primary/80">
                  Μετάβαση στις ψηφοφορίες →
                </Link>
              </div>
            </div>
          }
        />

        {/* 5. Requests in Progress */}
        <BentoGridItem
          className="md:col-span-12 lg:col-span-4"
          title="Αιτήματα σε Εξέλιξη"
          description="Παρακολουθήστε τις τρέχουσες εργασίες"
          header={
            <div className="flex h-full flex-col gap-4">
              {requestsLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-14 w-full" />
                  <Skeleton className="h-14 w-full" />
                  <Skeleton className="h-14 w-full" />
                </div>
              ) : filteredRequests.length === 0 ? (
                <div className="flex min-h-[140px] items-center justify-center rounded-xl border border-dashed border-border/60 bg-muted/40 px-4 text-center text-sm text-muted-foreground">
                  Δεν υπάρχουν ενεργά αιτήματα.
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredRequests.map((request) => {
                    const statusToken = getRequestStatusToken(request.status);
                    const dueLabel = request.estimated_completion
                      ? `Προθεσμία ${formatDate(request.estimated_completion)}`
                      : `Δημιουργήθηκε ${formatDate(request.created_at)}`;
                    const daysLeft = request.estimated_completion ? differenceInDays(request.estimated_completion) : null;
                    return (
                      <div
                        key={request.id}
                        className="rounded-xl border border-border/40 bg-background px-4 py-3"
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-100 text-amber-700">
                            <MessageSquare className="h-4 w-4" />
                          </div>
                          <div className="flex-1 space-y-1">
                            <p className="text-sm font-semibold text-foreground line-clamp-2">
                              {request.title}
                            </p>
                            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                              <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 ${statusToken.className}`}>
                                {statusToken.label}
                              </span>
                              <span className="inline-flex items-center gap-1">
                                <CalendarDays className="h-3 w-3" />
                                {dueLabel}
                              </span>
                              {typeof daysLeft === 'number' && daysLeft >= 0 && (
                                <span className="inline-flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {daysLeft === 0 ? 'Σήμερα' : `Σε ${daysLeft} ${daysLeft === 1 ? 'ημέρα' : 'ημέρες'}`}
                                </span>
                              )}
                              {!selectedBuilding && request.building_name && (
                                <span className="inline-flex items-center gap-1">
                                  🏢 {request.building_name}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              <div className="pt-1">
                <Link href="/requests" className="text-sm font-medium text-primary hover:text-primary/80">
                  Προβολή όλων των αιτημάτων →
                </Link>
              </div>
            </div>
          }
        />

        {/* 6. Recent Activity */}
        <BentoGridItem
          className="md:col-span-12 lg:col-span-4"
          title="Πρόσφατη Δραστηριότητα"
          description="Τι άλλαξε το τελευταίο διάστημα"
          header={
            <ActivityFeed 
              data={dashboardData} 
              loading={dashboardLoading} 
            />
          }
        />
        
        {/* 7. Health Cards - Μόνο για managers/admins, ΟΧΙ για residents */}
        {user?.role !== 'resident' && (
          <BentoGridItem
            className="md:col-span-12 lg:col-span-7"
            title="Κατάσταση Κτιρίων"
            description="Συνοπτική εικόνα των κτιρίων σας"
            header={
              <BuildingHealthCards 
                data={dashboardData} 
                loading={dashboardLoading} 
              />
            }
          />
        )}

        {/* 8. Announcements */}
        <BentoGridItem
          className="md:col-span-12 lg:col-span-5"
          title="Ανακοινώσεις"
          description="Ενεργές ή προσεχείς ενημερώσεις"
          header={
            announcementsLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-[200px] w-full" />
              </div>
            ) : filteredAnnouncements.length > 0 ? (
              <AnnouncementsCarousel announcements={filteredAnnouncements} />
            ) : (
              <div className="flex min-h-[160px] items-center justify-center rounded-xl border border-dashed border-border/60 bg-muted/40 px-4 text-center text-sm text-muted-foreground">
                Δεν υπάρχουν ενεργές ανακοινώσεις.
              </div>
            )
          }
        />
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

