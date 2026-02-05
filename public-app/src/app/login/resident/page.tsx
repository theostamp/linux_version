'use client';

import { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Home, Mail, Phone, ArrowRight, Loader2, ChevronLeft } from 'lucide-react';
import BuildingRevealBackground from '@/components/BuildingRevealBackground';
import { getDefaultLandingPath, type RoleDescriptor } from '@/lib/roleUtils';
import { storeAuthTokens } from '@/lib/authTokens';

interface UserData extends RoleDescriptor {
  is_superuser?: boolean;
  is_staff?: boolean;
  role?: string;
}

function getRedirectForRole(user: UserData | null, explicitRedirect?: string): string {
  if (explicitRedirect) return explicitRedirect;
  return getDefaultLandingPath(user);
}

function ResidentLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const explicitRedirect = searchParams.get('redirect');

  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const validateEmail = (email: string) => {
    return /\S+@\S+\.\S+/.test(email);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim()) {
      setError('Παρακαλώ εισάγετε το email σας');
      return;
    }

    if (!validateEmail(email)) {
      setError('Το email δεν είναι έγκυρο');
      return;
    }

    if (!phone.trim()) {
      setError('Παρακαλώ εισάγετε το τηλέφωνό σας');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      let coreApiUrl = process.env.NEXT_PUBLIC_CORE_API_URL;
      if (!coreApiUrl) {
        throw new Error('Backend API not configured');
      }

      if (!coreApiUrl.startsWith('http://') && !coreApiUrl.startsWith('https://')) {
        coreApiUrl = `https://${coreApiUrl}`;
      }
      coreApiUrl = coreApiUrl.replace(/\/$/, '');

      const response = await fetch(`${coreApiUrl}/api/users/resident-login/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Tenant-Host': window.location.hostname,
        },
        credentials: 'include',
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          phone: phone.trim()
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Σφάλμα σύνδεσης');
      }

      storeAuthTokens({
        access: data.access,
        refresh: data.refresh,
        refreshCookieSet: Boolean(data.refresh_cookie_set),
      });

      // Store building context if provided
      if (data.building?.id) {
        localStorage.setItem('selectedBuildingId', data.building.id.toString());
        localStorage.setItem('activeBuildingId', data.building.id.toString());
      }

      // Redirect
      const targetRedirect = getRedirectForRole(data.user, explicitRedirect || undefined);

      if (data.tenant_url) {
        window.location.href = `https://${data.tenant_url}${targetRedirect}`;
      } else {
        router.push(targetRedirect);
      }

    } catch (err) {
      console.error('Login error:', err);
      setError(err instanceof Error ? err.message : 'Προέκυψε σφάλμα. Παρακαλώ δοκιμάστε ξανά.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-main-light)] text-text-primary relative">
      <BuildingRevealBackground />
      <div className="pointer-events-none absolute inset-0 z-0 bg-gradient-to-b from-white via-[var(--bg-main-light)] to-[var(--bg-main-light)]" />

      {/* Header */}
      <header className="border-b border-gray-200 bg-white/80 backdrop-blur-sm sticky top-0 z-50 shadow-sm relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <Link href="/login" className="flex items-center gap-2 text-text-secondary hover:text-accent-primary transition-colors">
              <ChevronLeft className="h-4 w-4" />
              <span className="text-sm">Πίσω στην επιλογή</span>
            </Link>
            <div className="flex items-center gap-4">
              <span className="text-sm text-text-secondary">Είστε διαχειριστής;</span>
              <Link
                href="/login/office"
                className="text-sm font-medium text-accent-primary hover:opacity-80 transition-colors"
              >
                Σύνδεση διαχειριστή
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="py-12 px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="max-w-md mx-auto">
          {/* App Description Header */}
          <div className="text-left mb-8">
            <div className="inline-flex items-center gap-2 mb-4">
              <Home className="h-6 w-6 text-accent-secondary" />
              <span className="text-sm font-semibold text-text-secondary uppercase tracking-wider">
                Ένοικος / Ιδιοκτήτης
              </span>
            </div>
            <h2 className="text-xl font-bold text-accent-secondary mb-3">
              Σύνδεση Ενοίκου
            </h2>
            <p className="text-sm text-text-secondary leading-relaxed max-w-md">
              Εισάγετε το email και το τηλέφωνο με τα οποία είστε καταχωρημένος στην πολυκατοικία σας.
            </p>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-[var(--bg-white)] p-8 shadow-card-soft">
            <div className="text-left mb-8">
              <div className="w-16 h-16 rounded-full bg-accent-secondary/10 flex items-center justify-center mb-4">
                <Home className="h-8 w-8 text-accent-secondary" />
              </div>
              <h1 className="page-title-sm mb-2">
                Καλώς ήρθατε
              </h1>
              <p className="text-text-secondary text-sm">
                Συνδεθείτε στην πολυκατοικία σας
              </p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Email Field */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-text-secondary mb-2">
                  Email
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
                      if (error) setError('');
                    }}
                    autoComplete="email"
                    className={`w-full pl-10 pr-4 py-3 bg-white border rounded-xl text-text-primary placeholder:text-text-secondary focus:ring-2 focus:ring-accent-secondary focus:border-transparent transition-colors ${
                      error && !email ? 'border-red-300' : 'border-gray-200'
                    }`}
                    placeholder="το-email-σας@example.com"
                  />
                </div>
              </div>

              {/* Phone Field */}
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-text-secondary mb-2">
                  Τηλέφωνο
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-text-secondary" />
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    value={phone}
                    onChange={(e) => {
                      setPhone(e.target.value);
                      if (error) setError('');
                    }}
                    autoComplete="tel"
                    className={`w-full pl-10 pr-4 py-3 bg-white border rounded-xl text-text-primary placeholder:text-text-secondary focus:ring-2 focus:ring-accent-secondary focus:border-transparent transition-colors ${
                      error && !phone ? 'border-red-300' : 'border-gray-200'
                    }`}
                    placeholder="69xxxxxxxx"
                  />
                </div>
                <p className="mt-2 text-xs text-text-secondary">
                  Χρησιμοποιήστε τα στοιχεία που δώσατε κατά την εγγραφή σας
                </p>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-accent-secondary text-white py-3 px-6 rounded-xl font-semibold hover:opacity-90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center shadow-card-soft"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="animate-spin h-5 w-5 mr-2" />
                    Σύνδεση...
                  </>
                ) : (
                  <>
                    Σύνδεση
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </>
                )}
              </button>
            </form>

            {/* Help Section */}
            <div className="mt-6 pt-6 border-t border-gray-200 space-y-4">
              <p className="text-sm font-medium text-accent-secondary text-left">
                Δεν μπορείτε να συνδεθείτε;
              </p>

              <div className="space-y-3 text-xs text-text-secondary">
                <div className="flex items-start gap-2">
                  <span className="text-accent-secondary font-bold">1.</span>
                  <p>
                    <strong className="text-accent-secondary">Δεν έχετε καταχωρηθεί;</strong> Σαρώστε το QR code
                    στην είσοδο της πολυκατοικίας σας (αν υπάρχει) για αυτόματη εγγραφή.
                  </p>
                </div>

                <div className="flex items-start gap-2">
                  <span className="text-accent-secondary font-bold">2.</span>
                  <p>
                    <strong className="text-accent-secondary">Δεν υπάρχει QR code;</strong> Ζητήστε από τη διαχείριση
                    να σας στείλει πρόσκληση στο email σας για να ολοκληρώσετε την εγγραφή.
                  </p>
                </div>

                <div className="flex items-start gap-2">
                  <span className="text-accent-secondary font-bold">3.</span>
                  <p>
                    <strong className="text-accent-secondary">Τα στοιχεία δεν αναγνωρίζονται;</strong> Επικοινωνήστε
                    με τη διαχείριση της πολυκατοικίας σας για επιβεβαίωση των καταχωρημένων στοιχείων.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function ResidentLoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[var(--bg-main-light)] flex items-center justify-center">
        <div className="animate-pulse text-text-secondary">Φόρτωση...</div>
      </div>
    }>
      <ResidentLoginForm />
    </Suspense>
  );
}
