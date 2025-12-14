'use client';

import { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Home, Mail, Phone, ArrowRight, Loader2, ChevronLeft } from 'lucide-react';
import BuildingRevealBackground from '@/components/BuildingRevealBackground';
import { getDefaultLandingPath, type RoleDescriptor } from '@/lib/roleUtils';

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

      // Store tokens
      if (data.access) {
        localStorage.setItem('access_token', data.access);
      }
      if (data.refresh) {
        localStorage.setItem('refresh_token', data.refresh);
      }

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
              Εισάγετε το email και το τηλέφωνο με τα οποία είστε καταχωρημένος στην πολυκατοικία σας.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-8">
            <div className="text-center mb-8">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-4">
                <Home className="h-8 w-8 text-emerald-400" />
              </div>
              <h1 className="text-2xl font-bold text-slate-50 mb-2">
                Καλώς ήρθατε
              </h1>
              <p className="text-slate-400 text-sm">
                Συνδεθείτε στην πολυκατοικία σας
              </p>
            </div>
            
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg mb-6 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Email Field */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-2">
                  Email
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
                      error && !email ? 'border-red-500/50' : 'border-slate-700'
                    }`}
                    placeholder="το-email-σας@example.com"
                  />
                </div>
              </div>

              {/* Phone Field */}
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-slate-300 mb-2">
                  Τηλέφωνο
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-500" />
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
                    className={`w-full pl-10 pr-4 py-3 bg-slate-800 border rounded-xl text-slate-200 placeholder-slate-500 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-colors ${
                      error && !phone ? 'border-red-500/50' : 'border-slate-700'
                    }`}
                    placeholder="69xxxxxxxx"
                  />
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  Χρησιμοποιήστε τα στοιχεία που δώσατε κατά την εγγραφή σας
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
            <div className="mt-6 pt-6 border-t border-slate-700 space-y-4">
              <p className="text-sm font-medium text-slate-300 text-center">
                Δεν μπορείτε να συνδεθείτε;
              </p>
              
              <div className="space-y-3 text-xs text-slate-400">
                <div className="flex items-start gap-2">
                  <span className="text-emerald-400 font-bold">1.</span>
                  <p>
                    <strong className="text-slate-300">Δεν έχετε καταχωρηθεί;</strong> Σαρώστε το QR code 
                    στην είσοδο της πολυκατοικίας σας (αν υπάρχει) για αυτόματη εγγραφή.
                  </p>
                </div>
                
                <div className="flex items-start gap-2">
                  <span className="text-emerald-400 font-bold">2.</span>
                  <p>
                    <strong className="text-slate-300">Δεν υπάρχει QR code;</strong> Ζητήστε από τη διαχείριση 
                    να σας στείλει πρόσκληση στο email σας για να ολοκληρώσετε την εγγραφή.
                  </p>
                </div>
                
                <div className="flex items-start gap-2">
                  <span className="text-emerald-400 font-bold">3.</span>
                  <p>
                    <strong className="text-slate-300">Τα στοιχεία δεν αναγνωρίζονται;</strong> Επικοινωνήστε 
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
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="animate-pulse text-slate-400">Φόρτωση...</div>
      </div>
    }>
      <ResidentLoginForm />
    </Suspense>
  );
}
