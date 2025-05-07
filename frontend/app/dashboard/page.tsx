// frontend/app/dashboard/page.tsx
"use client";

import LogoutButton from '@/components/LogoutButton'; // ✅ Correct import
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

import DashboardCards from "@/components/DashboardCards";
import ErrorMessage from "@/components/ErrorMessage";
import AnnouncementsCarousel from "@/components/AnnouncementsCarousel";

import {
  fetchAnnouncements,
  fetchVotes,
  fetchRequests,
  fetchTopRequests,
  Announcement,
  Vote,
  UserRequest,
} from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { getBaseUrl } from "@/lib/config"; // Note: Still using getBaseUrl here for obligations

export default function DashboardPage() {
  const { user } = useAuth();

  const [onlyMine, setOnlyMine] = useState(false);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [votes, setVotes] = useState<Vote[]>([]);
  const [requests, setRequests] = useState<UserRequest[]>([]);
  const [topRequests, setTopRequests] = useState<UserRequest[]>([]);
  const [obligations, setObligations] = useState<{ pending_payments: number; maintenance_tickets: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // Φόρτωση μόνο όταν έχει φορτώσει ο χρήστης και είναι authenticated
  useEffect(() => {
    if (!user) return; // guard: skip fetch αν δεν υπάρχει user

    async function loadAll() {
      try {
        // Παράλληλες κλήσεις στο API για ανακοινώσεις, ψηφοφορίες και αιτήματα
        const [ann, vt, req] = await Promise.all([
          fetchAnnouncements(),
          fetchVotes(),
          fetchRequests(),
        ]);
        setAnnouncements(ann);
        setVotes(vt);
        setRequests(req);

        // Κορυφαία αιτήματα
        const top = await fetchTopRequests();
        setTopRequests(top);

        setError(false);
      } catch (err) {
        console.error("Dashboard load failed:", err);
        setError(true);
      } finally {
        setLoading(false);
      }
    }

    loadAll();
  }, [user]); // τρέχει ξανά όταν αλλάζει ο user

  // Fetch obligations summary (still uses getBaseUrl)
  useEffect(() => {
    async function loadObligations() {
      try {
        const base = getBaseUrl(); // Consider changing this to process.env if getBaseUrl isn't reliable
        if (!base) {
            console.error("Base URL for obligations is undefined");
            return; // Exit if base URL is undefined
        }
        const res = await fetch(`${base}/obligations/summary/`, { credentials: "include" });
        if (!res.ok) throw new Error("Failed to load obligations");
        setObligations(await res.json());
      } catch (err) {
        console.error("Obligations error:", err);
        // Optionally set an error state specific to obligations
      }
    }
    // Only load if user exists and is staff
    if (user?.is_staff) {
        loadObligations();
    }
  }, [user]); // Dependency on user

  const activeVotes = votes.filter(v =>
    // αν δεν υπάρχει end_date ή είναι μελλοντική, μετράει ως ενεργή
    !v.end_date || new Date(v.end_date) > new Date()
  );
    const filteredRequests = onlyMine && user
    ? requests.filter((r) => r.created_by_username === user.username)
    : requests;

  const requestCards = [
    { key: "all", label: "Όλα τα Αιτήματα", icon: "📨", bgColor: "bg-blue-600", link: "/requests" },
    { key: "open", label: "Ανοιχτά", icon: "📂", bgColor: "bg-orange-500", link: "/requests?status=open" },
    { key: "urgent", label: "Επείγοντα", icon: "🔥", bgColor: "bg-red-600", link: "/requests?urgent=1" },
    { key: "supported", label: "Με Υποστήριξη", icon: "🤝", bgColor: "bg-yellow-500", link: "/requests?supported=1" },
  ];

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
          <p>{requests.filter((r) => r.status === "open").length} εκκρεμή</p>
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

      {!loading && !error && <DashboardCards data={filteredRequests} cards={requestCards} />}

      {filteredRequests.length > 0 && (
        <div>
          <h2 className="text-xl font-bold mb-4">📈 Κατανομή Αιτημάτων ανά Κατάσταση</h2>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                dataKey="value"
                data={[
                  { name: "Ανοιχτά", value: filteredRequests.filter((r) => r.status === "open").length },
                  { name: "Σε εξέλιξη", value: filteredRequests.filter((r) => r.status === "in_progress").length },
                  { name: "Ολοκληρωμένα", value: filteredRequests.filter((r) => r.status === "resolved").length },
                ]}
                cx="50%" cy="50%" outerRadius={80} label
              >
                <Cell fill="#f59e0b" /> {/* Orange for Open */}
                <Cell fill="#3b82f6" /> {/* Blue for In Progress */}
                <Cell fill="#10b981" /> {/* Green for Resolved */}
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

      {/* --- Corrected Logout/Login Section --- */}
      {!user ? (
        <div className="text-center mt-10">
          <p>Συνδεθείτε για να δείτε το dashboard.</p>
          <Link href="/login" className="btn-secondary">Σύνδεση</Link>
        </div>
      ) : (
        <div className="text-center mt-10">
          {/* Correctly using LogoutButton with className prop */}
          <LogoutButton className="btn-secondary" />
        </div>
      )}
      {/* --- End of Corrected Section --- */}


      {loading && <p className="text-center mt-10">Φόρτωση...</p>}
    </div>
  );
}