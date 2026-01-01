'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle, XCircle, Loader2, Building, Mail } from 'lucide-react';

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
        return <Loader2 className="h-16 w-16 text-blue-600 animate-spin" />;
      case 'success':
        return <CheckCircle className="h-16 w-16 text-green-600" />;
      case 'error':
        return <XCircle className="h-16 w-16 text-red-600" />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <Link href="/" className="flex items-center">
              <Building className="h-8 w-8 text-blue-600" />
              <span className="ml-2 text-2xl font-bold text-gray-900">New Concierge</span>
            </Link>
          </div>
        </div>
      </header>

      <main className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-2xl shadow-lg p-12">
            <div className="flex flex-col items-center">
              {renderIcon()}
              <div className="mt-8 w-full text-center">
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">
                  {status === 'success' ? 'Email Επιβεβαιώθηκε!' :
                   status === 'error' ? 'Η Επιβεβαίωση Απέτυχε' :
                   'Επαλήθευση Email'}
                </h1>
                <p className="text-lg text-gray-600 mb-8">
                  {message}
                </p>

                {status === 'success' && tenantUrl && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-8">
                    <div className="flex items-center justify-center mb-4">
                      <Building className="h-8 w-8 text-green-600 mr-2" />
                      <span className="text-lg font-semibold text-green-800">
                        Το Workspace σας είναι Έτοιμο!
                      </span>
                    </div>
                    <p className="text-green-700 mb-4">
                      Το κτίριό σας είναι πλέον προσβάσιμο στο:
                    </p>
                    <div className="bg-white border border-green-300 rounded-lg p-4 mb-4">
                      <code className="text-green-800 font-mono">
                        https://{tenantUrl}
                      </code>
                    </div>
                    <Link
                      href={`https://${tenantUrl}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center bg-green-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors"
                    >
                      Πρόσβαση στον Πίνακα Ελέγχου
                    </Link>
                  </div>
                )}

                {status === 'success' && !tenantUrl && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
                    <p className="text-blue-700 mb-4">
                      Θα λάβετε σύντομα email με τα στοιχεία πρόσβασης στον πίνακα ελέγχου του κτιρίου σας.
                    </p>
                    <Link
                      href="/"
                      className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                    >
                      Επιστροφή στην Αρχική
                    </Link>
                  </div>
                )}

                {status === 'error' && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-8">
                    <p className="text-red-700 mb-4">
                      {error || 'Προέκυψε σφάλμα κατά την επιβεβαίωση'}
                    </p>
                    <div className="space-y-3">
                      <Link
                        href="/signup"
                        className="inline-block bg-red-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-red-700 transition-colors"
                      >
                        Δοκιμάστε Ξανά
                      </Link>
                      <Link
                        href="/"
                        className="inline-block ml-4 border border-red-300 text-red-700 px-6 py-3 rounded-lg font-semibold hover:bg-red-50 transition-colors"
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-gray-600">Φόρτωση...</div>
      </div>
    }>
      <VerifyEmailForm />
    </Suspense>
  );
}
