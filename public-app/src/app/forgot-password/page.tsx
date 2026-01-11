'use client';

import { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Building, Mail, ArrowRight, Loader2, CheckCircle } from 'lucide-react';
import BuildingRevealBackground from '@/components/BuildingRevealBackground';

function ForgotPasswordForm() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim()) {
      setError('Το email είναι υποχρεωτικό');
      return;
    }

    if (!/\S+@\S+\.\S+/.test(email)) {
      setError('Το email δεν είναι έγκυρο');
      return;
    }

    setIsLoading(true);
    setError(null);

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

      // Call backend password reset endpoint
      const response = await fetch(`${coreApiUrl}/api/users/password-reset/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email.trim()
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Αποτυχία αποστολής email επαναφοράς κωδικού');
      }

      setIsSuccess(true);

    } catch (err) {
      console.error('Password reset error:', err);
      setError(err instanceof Error ? err.message : 'Προέκυψε σφάλμα. Παρακαλώ δοκιμάστε ξανά.');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg-app-main text-text-primary relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 -z-20 bg-[radial-gradient(circle_at_15%_10%,rgba(30,78,140,0.12),transparent_55%),radial-gradient(circle_at_85%_0%,rgba(46,124,144,0.12),transparent_50%)]" />
      <BuildingRevealBackground />
      {/* Header */}
      <header className="border-b border-gray-200 bg-white/80 backdrop-blur-sm sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-between gap-4 py-4">
            <Link href="/" className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-primary shadow-lg shadow-accent-primary/25">
                <Building className="h-5 w-5 text-white" />
              </span>
              <span className="flex flex-col leading-tight">
                <span className="text-xs uppercase tracking-widest text-text-secondary">Ψηφιακός Θυρωρός</span>
                <span className="text-lg font-bold text-accent-primary">newconcierge.app</span>
              </span>
            </Link>
            <Link href="/login" className="text-sm font-medium text-accent-primary hover:opacity-80 transition-opacity">
              Σύνδεση
            </Link>
          </div>
        </div>
      </header>

      <main className="py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md mx-auto">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-card-soft p-8">
            {!isSuccess ? (
              <>
                <div className="text-center mb-8">
                  <h1 className="page-title mb-2">
                    Επαναφορά Κωδικού
                  </h1>
                  <p className="text-text-secondary">
                    Εισάγετε το email σας και θα σας στείλουμε οδηγίες για την επαναφορά του κωδικού σας.
                  </p>
                </div>

                {error && (
                  <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-lg mb-6 text-sm">
                    {error}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-text-secondary mb-2">
                      Διεύθυνση Email
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-text-secondary" />
                      <input
                        type="email"
                        id="email"
                        name="email"
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value);
                          setError(null);
                        }}
                        autoComplete="email"
                        className={`w-full pl-10 pr-4 py-3 bg-white border rounded-xl text-text-primary placeholder-slate-400 focus:ring-2 focus:ring-accent-primary focus:border-accent-primary transition-colors ${
                          error ? 'border-rose-300' : 'border-gray-200'
                        }`}
                        placeholder="john@example.com"
                        required
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-accent-primary text-white py-3 px-6 rounded-xl font-semibold hover:opacity-90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center shadow-lg shadow-accent-primary/20"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="animate-spin h-5 w-5 mr-2" />
                        Αποστολή...
                      </>
                    ) : (
                      <>
                        Αποστολή Email Επαναφοράς
                        <ArrowRight className="ml-2 h-5 w-5" />
                      </>
                    )}
                  </button>
                </form>

                <div className="mt-6 text-center">
                  <Link href="/login" className="text-sm text-accent-primary hover:opacity-80">
                    ← Επιστροφή στη Σύνδεση
                  </Link>
                </div>
              </>
            ) : (
              <div className="text-center">
                <CheckCircle className="h-16 w-16 text-emerald-600 mx-auto mb-4" />
                <h1 className="page-title-sm mb-2">
                  Email Στάλθηκε!
                </h1>
                <p className="text-text-secondary mb-6">
                  Έχουμε στείλει οδηγίες επαναφοράς κωδικού στο <strong>{email}</strong>.
                  Παρακαλώ ελέγξτε το inbox σας και ακολουθήστε τις οδηγίες.
                </p>
                <div className="bg-accent-primary/10 border border-accent-primary/20 rounded-lg p-4 mb-6">
                  <p className="text-sm text-accent-primary">
                    <strong>Σημείωση:</strong> Αν δεν λάβετε το email εντός λίγων λεπτών,
                    ελέγξτε το spam folder σας.
                  </p>
                </div>
                <div className="flex space-x-4 justify-center">
                  <Link
                    href="/login"
                    className="bg-accent-primary text-white px-6 py-3 rounded-lg font-semibold hover:opacity-90 transition-colors shadow-lg shadow-accent-primary/20"
                  >
                    Επιστροφή στη Σύνδεση
                  </Link>
                  <button
                    onClick={() => {
                      setIsSuccess(false);
                      setEmail('');
                    }}
                    className="border border-gray-200 text-text-primary px-6 py-3 rounded-lg font-semibold hover:bg-bg-app-main transition-colors"
                  >
                    Στείλετε Ξανά
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-bg-app-main flex items-center justify-center">
        <div className="animate-pulse text-text-secondary">Φόρτωση...</div>
      </div>
    }>
      <ForgotPasswordForm />
    </Suspense>
  );
}
