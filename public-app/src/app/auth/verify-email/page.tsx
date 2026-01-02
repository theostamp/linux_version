'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle, XCircle, Loader2, Building } from 'lucide-react';
import BuildingRevealBackground from '@/components/BuildingRevealBackground';

function VerifyEmailForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Επαληθεύουμε το email σας...');
  const [tenantUrl, setTenantUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Μη έγκυρο token επιβεβαίωσης');
      setError('Δεν παρέχεται token επιβεβαίωσης');
      return;
    }

    const verifyEmail = async () => {
      try {
        const response = await fetch(`/api/verify-email?token=${token}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Η επιβεβαίωση email απέτυχε');
        }

        setStatus('success');
        setMessage('Το email σας επιβεβαιώθηκε επιτυχώς!');
        setTenantUrl(data.tenantUrl || null);
      } catch (err) {
        console.error('Email verification error:', err);
        setStatus('error');
        setMessage('Η επιβεβαίωση email απέτυχε');
        setError(err instanceof Error ? err.message : 'Άγνωστο σφάλμα');
      }
    };

    verifyEmail();
  }, [token]);

  const renderIcon = () => {
    switch (status) {
      case 'loading':
        return <Loader2 className="h-16 w-16 text-accent-primary animate-spin" />;
      case 'success':
        return <CheckCircle className="h-16 w-16 text-emerald-600" />;
      case 'error':
        return <XCircle className="h-16 w-16 text-rose-600" />;
    }
  };

  return (
    <div className="min-h-screen bg-bg-app-main text-text-primary relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 -z-20 bg-[radial-gradient(circle_at_15%_10%,rgba(30,78,140,0.12),transparent_55%),radial-gradient(circle_at_85%_0%,rgba(46,124,144,0.12),transparent_50%)]" />
      <BuildingRevealBackground />
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

      <main className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-card-soft p-12">
            <div className="flex flex-col items-center">
              {renderIcon()}
              <div className="mt-8 w-full text-center">
                <h1 className="text-2xl md:text-3xl font-bold text-text-primary mb-4">
                  {status === 'success' ? 'Email Επιβεβαιώθηκε!' :
                   status === 'error' ? 'Η Επιβεβαίωση Απέτυχε' :
                   'Επαλήθευση Email'}
                </h1>
                <p className="text-lg text-text-secondary mb-8">
                  {message}
                </p>

                {status === 'success' && tenantUrl && (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-6 mb-8">
                    <div className="flex items-center justify-center mb-4">
                      <Building className="h-8 w-8 text-emerald-600 mr-2" />
                      <span className="text-lg font-semibold text-emerald-800">
                        Το Workspace σας είναι Έτοιμο!
                      </span>
                    </div>
                    <p className="text-emerald-700 mb-4">
                      Το κτίριό σας είναι πλέον προσβάσιμο στο:
                    </p>
                    <div className="bg-white border border-emerald-300 rounded-lg p-4 mb-4">
                      <code className="text-emerald-800 font-mono">
                        https://{tenantUrl}
                      </code>
                    </div>
                    <Link
                      href={`https://${tenantUrl}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center bg-emerald-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-600/20"
                    >
                      Πρόσβαση στον Πίνακα Ελέγχου
                    </Link>
                  </div>
                )}

                {status === 'success' && !tenantUrl && (
                  <div className="bg-accent-primary/10 border border-accent-primary/20 rounded-lg p-6 mb-8">
                    <p className="text-text-secondary mb-4">
                      Θα λάβετε σύντομα email με τα στοιχεία πρόσβασης στον πίνακα ελέγχου του κτιρίου σας.
                    </p>
                    <Link
                      href="/"
                      className="inline-block bg-accent-primary text-white px-6 py-3 rounded-lg font-semibold hover:opacity-90 transition-colors shadow-lg shadow-accent-primary/20"
                    >
                      Επιστροφή στην Αρχική
                    </Link>
                  </div>
                )}

                {status === 'error' && (
                  <div className="bg-rose-50 border border-rose-200 rounded-lg p-6 mb-8">
                    <p className="text-rose-700 mb-4">
                      {error || 'Προέκυψε σφάλμα κατά την επιβεβαίωση'}
                    </p>
                    <div className="space-y-3">
                      <Link
                        href="/signup"
                        className="inline-block bg-rose-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-rose-700 transition-colors shadow-lg shadow-rose-600/20"
                      >
                        Δοκιμάστε Ξανά
                      </Link>
                      <Link
                        href="/"
                        className="inline-block ml-4 border border-rose-300 text-rose-700 px-6 py-3 rounded-lg font-semibold hover:bg-rose-50 transition-colors"
                      >
                        Επιστροφή στην Αρχική
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-bg-app-main flex items-center justify-center">
        <div className="animate-pulse text-text-secondary">Φόρτωση...</div>
      </div>
    }>
      <VerifyEmailForm />
    </Suspense>
  );
}
