'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { CheckCircle, XCircle, AlertCircle, RefreshCw, Mail } from 'lucide-react';

const POLLING_INTERVAL = 3000; // 3 seconds
const MAX_ATTEMPTS = 20; // Poll for 60 seconds max

export default function SubscriptionSuccessPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const sessionId = searchParams.get('session_id');
  const [status, setStatus] = useState('processing');
  const [error, setError] = useState('');
  const [attempts, setAttempts] = useState(0);

  const handleRetry = () => {
    setStatus('processing');
    setError('');
    setAttempts(0);
    window.location.reload();
  };

  useEffect(() => {
    if (!sessionId) {
      setStatus('error');
      setError('Λείπουν οι πληροφορίες συνεδρίας πληρωμής.');
      return;
    }

    let currentAttempts = 0;
    const intervalId = setInterval(async () => {
      currentAttempts++;
      setAttempts(currentAttempts);

      try {
        // New API endpoint that checks the tenant creation status
        const response = await api.get(`/api/billing/subscription-status/${sessionId}/`);
        const data = response.data;

        if (data.status === 'completed') {
          clearInterval(intervalId);
          setStatus('completed');
          toast.success('Ο χώρος εργασίας σας είναι έτοιμος! Ανακατεύθυνση...');

          // Store tokens with correct keys
          if (data.access) {
            localStorage.setItem('access', data.access);
          }
          if (data.refresh) {
            localStorage.setItem('refresh', data.refresh);
          }
          
          // Redirect to dashboard (production uses main domain, not subdomains)
          setTimeout(() => {
            window.location.href = '/dashboard';
          }, 2000);

        } else if (data.status === 'failed') {
          clearInterval(intervalId);
          setStatus('error');
          setError(data.message || 'Παρουσιάστηκε σφάλμα κατά τη ρύθμιση.');
          toast.error(data.message || 'Παρουσιάστηκε σφάλμα κατά τη ρύθμιση.');
        }
        // If status is 'processing' or 'pending', we continue polling

      } catch (err) {
        // The API might return 404 initially, which is expected. We ignore it.
        console.log('Polling for subscription status...');
      }

      if (currentAttempts >= MAX_ATTEMPTS) {
        clearInterval(intervalId);
        setStatus('timeout');
        setError('Η ρύθμιση του χώρου εργασίας διαρκεί περισσότερο από το αναμενόμενο.');
        toast.warning('Θα ειδοποιηθείτε μέσω email όταν ο χώρος εργασίας είναι έτοιμος.');
      }
    }, POLLING_INTERVAL);

    return () => clearInterval(intervalId);
  }, [sessionId]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {status === 'processing' && (
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-6"></div>
            <h1 className="text-2xl font-bold text-gray-800 mb-2">Ολοκλήρωση Χώρου Εργασίας</h1>
            <p className="text-gray-600 mb-4">Παρακαλώ περιμένετε, ρυθμίζουμε τα πάντα για εσάς...</p>
            <div className="mt-6 pt-6 border-t border-gray-200">
              <p className="text-sm text-gray-500">Προσπάθεια {attempts} από {MAX_ATTEMPTS}</p>
              <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(attempts / MAX_ATTEMPTS) * 100}%` }}
                ></div>
              </div>
            </div>
          </div>
        )}

        {status === 'completed' && (
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-6">
              <CheckCircle className="h-10 w-10 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-800 mb-2">Επιτυχία!</h1>
            <p className="text-gray-600">Ο χώρος εργασίας σας είναι έτοιμος. Ανακατεύθυνση...</p>
          </div>
        )}

        {status === 'error' && (
          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-6">
              <XCircle className="h-10 w-10 text-red-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-800 mb-2 text-center">Παρουσιάστηκε Σφάλμα</h1>
            <p className="text-gray-600 text-center mb-6">{error}</p>
            <div className="space-y-3">
              <button
                onClick={handleRetry}
                className="w-full flex items-center justify-center px-4 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                <RefreshCw className="h-5 w-5 mr-2" />
                Προσπάθεια Ξανά
              </button>
              <a
                href="mailto:support@example.com"
                className="w-full flex items-center justify-center px-4 py-3 border border-gray-300 text-base font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                <Mail className="h-5 w-5 mr-2" />
                Επικοινωνία Υποστήριξης
              </a>
            </div>
          </div>
        )}

        {status === 'timeout' && (
          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-yellow-100 mb-6">
              <AlertCircle className="h-10 w-10 text-yellow-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-800 mb-2 text-center">Η Ρύθμιση Διαρκεί Περισσότερο</h1>
            <p className="text-gray-600 text-center mb-4">{error}</p>
            <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-6">
              <p className="text-sm text-blue-800 text-center">
                Θα λάβετε email όταν ο χώρος εργασίας σας είναι έτοιμος.
              </p>
            </div>
            <div className="space-y-3">
              <button
                onClick={handleRetry}
                className="w-full flex items-center justify-center px-4 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                <RefreshCw className="h-5 w-5 mr-2" />
                Έλεγχος Ξανά
              </button>
              <button
                onClick={() => router.push('/')}
                className="w-full flex items-center justify-center px-4 py-3 border border-gray-300 text-base font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                Επιστροφή στην Αρχική
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}