// frontend/app/(dashboard)/dashboard/page.tsx

'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';

import LogoutButton from '@/components/LogoutButton';
import DashboardCards from '@/components/DashboardCards';
import ErrorMessage from '@/components/ErrorMessage';
import AnnouncementsCarousel from '@/components/AnnouncementsCarousel';
import BuildingStats from '@/components/BuildingStats';
import SelectedBuildingInfo from '@/components/SelectedBuildingInfo';
import {
  fetchObligationsSummary,
  fetchAnnouncements,
  fetchVotes,
  fetchRequests,
  fetchTopRequests,
  Announcement,
  Vote,
} from '@/lib/api';
import type { UserRequest } from '@/types/userRequests';
import { useAuth } from '@/components/contexts/AuthContext';
import { useBuilding } from '@/components/contexts/BuildingContext';
import AuthGate from '@/components/AuthGate';
import LoginForm from '@/components/LoginForm';
import { useRouter } from 'next/navigation';

export default function DashboardPage() {
  return (
    <AuthGate
      role="any"
      fallback={
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
            <h1 className="text-2xl font-bold text-gray-900 mb-6 text-center">Σύνδεση</h1>
            <LoginForm />
          </div>
        </div>
      }
    >
      <DashboardContent />
    </AuthGate>
  );
}

