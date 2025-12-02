'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, CheckCircle, XCircle, Home } from 'lucide-react';
import Link from 'next/link';

function MagicLoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const performMagicLogin = async () => {
      if (!token) {
        setStatus('error');
        setError('Δεν βρέθηκε token στο URL');
        return;
      }

      try {
        // Verify the token by calling the API
        const response = await fetch('/api/users/me/', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const userData = await response.json();
          
          // Store the token in localStorage
          localStorage.setItem('access_token', token);
          
          // Store user data
          localStorage.setItem('user', JSON.stringify(userData));
          
          setStatus('success');
          
          // Redirect to my-apartment after a brief delay
          setTimeout(() => {
            router.push('/my-apartment');
          }, 1500);
        } else {
          setStatus('error');
          setError('Ο σύνδεσμος έχει λήξει ή δεν είναι έγκυρος. Παρακαλώ δοκιμάστε να σκανάρετε ξανά το QR code.');
        }
      } catch (err) {
        console.error('Magic login error:', err);
        setStatus('error');
        setError('Παρουσιάστηκε σφάλμα. Παρακαλώ δοκιμάστε ξανά.');
      }
    };

    performMagicLogin();
  }, [token, router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center p-4">
      <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-8 max-w-md w-full text-center border border-white/20 shadow-2xl">
        {status === 'loading' && (
          <>
            <div className="flex justify-center mb-6">
              <Loader2 className="w-16 h-16 text-blue-400 animate-spin" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Σύνδεση...</h1>
            <p className="text-white/60">Παρακαλώ περιμένετε</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="flex justify-center mb-6">
              <CheckCircle className="w-16 h-16 text-green-400" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Επιτυχής Σύνδεση! 🎉</h1>
            <p className="text-white/60 mb-4">Μεταφέρεστε στο διαμέρισμά σας...</p>
            <div className="flex justify-center">
              <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
            </div>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="flex justify-center mb-6">
              <XCircle className="w-16 h-16 text-red-400" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Σφάλμα Σύνδεσης</h1>
            <p className="text-white/60 mb-6">{error}</p>
            
            <div className="flex flex-col gap-3">
              <Link 
                href="/login"
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 px-6 rounded-xl transition-all flex items-center justify-center gap-2"
              >
                Σύνδεση με Email & Κωδικό
              </Link>
              
              <Link 
                href="/"
                className="w-full bg-white/10 hover:bg-white/20 text-white font-semibold py-3 px-6 rounded-xl transition-all flex items-center justify-center gap-2"
              >
                <Home className="w-5 h-5" />
                Αρχική Σελίδα
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function MagicLoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center p-4">
        <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-8 max-w-md w-full text-center border border-white/20">
          <Loader2 className="w-16 h-16 text-blue-400 animate-spin mx-auto" />
          <p className="text-white/60 mt-4">Φόρτωση...</p>
        </div>
      </div>
    }>
      <MagicLoginContent />
    </Suspense>
  );
}

