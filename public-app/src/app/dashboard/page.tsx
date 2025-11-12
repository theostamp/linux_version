'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Building, Loader2, Users, DollarSign, FileText, AlertCircle } from 'lucide-react';
import { apiGet } from '@/lib/api';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';

interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  office_name?: string;
}

interface BuildingData {
  id: number;
  name: string;
  address: string;
  apartments_count: number;
}

interface DashboardStats {
  buildings_count?: number;
  apartments_count?: number;
  total_residents?: number;
}

export default function DashboardPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [buildings, setBuildings] = useState<BuildingData[]>([]);
  const [stats, setStats] = useState<DashboardStats>({});

  useEffect(() => {
    // Check if user is authenticated
    const accessToken = localStorage.getItem('access_token');
    
    if (!accessToken) {
      router.push('/login?redirect=/dashboard');
      return;
    }

    loadDashboardData();
  }, [router]);

  const loadDashboardData = async () => {
    try {
      // Load user info
      const userData = await apiGet<User>('/users/me/');
      setUser(userData);

      // Load buildings
      try {
        const buildingsData = await apiGet<BuildingData[]>('/buildings/');
        setBuildings(buildingsData || []);
        
        // Calculate stats
        const totalApartments = buildingsData?.reduce((sum, b) => sum + (b.apartments_count || 0), 0) || 0;
        setStats({
          buildings_count: buildingsData?.length || 0,
          apartments_count: totalApartments,
        });
      } catch (buildingsError) {
        console.warn('Could not load buildings:', buildingsError);
        // Buildings might not be available yet, continue anyway
      }

      setIsLoading(false);
    } catch (err: any) {
      console.error('Dashboard error:', err);
      
      // If 401, redirect to login
      if (err.status === 401) {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        router.push('/login?redirect=/dashboard');
        return;
      }
      
      setError(err.message || 'Failed to load dashboard');
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <Loader2 className="h-12 w-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Φόρτωση dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md">
          <div className="text-center">
            <Building className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Σφάλμα</h1>
            <p className="text-gray-600 mb-6">{error}</p>
            <button
              onClick={() => router.push('/login')}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              Σύνδεση
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <Sidebar user={user || undefined} />

      {/* Main Content */}
      <div className="lg:pl-64">
        {/* Header */}
        <Header user={user || undefined} />

        {/* Dashboard Content */}
        <main className="p-6">
        {/* Welcome Section */}
        {user && (
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Καλώς ήρθατε, {user.first_name}!
            </h1>
            <p className="text-gray-600">
              {user.office_name || 'Dashboard διαχείρισης κτιρίου'}
            </p>
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
                <p className="text-sm font-medium text-gray-600">Ρόλος</p>
                <p className="text-lg font-bold text-gray-900 capitalize">
                  {user?.role === 'manager' ? 'Διαχειριστής' : user?.role || 'Χρήστης'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Buildings List */}
        {buildings.length > 0 ? (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Κτίρια</h2>
            <div className="space-y-4">
              {buildings.map((building) => (
                <div
                  key={building.id}
                  className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => {
                    // Navigate to building details
                    window.location.href = `/buildings/${building.id}`;
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{building.name}</h3>
                      <p className="text-sm text-gray-600">{building.address}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-600">Διαμερίσματα</p>
                      <p className="text-xl font-bold text-gray-900">{building.apartments_count || 0}</p>
                    </div>
                  </div>
                </div>
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
              <button
                onClick={() => {
                  // Navigate to add building
                  window.location.href = '/buildings/new';
                }}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
              >
                Προσθήκη Κτιρίου
              </button>
            </div>
          </div>
        )}
        </main>
      </div>
    </div>
  );
}

