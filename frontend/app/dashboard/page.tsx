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
} from 'recharts';

import LogoutButton from '@/components/LogoutButton';
import DashboardCards from '@/components/DashboardCards';
import ErrorMessage from '@/components/ErrorMessage';
import AnnouncementsCarousel from '@/components/AnnouncementsCarousel';
import {
  fetchObligationsSummary,
  fetchAnnouncements,
  fetchVotes,
  fetchRequests,
  fetchTopRequests,
  Announcement,
  Vote 
} from '@/lib/api';
import type { UserRequest } from '@/types/userRequests';
import { useAuth } from '@/components/contexts/AuthContext';
import { useBuilding } from '@/components/contexts/BuildingContext';
import AuthGate from '@/components/AuthGate';
import LoginForm from '@/components/LoginForm';


export default function DashboardPage() {
  return (
    <AuthGate
      role="any"
      fallback={
        <div className="p-4">
          <p className="text-red-600 mb-4">🚫 Πρέπει να συνδεθείτε.</p>
          <LoginForm />
        </div>
      }
    >
      <DashboardContent />
    </AuthGate>
  );
}

function DashboardContent() {
  const { user, isLoading: authLoading, isAuthReady } = useAuth();
  const { currentBuilding } = useBuilding();

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
        const [ann, vt, req] = await Promise.all([
          fetchAnnouncements(currentBuilding.id),
          fetchVotes(currentBuilding.id),
          fetchRequests({ buildingId: currentBuilding.id }),
        ]);
        setAnnouncements(ann);
        setVotes(vt);
        setRequests(req);

        const top = await fetchTopRequests(currentBuilding.id);
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
  }, [authLoading, isAuthReady, user, currentBuilding]);

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

  const activeVotes = votes.filter(
    (v) => !v.end_date || new Date(v.end_date) > new Date()
  );

  const filteredRequests =
    onlyMine && user
      ? requests.filter((r) => r.created_by_username === user.email)
      : requests;

  const requestCards = [
    { key: 'all', label: 'Όλα τα Αιτήματα', icon: '📨', bgColor: 'bg-blue-600', link: '/requests' },
    { key: 'open', label: 'Ανοιχτά', icon: '📂', bgColor: 'bg-orange-500', link: '/requests?status=open' },
    { key: 'urgent', label: 'Επείγοντα', icon: '🔥', bgColor: 'bg-red-600', link: '/requests?urgent=1' },
    { key: 'supported', label: 'Με Υποστήριξη', icon: '🤝', bgColor: 'bg-yellow-500', link: '/requests?supported=1' },
  ];

  if (authLoading || !isAuthReady || !user || !currentBuilding || loadingData) {
    return <p className="text-center mt-10">Φόρτωση...</p>;
  }

  return (
    <div className="p-6 space-y-6 max-w-[85%] mx-auto">
      {error && <ErrorMessage message="Αποτυχία φόρτωσης δεδομένων." />}

      {announcements.length > 0 && (
        <>
          <h2 className="text-xl font-bold mb-2">📰 Πρόσφατες Ανακοινώσεις</h2>
          <AnnouncementsCarousel announcements={announcements} />
        </>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Link href="/announcements" className="card">
          <h2>📢 Ανακοινώσεις</h2>
          <p>{announcements.length} ανακοινώσεις</p>
        </Link>
        <Link href="/votes" className="card">
          <h2>🗳️ Ψηφοφορίες</h2>
          <p>{activeVotes.length} ενεργές</p>
        </Link>
        <Link href="/requests" className="card">
          <h2>📨 Αιτήματα</h2>
          <p>{requests.filter((r) => r.status === 'open').length} εκκρεμή</p>
        </Link>
      </div>

      {user?.is_staff && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Link href="/announcements/new" className="btn-primary">📢 Δημιουργία Ανακοίνωσης</Link>
            <Link href="/votes/new" className="btn-primary">🗳️ Νέα Ψηφοφορία</Link>
          </div>

          {obligations && (
            <div>
              <h2 className="text-xl font-bold mb-2">🧾 Εκκρεμότητες Διαχείρισης</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="card-sm">
                  <p>Απλήρωτες Συνεισφορές</p>
                  <p className="text-2xl font-bold text-red-600">{obligations.pending_payments}</p>
                </div>
                <div className="card-sm">
                  <p>Εκκρεμείς Συντηρήσεις</p>
                  <p className="text-2xl font-bold text-yellow-600">{obligations.maintenance_tickets}</p>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {user && (
        <label className="inline-flex items-center gap-2">
          <input type="checkbox" checked={onlyMine} onChange={() => setOnlyMine(!onlyMine)} />
          <span>Μόνο δικά μου αιτήματα</span>
        </label>
      )}

      {!error && <DashboardCards data={filteredRequests} cards={requestCards} />}

      {filteredRequests.length > 0 && (
        <div>
          <h2 className="text-xl font-bold mb-4">📈 Κατανομή Αιτημάτων ανά Κατάσταση</h2>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                dataKey="value"
                data={[
                  { name: 'Ανοιχτά', value: filteredRequests.filter((r) => r.status === 'open').length },
                  { name: 'Σε εξέλιξη', value: filteredRequests.filter((r) => r.status === 'in_progress').length },
                  { name: 'Ολοκληρωμένα', value: filteredRequests.filter((r) => r.status === 'resolved').length },
                ]}
                cx="50%" cy="50%" outerRadius={80} label
              >
                <Cell fill="#f59e0b" />
                <Cell fill="#3b82f6" />
                <Cell fill="#10b981" />
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}

      {topRequests.length > 0 && (
        <div>
          <h2 className="text-xl font-bold mb-4">🏆 Top Υποστηριζόμενα Αιτήματα</h2>
          <ul>
            {topRequests.map((r) => (
              <li key={r.id}>
                <Link href={`/requests/${r.id}`} className="card-list">
                  <h3>{r.title}</h3>
                  <span>🤝 {r.supporter_count}</span>
                  <p className="line-clamp-2">{r.description}</p>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="text-center mt-10">
        <LogoutButton className="btn-secondary" />
      </div>
    </div>
  );
}