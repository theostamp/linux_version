'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Loader2, CheckCircle, XCircle, Home, ArrowRight } from 'lucide-react';
import BuildingRevealBackground from '@/components/BuildingRevealBackground';

function MagicLoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [countdown, setCountdown] = useState(3);

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setErrorMessage('Λείπει το token σύνδεσης. Παρακαλώ ζητήστε νέο σύνδεσμο.');
      return;
    }

    // Αποθήκευση του token στο localStorage
    localStorage.setItem('access_token', token);
    
    // Επαλήθευση του token με κλήση στο /me
    const verifyToken = async () => {
      try {
        let coreApiUrl = process.env.NEXT_PUBLIC_CORE_API_URL;
        if (!coreApiUrl) {
          throw new Error('Backend API not configured');
        }

        // Ensure URL has protocol
        if (!coreApiUrl.startsWith('http://') && !coreApiUrl.startsWith('https://')) {
          coreApiUrl = `https://${coreApiUrl}`;
        }
        
        // Remove trailing slash
        coreApiUrl = coreApiUrl.replace(/\/$/, '');

        const response = await fetch(`${coreApiUrl}/api/users/me/`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          // Token is invalid or expired
          localStorage.removeItem('access_token');
          throw new Error('Ο σύνδεσμος έληξε ή δεν είναι έγκυρος. Παρακαλώ ζητήστε νέο.');
        }

        const userData = await response.json();
        
        // Αποθήκευση user data
        localStorage.setItem('user', JSON.stringify(userData));
        
        setStatus('success');
        
        // Countdown για redirect
        let count = 3;
        const interval = setInterval(() => {
          count--;
          setCountdown(count);
          if (count === 0) {
            clearInterval(interval);
            // Redirect to my-apartment for residents
            router.push('/my-apartment');
          }
        }, 1000);

        return () => clearInterval(interval);
        
      } catch (err) {
        console.error('Magic login verification error:', err);
        setStatus('error');
        setErrorMessage(err instanceof Error ? err.message : 'Σφάλμα επαλήθευσης. Παρακαλώ δοκιμάστε ξανά.');
      }
    };

    verifyToken();
  }, [token, router]);

  return (
    <div className="min-h-screen bg-slate-950 relative flex items-center justify-center">
      <BuildingRevealBackground />
      
      <div className="max-w-md w-full mx-4">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-8 backdrop-blur-sm">
          {status === 'loading' && (
            <div className="text-center py-8">
              <Loader2 className="h-16 w-16 text-emerald-400 animate-spin mx-auto mb-6" />
              <h1 className="text-2xl font-bold text-slate-50 mb-2">
                Σύνδεση...
              </h1>
              <p className="text-slate-400">
                Παρακαλώ περιμένετε ενώ επαληθεύουμε τα στοιχεία σας
              </p>
            </div>
          )}

          {status === 'success' && (
            <div className="text-center py-8">
              <div className="w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="h-10 w-10 text-emerald-400" />
              </div>
              <h1 className="text-2xl font-bold text-slate-50 mb-2">
                Επιτυχής σύνδεση! 🎉
              </h1>
              <p className="text-slate-400 mb-6">
                Καλώς ήρθατε πίσω στο New Concierge
              </p>
              
              <div className="bg-slate-800/50 rounded-lg p-4 mb-6">
                <p className="text-sm text-slate-400">
                  Ανακατεύθυνση σε <span className="text-emerald-400 font-bold">{countdown}</span> δευτερόλεπτα...
                </p>
              </div>

              <button
                onClick={() => router.push('/my-apartment')}
                className="inline-flex items-center gap-2 bg-emerald-500 text-slate-950 py-3 px-6 rounded-xl font-semibold hover:bg-emerald-400 transition-colors"
              >
                <Home className="h-5 w-5" />
                Το Διαμέρισμά μου
                <ArrowRight className="h-5 w-5" />
              </button>
            </div>
          )}

          {status === 'error' && (
            <div className="text-center py-8">
              <div className="w-20 h-20 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-6">
                <XCircle className="h-10 w-10 text-red-400" />
              </div>
              <h1 className="text-2xl font-bold text-slate-50 mb-2">
                Σφάλμα σύνδεσης
              </h1>
              <p className="text-slate-400 mb-6">
                {errorMessage}
              </p>
              
              <div className="space-y-3">
                <Link
                  href="/login/resident"
                  className="block w-full bg-emerald-500 text-slate-950 py-3 px-6 rounded-xl font-semibold hover:bg-emerald-400 transition-colors text-center"
                >
                  Ζητήστε νέο σύνδεσμο
                </Link>
                
                <Link
                  href="/login"
                  className="block w-full bg-slate-700 text-slate-200 py-3 px-6 rounded-xl font-medium hover:bg-slate-600 transition-colors text-center"
                >
                  Επιστροφή στη σύνδεση
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center mt-6">
          <p className="text-xs text-slate-500">
            Χρειάζεστε βοήθεια; Επικοινωνήστε με τον διαχειριστή της πολυκατοικίας σας.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function MagicLoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="h-12 w-12 text-emerald-400 animate-spin" />
      </div>
    }>
      <MagicLoginContent />
    </Suspense>
  );
}
