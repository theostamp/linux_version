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
import SubscriptionGate from '@/components/SubscriptionGate';
import LoginForm from '@/components/LoginForm';
import PublicTenantLanding from '@/components/PublicTenantLanding';
import { useRouter } from 'next/navigation';
import { 
  Bell, 
  FileText, 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  TrendingUp,
  Users,
  Calendar,
  ArrowRight,
  Thermometer,
  Cloud,
  Sun,
  CloudRain,
  CloudSnow,
  User,
  CreditCard
} from 'lucide-react';

export default function DashboardPage() {
  return (
    <AuthGate
      role="any"
      fallback={
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
            <h1 className="text-3xl font-bold tracking-tight text-gray-900 mb-6 text-center">Σύνδεση</h1>
            <LoginForm />
          </div>
        </div>
      }
    >
      <SubscriptionGate 
        requiredStatus="any"
        fallback={<PublicTenantLanding />}
      >
        <DashboardContent />
      </SubscriptionGate>
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
  const [error, setError] = useState<{
    type: 'permission' | 'network' | 'general';
    message: string;
  } | null>(null);
  
  // Weather state
  const [weather, setWeather] = useState<{
    temperature: number;
    condition: string;
    icon: string;
  } | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  
  // Subscription state
  const [subscriptionInfo, setSubscriptionInfo] = useState<{
    plan_name: string;
    status: string;
    expires_at: string;
    usage_percentage: number;
  } | null>(null);
  const [subscriptionLoading, setSubscriptionLoading] = useState(false);

  // Fetch weather data
  useEffect(() => {
    const fetchWeather = async () => {
      setWeatherLoading(true);
      try {
        // Try multiple weather APIs for better reliability
        const API_KEY = process.env.NEXT_PUBLIC_OPENWEATHER_API_KEY;
        
        if (!API_KEY || API_KEY === 'demo') {
          // Demo data for development
          setWeather({
            temperature: 22,
            condition: 'Αίθριος',
            icon: 'clear'
          });
          return;
        }

        // Default to Athens coordinates if no building location
        const lat = 37.9838;
        const lon = 23.7275;
        
        // Try OpenWeatherMap first
        try {
          const response = await fetch(
            `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric&lang=el`
          );
          
          if (response.ok) {
            const data = await response.json();
            setWeather({
              temperature: Math.round(data.main.temp),
              condition: data.weather[0].description,
              icon: data.weather[0].main.toLowerCase()
            });
            return;
          }
        } catch (err) {
          console.log('OpenWeatherMap failed, trying alternative...');
        }

        // Fallback: Use a free weather API without key
        try {
          const response = await fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code&timezone=auto`
          );
          
          if (response.ok) {
            const data = await response.json();
            const temp = Math.round(data.current.temperature_2m);
            
            // Convert WMO weather codes to descriptions
            const weatherCodes: { [key: number]: { description: string; icon: string } } = {
              0: { description: 'Αίθριος', icon: 'clear' },
              1: { description: 'Αίθριος', icon: 'clear' },
              2: { description: 'Νεφελώδης', icon: 'clouds' },
              3: { description: 'Νεφελώδης', icon: 'clouds' },
              45: { description: 'Ομίχλη', icon: 'clouds' },
              48: { description: 'Ομίχλη', icon: 'clouds' },
              51: { description: 'Ψιλή βροχόπτωση', icon: 'rain' },
              53: { description: 'Βροχόπτωση', icon: 'rain' },
              55: { description: 'Ισχυρή βροχόπτωση', icon: 'rain' },
              61: { description: 'Βροχόπτωση', icon: 'rain' },
              63: { description: 'Ισχυρή βροχόπτωση', icon: 'rain' },
              65: { description: 'Ισχυρή βροχόπτωση', icon: 'rain' },
              71: { description: 'Χιόνι', icon: 'snow' },
              73: { description: 'Ισχυρό χιόνι', icon: 'snow' },
              75: { description: 'Ισχυρό χιόνι', icon: 'snow' },
              95: { description: 'Καταιγίδα', icon: 'rain' },
            };
            
            const weatherInfo = weatherCodes[data.current.weather_code] || { description: 'Αίθριος', icon: 'clear' };
            
            setWeather({
              temperature: temp,
              condition: weatherInfo.description,
              icon: weatherInfo.icon
            });
            return;
          }
        } catch (err) {
          console.log('Alternative API failed, using demo data...');
        }

        // Final fallback to demo data
        setWeather({
          temperature: 22,
          condition: 'Αίθριος',
          icon: 'clear'
        });
        
      } catch (err) {
        console.error('All weather APIs failed:', err);
        // Fallback to demo data
        setWeather({
          temperature: 22,
          condition: 'Αίθριος',
          icon: 'clear'
        });
      } finally {
        setWeatherLoading(false);
      }
    };

    fetchWeather();
  }, []);

  // Fetch subscription info
  useEffect(() => {
    const fetchSubscriptionInfo = async () => {
      if (!user) return;
      
      setSubscriptionLoading(true);
      try {
        // Mock data for now - we can integrate with real API later
        setSubscriptionInfo({
          plan_name: 'Premium Plan',
          status: 'active',
          expires_at: '2024-12-31',
          usage_percentage: 65
        });
      } catch (err) {
        console.error('Failed to load subscription info:', err);
      } finally {
        setSubscriptionLoading(false);
      }
    };

    fetchSubscriptionInfo();
  }, [user]);

  useEffect(() => {
    if (!isAuthReady || authLoading || !user) return;

    const loadAll = async () => {
      setLoadingData(true);
      try {
        // Χρησιμοποιούμε την ίδια λογική με το requests page
        // Αν είναι null, σημαίνει "όλα τα κτίρια" και περνάμε null στο API
        const buildingId = selectedBuilding?.id ?? currentBuilding?.id ?? null;

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

        setError(null);
      } catch (err: any) {
        console.error('Dashboard load failed:', err);

        // Check if it's a 403 permission error
        if (err?.response?.status === 403 || err?.status === 403 || err?.message?.includes('403')) {
          setError({
            type: 'permission',
            message: 'Δεν έχετε δικαιώματα πρόσβασης σε αυτά τα δεδομένα. Παρακαλώ επικοινωνήστε με τον διαχειριστή για να σας παραχωρήσει τα απαραίτητα δικαιώματα.'
          });
        } else if (err?.message?.includes('fetch') || err?.message?.includes('network')) {
          setError({
            type: 'network',
            message: 'Αδυναμία σύνδεσης με τον διακομιστή. Παρακαλώ ελέγξτε τη σύνδεσή σας στο διαδίκτυο.'
          });
        } else {
          setError({
            type: 'general',
            message: 'Παρουσιάστηκε ένα σφάλμα κατά τη φόρτωση των δεδομένων. Παρακαλώ δοκιμάστε ξανά.'
          });
        }
      } finally {
        setLoadingData(false);
      }
    };

    loadAll();
  }, [isAuthReady, authLoading, user, currentBuilding, selectedBuilding]);

  useEffect(() => {
    if (!user?.is_staff) return;

    const loadObligations = async () => {
      try {
        // Μόνο αν είναι επιλεγμένο συγκεκριμένο κτίριο φορτώνουμε obligations
        if (!selectedBuilding?.id) {
          setObligations(null);
          return;
        }
        
        const obligationsData = await fetchObligationsSummary();
        setObligations(obligationsData);
      } catch (err) {
        console.error('Failed to load obligations:', err);
      }
    };

    loadObligations();
  }, [user?.is_staff, selectedBuilding, currentBuilding]);

  // Weather icon component
  const WeatherIcon = ({ icon }: { icon: string }) => {
    switch (icon) {
      case 'clear':
        return <Sun className="w-4 h-4 text-yellow-400" />;
      case 'clouds':
        return <Cloud className="w-4 h-4 text-gray-400" />;
      case 'rain':
        return <CloudRain className="w-4 h-4 text-blue-400" />;
      case 'snow':
        return <CloudSnow className="w-4 h-4 text-blue-200" />;
      default:
        return <Thermometer className="w-4 h-4 text-blue-300" />;
    }
  };

  if (loadingData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">Φόρτωση dashboard...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 border border-gray-200">
          <div className="text-center">
            {/* Icon based on error type */}
            {error.type === 'permission' && (
              <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                <AlertCircle className="w-8 h-8 text-red-600" />
              </div>
            )}
            {error.type === 'network' && (
              <div className="mx-auto w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mb-4">
                <AlertCircle className="w-8 h-8 text-yellow-600" />
              </div>
            )}
            {error.type === 'general' && (
              <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <AlertCircle className="w-8 h-8 text-gray-600" />
              </div>
            )}

            {/* Error Title */}
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {error.type === 'permission' && 'Δεν Έχετε Πρόσβαση'}
              {error.type === 'network' && 'Πρόβλημα Σύνδεσης'}
              {error.type === 'general' && 'Κάτι Πήγε Στραβά'}
            </h2>

            {/* Error Message */}
            <p className="text-gray-600 mb-6">
              {error.message}
            </p>

            {/* Action Buttons */}
            <div className="flex flex-col gap-3">
              {error.type === 'permission' && (
                <>
                  <button
                    onClick={() => router.push('/my-profile')}
                    className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center"
                  >
                    <User className="w-4 h-4 mr-2" />
                    Δες το Προφίλ Μου
                  </button>
                  <button
                    onClick={() => window.location.reload()}
                    className="w-full bg-gray-100 text-gray-700 px-6 py-3 rounded-lg font-semibold hover:bg-gray-200 transition-colors"
                  >
                    Δοκιμή Ξανά
                  </button>
                </>
              )}
              {error.type === 'network' && (
                <button
                  onClick={() => window.location.reload()}
                  className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                >
                  Δοκιμή Ξανά
                </button>
              )}
              {error.type === 'general' && (
                <button
                  onClick={() => window.location.reload()}
                  className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                >
                  Επαναφόρτωση Σελίδας
                </button>
              )}
            </div>

            {/* Support Link */}
            {error.type === 'permission' && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <p className="text-sm text-gray-500">
                  Χρειάζεστε βοήθεια; Επικοινωνήστε με τον διαχειριστή του συστήματος.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  const activeVotes = votes.filter((v) => {
    const now = new Date();
    const start = new Date(v.start_date);
    const end = new Date(v.end_date);
    return now >= start && now <= end;
  });

  const filteredRequests = onlyMine 
    ? requests.filter((r) => r.user_id === user?.id)
    : requests;

  const requestCards = [
    {
      key: 'open',
      label: 'Ανοιχτά',
      icon: '🔴',
      bgColor: 'bg-red-500',
      apiCondition: (r: UserRequest) => r.status === 'open',
      link: '/requests?status=open'
    },
    {
      key: 'in_progress',
      label: 'Σε Εξέλιξη',
      icon: '🟡',
      bgColor: 'bg-yellow-500',
      apiCondition: (r: UserRequest) => r.status === 'in_progress',
      link: '/requests?status=in_progress'
    },
    {
      key: 'resolved',
      label: 'Ολοκληρωμένα',
      icon: '🟢',
      bgColor: 'bg-green-500',
      apiCondition: (r: UserRequest) => r.status === 'resolved',
      link: '/requests?status=resolved'
    },
    {
      key: 'total',
      label: 'Σύνολο',
      icon: '📊',
      bgColor: 'bg-blue-500',
      link: '/requests'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-6 text-white relative group">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h1 className="text-2xl font-bold mb-2">
              Καλώς ήρθες, {user?.first_name || user?.email}!
            </h1>
            <div className="relative">
              <p className="text-blue-100">
                Βρίσκεσαι στο κτίριο: <span className="font-semibold">
                  {selectedBuilding ? selectedBuilding.name : 'Όλα τα Κτίρια'}
                </span>
              </p>
              
              {/* Hover Tooltip */}
              <div className="absolute bottom-full left-0 mb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-10">
                <div className="bg-white/95 backdrop-blur-sm text-gray-800 text-xs rounded-lg p-2 shadow-lg border border-gray-200 max-w-xs">
                  <div className="flex items-start gap-2">
                    <div className="w-2 h-2 bg-blue-400 rounded-full mt-1 flex-shrink-0"></div>
                    <div>
                      <p className="font-medium mb-1 text-xs">Πληροφορίες Κτιρίου</p>
                      <p className="text-gray-600 text-xs leading-relaxed">
                        Είσαι στο κτίριο <strong>
                          {selectedBuilding ? selectedBuilding.name : 'Όλα τα Κτίρια'}
                        </strong>. 
                        Για αλλαγή, χρησιμοποίησε τον επιλογέα στο sidebar.
                      </p>
                    </div>
                  </div>
                  {/* Arrow */}
                  <div className="absolute top-full left-4 w-0 h-0 border-l-3 border-r-3 border-t-3 border-transparent border-t-white/95"></div>
                </div>
              </div>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-blue-200">Σήμερα</p>
            <p className="text-lg font-semibold">
              {new Date().toLocaleDateString('el-GR', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </p>
            
            {/* Weather Information */}
            {weather && (
              <div className="mt-2 flex items-center justify-end gap-2">
                <WeatherIcon icon={weather.icon} />
                <div className="text-right">
                  <p className="text-sm font-semibold">{weather.temperature}°C</p>
                  <p className="text-xs text-blue-200 capitalize">{weather.condition}</p>
                </div>
              </div>
            )}
            
            {weatherLoading && (
              <div className="mt-2 flex items-center justify-end gap-2">
                <div className="animate-spin rounded-full h-3 w-3 border-b border-white"></div>
                <span className="text-xs text-blue-200">Φόρτωση...</span>
              </div>
            )}
          </div>
        </div>
        
        {/* Info Icon */}
        <div className="absolute top-4 right-4">
          <div className="w-5 h-5 bg-white/20 rounded-full flex items-center justify-center group-hover:bg-white/30 transition-colors duration-200">
            <span className="text-white text-xs font-bold">i</span>
          </div>
        </div>
      </div>

      {/* Quick Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link href="/announcements" className="group">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 hover:shadow-md transition-all duration-200 group-hover:scale-105">
            <div className="flex items-center justify-between mb-2">
              <Bell className="w-6 h-6 text-blue-600" />
              <span className="text-sm font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded-full">
                {announcements.length}
              </span>
            </div>
            <h3 className="font-semibold text-gray-900">Ανακοινώσεις</h3>
            <p className="text-sm text-gray-600 mt-1">Πρόσφατες ανακοινώσεις</p>
          </div>
        </Link>
        
        <Link href="/votes" className="group">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 hover:shadow-md transition-all duration-200 group-hover:scale-105">
            <div className="flex items-center justify-between mb-2">
              <CheckCircle className="w-6 h-6 text-green-600" />
              <span className="text-sm font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full">
                {activeVotes.length}
              </span>
            </div>
            <h3 className="font-semibold text-gray-900">Ψηφοφορίες</h3>
            <p className="text-sm text-gray-600 mt-1">Ενεργές ψηφοφορίες</p>
          </div>
        </Link>
        
        <Link href="/requests" className="group">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 hover:shadow-md transition-all duration-200 group-hover:scale-105">
            <div className="flex items-center justify-between mb-2">
              <FileText className="w-6 h-6 text-orange-600" />
              <span className="text-sm font-medium text-orange-600 bg-orange-50 px-2 py-1 rounded-full">
                {requests.filter((r) => r.status === 'open').length}
              </span>
            </div>
            <h3 className="font-semibold text-gray-900">Αιτήματα</h3>
            <p className="text-sm text-gray-600 mt-1">Εκκρεμή αιτήματα</p>
          </div>
        </Link>
        
        <Link href="/buildings" className="group">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 hover:shadow-md transition-all duration-200 group-hover:scale-105">
            <div className="flex items-center justify-between mb-2">
              <Users className="w-6 h-6 text-purple-600" />
              <span className="text-sm font-medium text-purple-600 bg-purple-50 px-2 py-1 rounded-full">
                {buildings.length}
              </span>
            </div>
            <h3 className="font-semibold text-gray-900">Κτίρια</h3>
            <p className="text-sm text-gray-600 mt-1">Διαχείριση κτιρίων</p>
          </div>
        </Link>
      </div>

      {/* Personal Management Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link href="/my-profile" className="group">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-sm border border-blue-200 p-6 text-white hover:shadow-md transition-all duration-200 group-hover:scale-105">
            <div className="flex items-center justify-between mb-3">
              <User className="w-8 h-8 text-white" />
              <div className="text-right">
                <p className="text-sm text-blue-100">Προφίλ</p>
                <p className="text-lg font-bold">Διαχείριση</p>
              </div>
            </div>
            <h3 className="font-semibold text-white mb-2">Το Προφίλ Μου</h3>
            <p className="text-sm text-blue-100">Ενημέρωση προσωπικών στοιχείων και ρυθμίσεων</p>
            <div className="mt-3 flex items-center text-blue-100">
              <span className="text-sm">Δες το προφίλ σου</span>
              <ArrowRight className="w-4 h-4 ml-2" />
            </div>
          </div>
        </Link>
        
        <Link href="/my-subscription" className="group">
          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-sm border border-green-200 p-6 text-white hover:shadow-md transition-all duration-200 group-hover:scale-105">
            <div className="flex items-center justify-between mb-3">
              <CreditCard className="w-8 h-8 text-white" />
              <div className="text-right">
                <p className="text-sm text-green-100">Συνδρομή</p>
                <p className="text-lg font-bold">Διαχείριση</p>
              </div>
            </div>
            <h3 className="font-semibold text-white mb-2">Η Συνδρομή Μου</h3>
            <p className="text-sm text-green-100">Διαχείριση συνδρομής και χρέωσης</p>
            <div className="mt-3 flex items-center text-green-100">
              <span className="text-sm">Διαχείριση συνδρομής</span>
              <ArrowRight className="w-4 h-4 ml-2" />
            </div>
          </div>
        </Link>
      </div>

      {/* Subscription Status Section */}
      {subscriptionInfo && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold tracking-tight text-gray-800 flex items-center">
              <CreditCard className="w-5 h-5 mr-2 text-green-600" />
              Κατάσταση Συνδρομής
            </h2>
            <Link 
              href="/my-subscription" 
              className="text-sm text-green-600 hover:text-green-700 font-medium flex items-center"
            >
              Διαχείριση <ArrowRight className="w-4 h-4 ml-1" />
            </Link>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="text-sm text-green-600 font-medium">Σχέδιο</p>
                  <p className="text-lg font-bold text-green-800">{subscriptionInfo.plan_name}</p>
                </div>
                <div className={`w-3 h-3 rounded-full ${subscriptionInfo.status === 'active' ? 'bg-green-500' : 'bg-red-500'}`}></div>
              </div>
              <p className="text-xs text-green-600 capitalize">{subscriptionInfo.status}</p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="text-sm text-blue-600 font-medium">Λήξη</p>
                  <p className="text-lg font-bold text-blue-800">
                    {new Date(subscriptionInfo.expires_at).toLocaleDateString('el-GR')}
                  </p>
                </div>
                <Calendar className="w-5 h-5 text-blue-600" />
              </div>
              <p className="text-xs text-blue-600">
                {Math.ceil((new Date(subscriptionInfo.expires_at).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} ημέρες απομένουν
              </p>
            </div>

            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="text-sm text-purple-600 font-medium">Χρήση</p>
                  <p className="text-lg font-bold text-purple-800">{subscriptionInfo.usage_percentage}%</p>
                </div>
                <TrendingUp className="w-5 h-5 text-purple-600" />
              </div>
              <div className="w-full bg-purple-200 rounded-full h-2 mt-2">
                <div 
                  className="bg-purple-600 h-2 rounded-full transition-all duration-300" 
                  style={{ width: `${subscriptionInfo.usage_percentage}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      )}


      {/* Compact Announcements Section */}
      {announcements.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-semibold tracking-tight text-gray-800 flex items-center">
              <Bell className="w-5 h-5 mr-2 text-blue-600" />
              Πρόσφατες Ανακοινώσεις
            </h2>
            <Link 
              href="/announcements" 
              className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center"
            >
              Δες όλες <ArrowRight className="w-4 h-4 ml-1" />
            </Link>
          </div>
          <div className="space-y-3">
            {announcements.slice(0, 3).map((announcement) => {
              const start = announcement.start_date ? new Date(announcement.start_date) : new Date();
              const end = announcement.end_date ? new Date(announcement.end_date) : new Date();
              const now = new Date();
              let status = 'Ενεργή';
              if (now < start) status = 'Προσεχώς';
              else if (now > end) status = 'Ληγμένη';

              return (
                <Link 
                  key={announcement.id} 
                  href={`/announcements/${announcement.id}`}
                  className="block p-4 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors duration-200"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900 mb-1 line-clamp-1">
                        {announcement.title}
                      </h3>
                      <p className="text-sm text-gray-600 line-clamp-2">
                        {announcement.description}
                      </p>
                      <div className="flex items-center mt-2 text-xs text-gray-500">
                        <Calendar className="w-3 h-3 mr-1" />
                        {start.toLocaleDateString('el-GR')} - {end.toLocaleDateString('el-GR')}
                        <span className={`ml-2 px-2 py-1 rounded-full text-xs ${
                          status === 'Ενεργή' ? 'bg-green-100 text-green-700' :
                          status === 'Προσεχώς' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {status}
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Enhanced Requests Overview */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-semibold tracking-tight text-gray-800 flex items-center">
            <TrendingUp className="w-5 h-5 mr-2 text-blue-600" />
            Επισκόπηση Αιτημάτων
          </h2>
          <div className="flex items-center gap-4">
            {user && (
              <label className="inline-flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2 hover:bg-gray-100 transition-colors duration-200">
                <input 
                  type="checkbox" 
                  checked={onlyMine} 
                  onChange={() => setOnlyMine(!onlyMine)}
                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                />
                <span className="text-sm font-medium text-gray-700">Μόνο δικά μου</span>
              </label>
            )}
            <Link 
              href="/requests" 
              className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center"
            >
              Δες όλα <ArrowRight className="w-4 h-4 ml-1" />
            </Link>
          </div>
        </div>

        {/* Request Status Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <AlertCircle className="w-6 h-6 text-red-600" />
              <span className="text-2xl font-bold text-red-600">
                {filteredRequests.filter((r) => r.status === 'open').length}
              </span>
            </div>
            <h3 className="font-medium text-red-900">Ανοιχτά</h3>
            <p className="text-sm text-red-600">Αναμένουν απάντηση</p>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <Clock className="w-6 h-6 text-yellow-600" />
              <span className="text-2xl font-bold text-yellow-600">
                {filteredRequests.filter((r) => r.status === 'in_progress').length}
              </span>
            </div>
            <h3 className="font-medium text-yellow-900">Σε Εξέλιξη</h3>
            <p className="text-sm text-yellow-600">Επεξεργάζονται</p>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <CheckCircle className="w-6 h-6 text-green-600" />
              <span className="text-2xl font-bold text-green-600">
                {filteredRequests.filter((r) => r.status === 'resolved').length}
              </span>
            </div>
            <h3 className="font-medium text-green-900">Ολοκληρωμένα</h3>
            <p className="text-sm text-green-600">Επιλύθηκαν</p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <FileText className="w-6 h-6 text-blue-600" />
              <span className="text-2xl font-bold text-blue-600">
                {filteredRequests.length}
              </span>
            </div>
            <h3 className="font-medium text-blue-900">Σύνολο</h3>
            <p className="text-sm text-blue-600">Όλα τα αιτήματα</p>
          </div>
        </div>

        {/* Recent Requests */}
        {filteredRequests.length > 0 && (
          <div>
            <h3 className="text-md font-semibold text-gray-900 mb-3">Πρόσφατα Αιτήματα</h3>
            <div className="space-y-2">
              {filteredRequests.slice(0, 5).map((request) => (
                <Link 
                  key={request.id} 
                  href={`/requests/${request.id}`}
                  className="block p-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors duration-200"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900 line-clamp-1">
                        {request.title}
                      </h4>
                      <p className="text-sm text-gray-600 line-clamp-1">
                        {request.description}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        request.status === 'open' ? 'bg-red-100 text-red-700' :
                        request.status === 'in_progress' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-green-100 text-green-700'
                      }`}>
                        {request.status === 'open' ? 'Ανοιχτό' :
                         request.status === 'in_progress' ? 'Σε Εξέλιξη' : 'Ολοκληρωμένο'}
                      </span>
                      <ArrowRight className="w-4 h-4 text-gray-400" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Staff Actions Section */}
      {user?.is_staff && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-2xl font-semibold tracking-tight text-gray-800 mb-4 flex items-center">
            <Users className="w-5 h-5 mr-2 text-blue-600" />
            Ενέργειες Διαχείρισης
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Link href="/announcements/new" className="group">
              <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg p-4 text-white hover:from-blue-600 hover:to-blue-700 transition-all duration-200 group-hover:scale-105 shadow-lg">
                <div className="flex items-center">
                  <Bell className="w-6 h-6 mr-3" />
                  <div>
                    <h3 className="font-semibold">Δημιουργία Ανακοίνωσης</h3>
                    <p className="text-blue-100 text-sm">Νέα ανακοίνωση για τους κατοίκους</p>
                  </div>
                </div>
              </div>
            </Link>
            
            <Link href="/votes/new" className="group">
              <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-lg p-4 text-white hover:from-green-600 hover:to-green-700 transition-all duration-200 group-hover:scale-105 shadow-lg">
                <div className="flex items-center">
                  <CheckCircle className="w-6 h-6 mr-3" />
                  <div>
                    <h3 className="font-semibold">Νέα Ψηφοφορία</h3>
                    <p className="text-green-100 text-sm">Δημιουργία νέας ψηφοφορίας</p>
                  </div>
                </div>
              </div>
            </Link>
          </div>

          {/* Obligations Section */}
          {obligations && (
            <div className="mt-6">
              <h3 className="text-md font-semibold text-gray-900 mb-4 flex items-center">
                <AlertCircle className="w-5 h-5 mr-2 text-orange-600" />
                Εκκρεμότητες Διαχείρισης
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-red-600">Απλήρωτες Συνεισφορές</p>
                      <p className="text-2xl font-bold text-red-600">{obligations.pending_payments}</p>
                    </div>
                    <span className="text-2xl">💰</span>
                  </div>
                </div>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-yellow-600">Εκκρεμείς Συντηρήσεις</p>
                      <p className="text-2xl font-bold text-yellow-600">{obligations.maintenance_tickets}</p>
                    </div>
                    <span className="text-2xl">🔧</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}



      {/* Analytics Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Requests Distribution Chart */}
        {filteredRequests.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <TrendingUp className="w-5 h-5 mr-2 text-blue-600" />
              Κατανομή Αιτημάτων
            </h3>
            <ResponsiveContainer width="100%" height={250}>
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
                  outerRadius={70} 
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  <Cell fill="#ef4444" />
                  <Cell fill="#f59e0b" />
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
              <TrendingUp className="w-5 h-5 mr-2 text-blue-600" />
              Top Υποστηριζόμενα Αιτήματα
            </h3>
            <div className="space-y-3">
              {topRequests.slice(0, 5).map((r) => (
                <Link key={r.id} href={`/requests/${r.id}`} className="block">
                  <div className="p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors duration-200">
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
  );
}