'use client';

import { useEffect, useState } from 'react';
import { Building, Loader2, Users, FileText, Bell, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { useAuth } from '@/components/contexts/AuthContext';
import { useBuilding } from '@/components/contexts/BuildingContext';
import { useBuildings } from '@/hooks/useBuildings';
import { useAnnouncements } from '@/hooks/useAnnouncements';
import { useVotes } from '@/hooks/useVotes';
import { useRequests } from '@/hooks/useRequests';
import { fetchObligationsSummary } from '@/lib/api';
import DashboardCards from '@/components/DashboardCards';
import BuildingStats from '@/components/BuildingStats';
import SelectedBuildingInfo from '@/components/SelectedBuildingInfo';
import AnnouncementsCarousel from '@/components/AnnouncementsCarousel';
import ErrorMessage from '@/components/ErrorMessage';
import AuthGate from '@/components/AuthGate';
import SubscriptionGate from '@/components/SubscriptionGate';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

function DashboardContent() {
  const { user, isLoading: authLoading, isAuthReady } = useAuth();
  const { selectedBuilding, buildings } = useBuilding();
  const { data: buildingsData, isLoading: buildingsLoading } = useBuildings();
  const { data: announcements = [], isLoading: announcementsLoading } = useAnnouncements(selectedBuilding?.id);
  const { data: votes = [], isLoading: votesLoading } = useVotes(selectedBuilding?.id);
  const { data: requests = [], isLoading: requestsLoading } = useRequests(selectedBuilding?.id);
  
  const [obligations, setObligations] = useState<{
    pending_payments: number;
    maintenance_tickets: number;
  } | null>(null);
  const [obligationsLoading, setObligationsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load obligations summary
  useEffect(() => {
    const loadObligations = async () => {
      // Only load if user is authenticated
      if (!isAuthReady || !user) {
        return;
      }

      setObligationsLoading(true);
      setError(null);
      
      try {
        const data = await fetchObligationsSummary();
        setObligations({
          pending_payments: data.pending_payments || 0,
          maintenance_tickets: data.maintenance_tickets || 0,
        });
      } catch (err: unknown) {
        console.error('Failed to load obligations:', err);
        
        const apiError = err as { status?: number; response?: { status?: number }; message?: string };
        
        // Handle authentication errors
        if (apiError?.status === 401 || apiError?.response?.status === 401) {
          setError('Η συνεδρία σας έληξε. Παρακαλώ συνδεθείτε ξανά.');
          return;
        }
        
        // Handle network errors
        if (apiError?.status === 502 || apiError?.status === 503) {
          setError('Ο διακομιστής δεν είναι διαθέσιμος αυτή τη στιγμή. Παρακαλώ δοκιμάστε αργότερα.');
          return;
        }
        
        // For other errors, set a generic error but don't block the page
        setError('Αδυναμία φόρτωσης εκκρεμών υποχρεώσεων. Η σελίδα θα συνεχίσει να λειτουργεί.');
      } finally {
        setObligationsLoading(false);
      }
    };

    loadObligations();
  }, [isAuthReady, user]);

  const isLoading = authLoading || buildingsLoading || announcementsLoading || votesLoading || requestsLoading || obligationsLoading;

  if (!isAuthReady || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-12 w-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Φόρτωση dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <ErrorMessage message={error} />
      </div>
    );
  }

  const effectiveBuildings = buildingsData || buildings || [];
  const stats = {
    buildings_count: effectiveBuildings.length,
    apartments_count: effectiveBuildings.reduce((sum, b) => sum + (b.total_apartments || 0), 0),
  };

  // Prepare dashboard cards data
  const dashboardCards = [
    {
      key: 'announcements',
      label: 'Ανακοινώσεις',
      icon: <Bell className="w-5 h-5" />,
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      textColor: 'text-blue-700',
      link: '/announcements',
      description: `${announcements.length} ενεργές`,
      apiCondition: () => true,
    },
    {
      key: 'votes',
      label: 'Ψηφοφορίες',
      icon: <CheckCircle className="w-5 h-5" />,
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      textColor: 'text-green-700',
      link: '/votes',
      description: `${votes.length} διαθέσιμες`,
      apiCondition: () => true,
    },
    {
      key: 'requests',
      label: 'Αιτήματα',
      icon: <AlertCircle className="w-5 h-5" />,
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-200',
      textColor: 'text-orange-700',
      link: '/requests',
      description: `${requests.length} συνολικά`,
      apiCondition: () => true,
    },
    {
      key: 'pending',
      label: 'Εκκρεμή',
      icon: <Clock className="w-5 h-5" />,
      bgColor: 'bg-yellow-50',
      borderColor: 'border-yellow-200',
      textColor: 'text-yellow-700',
      link: '/requests',
      description: obligations 
        ? `${(obligations.pending_payments || 0) + (obligations.maintenance_tickets || 0)} συνολικά`
        : obligationsLoading 
          ? 'Φόρτωση...' 
          : error 
            ? '—' // Don't show error, just show dash
            : '—',
      apiCondition: () => true,
    },
  ];

  return (
    <main className="p-6">
      {/* Welcome Section */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Καλώς ήρθατε{user?.first_name ? `, ${user.first_name}` : ''}!
        </h1>
        <p className="text-gray-600">
          Επισκόπηση των κτιρίων και των διαμερισμάτων σας
        </p>
      </div>

      {/* Selected Building Info */}
      <SelectedBuildingInfo selectedBuilding={selectedBuilding} />

      {/* Building Stats */}
      <BuildingStats buildings={effectiveBuildings} selectedBuilding={selectedBuilding} />

      {/* Dashboard Cards */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Γρήγορη Επισκόπηση</h2>
        <DashboardCards data={[...announcements, ...votes, ...requests]} cards={dashboardCards} />
      </div>

      {/* Announcements Carousel */}
      {announcements.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Πρόσφατες Ανακοινώσεις</h2>
          <AnnouncementsCarousel announcements={announcements} />
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center">
            <Building className="h-12 w-12 text-blue-600 mr-4" />
            <div>
              <p className="text-sm font-medium text-gray-600">Κτίρια</p>
              <p className="text-3xl font-bold text-gray-900">{stats.buildings_count || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center">
            <Users className="h-12 w-12 text-green-600 mr-4" />
            <div>
              <p className="text-sm font-medium text-gray-600">Διαμερίσματα</p>
              <p className="text-3xl font-bold text-gray-900">{stats.apartments_count || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center">
            <FileText className="h-12 w-12 text-purple-600 mr-4" />
            <div>
              <p className="text-sm font-medium text-gray-600">Ανακοινώσεις</p>
              <p className="text-3xl font-bold text-gray-900">{announcements.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Buildings List */}
      {effectiveBuildings.length > 0 ? (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Κτίρια</h2>
          <div className="space-y-4">
            {effectiveBuildings.map((building) => (
              <Link
                key={building.id}
                href={`/buildings/${building.id}`}
                className="block border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{building.name}</h3>
                    <p className="text-sm text-gray-600">{building.address}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600">Διαμερίσματα</p>
                    <p className="text-xl font-bold text-gray-900">{building.total_apartments || 0}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="text-center">
            <Building className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Δεν υπάρχουν κτίρια ακόμα</h2>
            <p className="text-gray-600 mb-6">
              Ξεκινήστε προσθέτοντας το πρώτο σας κτίριο για να αρχίσετε τη διαχείριση.
            </p>
            <Link href="/buildings/new">
              <Button className="bg-blue-600 hover:bg-blue-700">
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
        <DashboardContent />
      </SubscriptionGate>
    </AuthGate>
  );
}

