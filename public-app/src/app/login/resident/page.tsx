'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Home, Mail, ArrowRight, Loader2, ChevronLeft, CheckCircle, Send } from 'lucide-react';
import BuildingRevealBackground from '@/components/BuildingRevealBackground';

export default function ResidentLoginPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const validateEmail = (email: string) => {
    return /\S+@\S+\.\S+/.test(email);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim()) {
      setError('Το email είναι υποχρεωτικό');
      return;
    }
    
    if (!validateEmail(email)) {
      setError('Το email δεν είναι έγκυρο');
      return;
    }

    setIsLoading(true);
    setError('');
    
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

      const response = await fetch(`${coreApiUrl}/api/users/request-magic-link/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Σφάλμα αποστολής');
      }

      // Always show success (for security - don't reveal if email exists)
      setSuccess(true);
      
    } catch (err) {
      console.error('Magic link request error:', err);
      setError(err instanceof Error ? err.message : 'Προέκυψε σφάλμα. Παρακαλώ δοκιμάστε ξανά.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 relative">
      <BuildingRevealBackground />
      
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <Link href="/login" className="flex items-center gap-2 text-slate-200 hover:text-white transition-colors">
              <ChevronLeft className="h-4 w-4" />
              <span className="text-sm">Πίσω στην επιλογή</span>
            </Link>
            <div className="flex items-center gap-4">
              <span className="text-sm text-slate-400">Είστε διαχειριστής;</span>
              <Link 
                href="/login/office" 
                className="text-sm font-medium text-blue-400 hover:text-blue-300 transition-colors"
              >
                Σύνδεση διαχειριστή
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md mx-auto">
          {/* App Description Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 mb-4">
              <Home className="h-6 w-6 text-emerald-400" />
              <span className="text-sm font-semibold text-slate-400 uppercase tracking-wider">
                Ένοικος / Ιδιοκτήτης
              </span>
            </div>
            <h2 className="text-xl font-bold text-slate-50 mb-3">
              Σύνδεση Ενοίκου
            </h2>
            <p className="text-sm text-slate-400 leading-relaxed max-w-md mx-auto">
              Θα σας στείλουμε έναν σύνδεσμο στο email σας για να συνδεθείτε χωρίς κωδικό.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-8">
            {!success ? (
              <>
                <div className="text-center mb-8">
                  <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-4">
                    <Send className="h-8 w-8 text-emerald-400" />
                  </div>
                  <h1 className="text-2xl font-bold text-slate-50 mb-2">
                    Σύνδεση με Email
                  </h1>
                  <p className="text-slate-400 text-sm">
                    Εισάγετε το email με το οποίο εγγραφήκατε
                  </p>
                </div>
                
                {error && (
                  <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg mb-6 text-sm">
                    {error}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-2">
                      Διεύθυνση Email
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-500" />
                      <input
                        type="email"
                        id="email"
                        name="email"
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value);
                          if (error) setError('');
                        }}
                        autoComplete="email"
                        className={`w-full pl-10 pr-4 py-3 bg-slate-800 border rounded-xl text-slate-200 placeholder-slate-500 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-colors ${
                          error ? 'border-red-500/50' : 'border-slate-700'
                        }`}
                        placeholder="το-email-σας@example.com"
                      />
                    </div>
                    <p className="mt-2 text-xs text-slate-500">
                      Χρησιμοποιήστε το email που δώσατε κατά την εγγραφή στο kiosk
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-emerald-500 text-slate-950 py-3 px-6 rounded-xl font-semibold hover:bg-emerald-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center shadow-lg shadow-emerald-500/25"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="animate-spin h-5 w-5 mr-2" />
                        Αποστολή...
                      </>
                    ) : (
                      <>
                        Στείλτε μου σύνδεσμο
                        <ArrowRight className="ml-2 h-5 w-5" />
                      </>
                    )}
                  </button>
                </form>

                <div className="mt-6 pt-6 border-t border-slate-700">
                  <p className="text-xs text-slate-500 text-center">
                    Δεν έχετε λογαριασμό; Σαρώστε το QR code στην είσοδο της πολυκατοικίας σας για να εγγραφείτε.
                  </p>
                </div>
              </>
            ) : (
              /* Success State */
              <div className="text-center py-6">
                <div className="w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-6">
                  <CheckCircle className="h-10 w-10 text-emerald-400" />
                </div>
                <h2 className="text-2xl font-bold text-slate-50 mb-3">
                  Ελέγξτε το email σας!
                </h2>
                <p className="text-slate-400 mb-6">
                  Αν υπάρχει λογαριασμός με το email <span className="text-emerald-400 font-medium">{email}</span>, 
                  θα λάβετε σύνδεσμο για να συνδεθείτε.
                </p>
                
                <div className="bg-slate-800/50 rounded-lg p-4 mb-6">
                  <p className="text-sm text-slate-400">
                    <strong className="text-slate-300">Σημείωση:</strong> Ο σύνδεσμος ισχύει για 1 ώρα. 
                    Ελέγξτε και τον φάκελο spam αν δεν το βρείτε.
                  </p>
                </div>

                <button
                  onClick={() => {
                    setSuccess(false);
                    setEmail('');
                  }}
                  className="text-emerald-400 hover:text-emerald-300 font-medium text-sm transition-colors"
                >
                  ← Δοκιμάστε με άλλο email
                </button>
              </div>
            )}
          </div>

          {/* Alternative login */}
          <div className="mt-6 text-center">
            <p className="text-sm text-slate-500">
              Θέλετε να συνδεθείτε με κωδικό;{' '}
              <Link href="/login/office" className="text-blue-400 hover:text-blue-300 transition-colors">
                Σύνδεση με κωδικό
              </Link>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