function DashboardContent() {
  const { user, isLoading: authLoading, isAuthReady } = useAuth();
  const { currentBuilding, selectedBuilding, setSelectedBuilding, buildings } = useBuilding();
  const router = useRouter();

  const [onlyMine, setOnlyMine] = useState(false);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [votes, setVotes] = useState<Vote[]>([]);
  const [requests, setRequests] = useState<UserRequest[]>([]);
  const [topRequests, setTopRequests] = useState<UserRequest[]>([]);
  const [obligations, setObligations] = useState<{
    pending_payments: number;
    maintenance_tickets: number;
  } | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!isAuthReady || authLoading || !user || !currentBuilding?.id) return;

    const loadAll = async () => {
      setLoadingData(true);
      try {
        const buildingId = selectedBuilding?.id || currentBuilding.id;
        
        const [ann, vt, req] = await Promise.all([
          fetchAnnouncements(buildingId),
          fetchVotes(buildingId),
          fetchRequests({ buildingId }),
        ]);
        setAnnouncements(ann);
        setVotes(vt);
        setRequests(req);

        const top = await fetchTopRequests(buildingId);
        setTopRequests(top);

        setError(false);
      } catch (err) {
        console.error('Dashboard load failed:', err);
        setError(true);
      } finally {
        setLoadingData(false);
      }
    };

    loadAll();
  }, [authLoading, isAuthReady, user, currentBuilding, selectedBuilding]);

  useEffect(() => {
    if (!isAuthReady || authLoading || !user?.is_staff) return;

    const loadObligations = async () => {
      try {
        const summary = await fetchObligationsSummary();
        setObligations(summary);
      } catch (err) {
        console.error('Obligations error:', err);
        setError(true);
      }
    };

    loadObligations();
  }, [authLoading, isAuthReady, user]);

  useEffect(() => {
    if (!authLoading && isAuthReady && (!user || !currentBuilding)) {
      // Καθαρίζουμε τα tokens και κάνουμε redirect στο login
      if (typeof window !== 'undefined') {
        localStorage.removeItem('access');
        localStorage.removeItem('refresh');
      }
      router.push('/login');
    }
  }, [authLoading, isAuthReady, user, currentBuilding, router]);

  const activeVotes = votes.filter(
    (v) => !v.end_date || new Date(v.end_date) > new Date()
  );

  const filteredRequests =
    onlyMine && user
      ? requests.filter((r) => r.created_by_username === user.email)
      : requests;

  const requestCards = [
    { key: 'all', label: 'Όλα τα Αιτήματα', icon: '📨', bgColor: 'bg-gradient-to-r from-blue-500 to-blue-600', link: '/requests' },
    { key: 'open', label: 'Ανοιχτά', icon: '📂', bgColor: 'bg-gradient-to-r from-orange-400 to-orange-500', link: '/requests?status=open' },
    { key: 'urgent', label: 'Επείγοντα', icon: '🔥', bgColor: 'bg-gradient-to-r from-red-500 to-red-600', link: '/requests?urgent=1' },
    { key: 'supported', label: 'Με Υποστήριξη', icon: '🤝', bgColor: 'bg-gradient-to-r from-yellow-400 to-yellow-500', link: '/requests?supported=1' },
  ];

  if (authLoading || !isAuthReady || !user || !currentBuilding || loadingData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Φόρτωση...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Header Section */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
              {selectedBuilding && (
                <p className="text-sm text-gray-600 mt-1">
                  Φιλτράρισμα: <span className="font-medium text-blue-600">{selectedBuilding.name}</span>
                </p>
              )}
            </div>
            <LogoutButton className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors duration-200" />
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && <ErrorMessage message="Αποτυχία φόρτωσης δεδομένων." />}

        {/* Building Information Section */}
        <div className="mb-8">
          <SelectedBuildingInfo selectedBuilding={selectedBuilding} />
          <BuildingStats buildings={buildings} selectedBuilding={selectedBuilding} />
        </div>

        {/* Quick Actions Section */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
            <span className="mr-2">⚡</span>
            Γρήγορες Ενέργειες
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link href="/announcements" className="group">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-all duration-200 group-hover:scale-105">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-2xl">📢</span>
                  <span className="text-sm font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded-full">
                    {announcements.length}
                  </span>
                </div>
                <h3 className="font-semibold text-gray-900">Ανακοινώσεις</h3>
                <p className="text-sm text-gray-600 mt-1">Πρόσφατες ανακοινώσεις</p>
              </div>
            </Link>
            
            <Link href="/votes" className="group">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-all duration-200 group-hover:scale-105">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-2xl">🗳️</span>
                  <span className="text-sm font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full">
                    {activeVotes.length}
                  </span>
                </div>
                <h3 className="font-semibold text-gray-900">Ψηφοφορίες</h3>
                <p className="text-sm text-gray-600 mt-1">Ενεργές ψηφοφορίες</p>
              </div>
            </Link>
            
            <Link href="/requests" className="group">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-all duration-200 group-hover:scale-105">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-2xl">📨</span>
                  <span className="text-sm font-medium text-orange-600 bg-orange-50 px-2 py-1 rounded-full">
                    {requests.filter((r) => r.status === 'open').length}
                  </span>
                </div>
                <h3 className="font-semibold text-gray-900">Αιτήματα</h3>
                <p className="text-sm text-gray-600 mt-1">Εκκρεμή αιτήματα</p>
              </div>
            </Link>
            
            <Link href="/buildings" className="group">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-all duration-200 group-hover:scale-105">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-2xl">🏢</span>
                  <span className="text-sm font-medium text-purple-600 bg-purple-50 px-2 py-1 rounded-full">
                    {buildings.length}
                  </span>
                </div>
                <h3 className="font-semibold text-gray-900">Κτίρια</h3>
                <p className="text-sm text-gray-600 mt-1">Διαχείριση κτιρίων</p>
              </div>
            </Link>
          </div>
        </div>

        {/* Announcements Section */}
        {announcements.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
              <span className="mr-2">📰</span>
              Πρόσφατες Ανακοινώσεις
            </h2>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <AnnouncementsCarousel announcements={announcements} />
            </div>
          </div>
        )}

        {/* Staff Actions Section */}
        {user?.is_staff && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
              <span className="mr-2">👨‍💼</span>
              Ενέργειες Διαχείρισης
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Link href="/announcements/new" className="group">
                <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-6 text-white hover:from-blue-600 hover:to-blue-700 transition-all duration-200 group-hover:scale-105 shadow-lg">
                  <div className="flex items-center">
                    <span className="text-3xl mr-4">📢</span>
                    <div>
                      <h3 className="font-semibold text-lg">Δημιουργία Ανακοίνωσης</h3>
                      <p className="text-blue-100 text-sm">Νέα ανακοίνωση για τους κατοίκους</p>
                    </div>
                  </div>
                </div>
              </Link>
              
              <Link href="/votes/new" className="group">
                <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-xl p-6 text-white hover:from-green-600 hover:to-green-700 transition-all duration-200 group-hover:scale-105 shadow-lg">
                  <div className="flex items-center">
                    <span className="text-3xl mr-4">🗳️</span>
                    <div>
                      <h3 className="font-semibold text-lg">Νέα Ψηφοφορία</h3>
                      <p className="text-green-100 text-sm">Δημιουργία νέας ψηφοφορίας</p>
                    </div>
                  </div>
                </div>
              </Link>
            </div>

            {/* Obligations Section */}
            {obligations && (
              <div className="mt-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <span className="mr-2">🧾</span>
                  Εκκρεμότητες Διαχείρισης
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Απλήρωτες Συνεισφορές</p>
                        <p className="text-3xl font-bold text-red-600">{obligations.pending_payments}</p>
                      </div>
                      <span className="text-3xl">💰</span>
                    </div>
                  </div>
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Εκκρεμείς Συντηρήσεις</p>
                        <p className="text-3xl font-bold text-yellow-600">{obligations.maintenance_tickets}</p>
                      </div>
                      <span className="text-3xl">🔧</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Requests Filter */}
        {user && (
          <div className="mb-6">
            <label className="inline-flex items-center gap-3 bg-white rounded-lg shadow-sm border border-gray-200 px-4 py-3 hover:shadow-md transition-shadow duration-200">
              <input 
                type="checkbox" 
                checked={onlyMine} 
                onChange={() => setOnlyMine(!onlyMine)}
                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
              />
              <span className="text-sm font-medium text-gray-700">Μόνο δικά μου αιτήματα</span>
            </label>
          </div>
        )}

        {/* Requests Overview */}
        {!error && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
              <span className="mr-2">📊</span>
              Επισκόπηση Αιτημάτων
            </h2>
            <DashboardCards data={filteredRequests} cards={requestCards} />
          </div>
        )}

        {/* Analytics Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Requests Distribution Chart */}
          {filteredRequests.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <span className="mr-2">📈</span>
                Κατανομή Αιτημάτων
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    dataKey="value"
                    data={[
                      { name: 'Ανοιχτά', value: filteredRequests.filter((r) => r.status === 'open').length },
                      { name: 'Σε εξέλιξη', value: filteredRequests.filter((r) => r.status === 'in_progress').length },
                      { name: 'Ολοκληρωμένα', value: filteredRequests.filter((r) => r.status === 'resolved').length },
                    ]}
                    cx="50%" 
                    cy="50%" 
                    outerRadius={80} 
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    <Cell fill="#f59e0b" />
                    <Cell fill="#3b82f6" />
                    <Cell fill="#10b981" />
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Top Supported Requests */}
          {topRequests.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <span className="mr-2">🏆</span>
                Top Υποστηριζόμενα Αιτήματα
              </h3>
              <div className="space-y-3">
                {topRequests.slice(0, 5).map((r) => (
                  <Link key={r.id} href={`/requests/${r.id}`} className="block">
                    <div className="p-4 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors duration-200">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-gray-900 line-clamp-1">{r.title}</h4>
                        <span className="flex items-center text-sm font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full">
                          🤝 {r.supporter_count}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 line-clamp-2">{r.description}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}