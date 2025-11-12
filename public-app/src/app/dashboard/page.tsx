'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Building, Loader2 } from 'lucide-react';

export default function DashboardPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check if user is authenticated
    const accessToken = localStorage.getItem('access_token');
    
    if (!accessToken) {
      router.push('/login?redirect=/dashboard');
      return;
    }

    // Get the current hostname to determine tenant
    const hostname = window.location.hostname;
    const tenantSubdomain = hostname.split('.')[0];
    
    // Get the backend API URL
    const coreApiUrl = process.env.NEXT_PUBLIC_CORE_API_URL || 'https://linuxversion-production.up.railway.app';
    
    // Verify token and get user info
    fetch(`${coreApiUrl}/api/users/me/`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    })
      .then(response => {
        if (!response.ok) {
          throw new Error('Authentication failed');
        }
        return response.json();
      })
      .then(userData => {
        setIsLoading(false);
        // For now, redirect to a placeholder or show tenant info
        // In the future, this should load the actual dashboard from Django backend
        setError(null);
      })
      .catch(err => {
        console.error('Dashboard error:', err);
        setError('Failed to load dashboard');
        setIsLoading(false);
        // Redirect to login if token is invalid
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        router.push('/login?redirect=/dashboard');
      });
  }, [router]);

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

  // Placeholder dashboard - in production this should load the actual dashboard from Django backend
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="flex items-center mb-6">
            <Building className="h-8 w-8 text-blue-600 mr-3" />
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <p className="text-blue-800">
              Το dashboard θα φορτωθεί σύντομα. Αυτή τη στιγμή, το tenant domain δείχνει στο Django backend.
            </p>
            <p className="text-blue-700 text-sm mt-2">
              Για να λειτουργήσει πλήρως, το tenant domain πρέπει να δείχνει στο Vercel (Next.js frontend) 
              και το Next.js να κάνει proxy για τα API calls προς το Django backend.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

