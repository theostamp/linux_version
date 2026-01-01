'use client';

import { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Building, Mail, ArrowRight, Loader2, CheckCircle, XCircle } from 'lucide-react';

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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <Link href="/" className="flex items-center">
              <Building className="h-8 w-8 text-blue-600" />
              <span className="ml-2 text-2xl font-bold text-gray-900">New Concierge</span>
            </Link>
            <Link href="/login" className="text-gray-600 hover:text-gray-900">
              Σύνδεση
            </Link>
          </div>
        </div>
      </header>

      <main className="py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md mx-auto">
          <div className="bg-white rounded-2xl shadow-lg p-8">
            {!isSuccess ? (
              <>
                <div className="text-center mb-8">
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">
                    Επαναφορά Κωδικού
                  </h1>
                  <p className="text-gray-600">
                    Εισάγετε το email σας και θα σας στείλουμε οδηγίες για την επαναφορά του κωδικού σας.
                  </p>
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
                    {error}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                      Διεύθυνση Email
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
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
                        className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                          error ? 'border-red-300' : 'border-slate-200'
                        }`}
                        placeholder="john@example.com"
                        required
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
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
                  <Link href="/login" className="text-sm text-blue-600 hover:text-blue-500">
                    ← Επιστροφή στη Σύνδεση
                  </Link>
                </div>
              </>
            ) : (
              <div className="text-center">
                <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
                <h1 className="text-2xl font-bold text-gray-900 mb-2">
                  Email Στάλθηκε!
                </h1>
                <p className="text-gray-600 mb-6">
                  Έχουμε στείλει οδηγίες επαναφοράς κωδικού στο <strong>{email}</strong>.
                  Παρακαλώ ελέγξτε το inbox σας και ακολουθήστε τις οδηγίες.
                </p>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                  <p className="text-sm text-blue-800">
                    <strong>Σημείωση:</strong> Αν δεν λάβετε το email εντός λίγων λεπτών,
                    ελέγξτε το spam folder σας.
                  </p>
                </div>
                <div className="flex space-x-4 justify-center">
                  <Link
                    href="/login"
                    className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                  >
                    Επιστροφή στη Σύνδεση
                  </Link>
                  <button
                    onClick={() => {
                      setIsSuccess(false);
                      setEmail('');
                    }}
                    className="border border-slate-200 text-gray-700 px-6 py-3 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-gray-600">Φόρτωση...</div>
      </div>
    }>
      <ForgotPasswordForm />
    </Suspense>
  );
}
