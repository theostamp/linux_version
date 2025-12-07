'use client';

import { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Building, Mail, Lock, ArrowRight, Loader2, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getDefaultLandingPath, type RoleDescriptor } from '@/lib/roleUtils';
import BuildingRevealBackground from '@/components/BuildingRevealBackground';

// Καθορίζει τη σωστή landing page βάσει του ρόλου του χρήστη
interface UserData extends RoleDescriptor {
  is_superuser?: boolean;
  is_staff?: boolean;
  role?: string;
}

function getRedirectForRole(user: UserData | null, explicitRedirect?: string): string {
  // Αν υπάρχει explicit redirect, χρησιμοποίησέ το
  if (explicitRedirect) return explicitRedirect;
  
  return getDefaultLandingPath(user);
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const explicitRedirect = searchParams.get('redirect'); // null αν δεν υπάρχει
  
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [isResendingEmail, setIsResendingEmail] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.email.trim()) {
      newErrors.email = 'Το email είναι υποχρεωτικό';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Το email δεν είναι έγκυρο';
    }

    if (!formData.password) {
      newErrors.password = 'Ο κωδικός είναι υποχρεωτικός';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    
    try {
      let coreApiUrl = process.env.NEXT_PUBLIC_CORE_API_URL;
      if (!coreApiUrl) {
        throw new Error('Backend API not configured. Please set NEXT_PUBLIC_CORE_API_URL environment variable.');
      }

      // Ensure URL has protocol
      if (!coreApiUrl.startsWith('http://') && !coreApiUrl.startsWith('https://')) {
        coreApiUrl = `https://${coreApiUrl}`;
      }
      
      // Remove trailing slash
      coreApiUrl = coreApiUrl.replace(/\/$/, '');

      // Login via backend API
      const response = await fetch(`${coreApiUrl}/api/users/login/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Tenant-Host': window.location.hostname, // Pass tenant hostname for multi-tenant support
        },
        credentials: 'include',
        body: JSON.stringify({
          email: formData.email,
          password: formData.password
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Σφάλμα σύνδεσης');
      }

      // Store tokens if provided
      if (data.access) {
        localStorage.setItem('access_token', data.access);
      }
      if (data.refresh) {
        localStorage.setItem('refresh_token', data.refresh);
      }

      // Καθορισμός redirect URL βάσει ρόλου χρήστη
      const targetRedirect = getRedirectForRole(data.user, explicitRedirect || undefined);
      
      // Redirect to tenant domain or specified redirect
      if (data.tenant_url) {
        window.location.href = `https://${data.tenant_url}${targetRedirect}`;
      } else {
        router.push(targetRedirect);
      }
      
    } catch (error) {
      console.error('Login error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Προέκυψε σφάλμα κατά τη σύνδεση. Παρακαλώ δοκιμάστε ξανά.';
      setErrors({ 
        general: errorMessage
      });
      setIsLoading(false);
    }
  };

  const handleResendVerificationEmail = async () => {
    if (!formData.email) {
      setErrors({ general: 'Παρακαλώ εισάγετε το email σας πρώτα.' });
      return;
    }

    setIsResendingEmail(true);
    setResendSuccess(false);
    setErrors({});

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

      const response = await fetch(`${coreApiUrl}/api/users/resend-verification/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Αποτυχία αποστολής email');
      }

      setResendSuccess(true);
      setErrors({});
    } catch (error) {
      console.error('Resend email error:', error);
      setErrors({
        general: error instanceof Error ? error.message : 'Αποτυχία αποστολής email. Παρακαλώ δοκιμάστε ξανά.'
      });
    } finally {
      setIsResendingEmail(false);
    }
  };

  const handleGoogleLogin = () => {
    let coreApiUrl = process.env.NEXT_PUBLIC_CORE_API_URL;
    if (!coreApiUrl) {
      setErrors({ general: 'Backend API not configured. Please set NEXT_PUBLIC_CORE_API_URL environment variable.' });
      return;
    }

    // Ensure URL has protocol
    if (!coreApiUrl.startsWith('http://') && !coreApiUrl.startsWith('https://')) {
      coreApiUrl = `https://${coreApiUrl}`;
    }
    
    // Remove trailing slash
    coreApiUrl = coreApiUrl.replace(/\/$/, '');

    // Use fixed redirect URI (main app URL) for Google OAuth
    // This allows single redirect URI in Google Console for all subdomains
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
    const redirectUri = `${appUrl}/auth/callback`;
    
    // Store the original origin in state for cross-subdomain redirect
    const state = JSON.stringify({ 
      provider: 'google',
      redirect: explicitRedirect || '/dashboard',
      originUrl: window.location.origin  // Where to redirect after auth
    });
    const googleAuthUrl = `${coreApiUrl}/api/users/auth/google/?redirect_uri=${encodeURIComponent(redirectUri)}&state=${encodeURIComponent(state)}`;
    
    window.location.href = googleAuthUrl;
  };

  return (
    <div className="min-h-screen bg-background relative">
      <BuildingRevealBackground />
      {/* Header */}
      <header className="bg-card shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <Link href="/" className="flex items-center">
              <Building className="h-8 w-8 text-primary" />
              <span className="ml-2 text-2xl font-bold text-foreground">New Concierge</span>
            </Link>
            <Link href="/signup" className="text-muted-foreground hover:text-foreground transition-colors">
              Δημιουργία Λογαριασμού
            </Link>
          </div>
        </div>
      </header>

      <main className="py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md mx-auto">
          {/* App Description Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 mb-4">
              <Building className="h-6 w-6 text-primary" />
              <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                New Concierge
              </span>
            </div>
            <h2 className="text-xl font-bold text-foreground mb-3">
              Η πολυκατοικία σου γίνεται κοινότητα
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-md mx-auto">
              Ένα σημείο ενημέρωσης με οθόνη στην είσοδο και μια πλατφόρμα για όλους τους ενοίκους.
              Διαφάνεια, συνεργασία και ομαλή επικοινωνία – χωρίς χαρτιά, χωρίς εντάσεις.
            </p>
          </div>

          <div className="bg-card rounded-xl shadow-app-lg p-8 border border-slate-200/50">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-foreground mb-2">
                Σύνδεση
              </h1>
              <p className="text-muted-foreground">
                Καλώς ήρθατε ξανά στο New Concierge
              </p>
            </div>
            
            {errors.general && (
              <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-md shadow-sm mb-6 border border-destructive/20">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    {errors.general}
                    {errors.general.includes('επιβεβαιώστε το email') && (
                      <button
                        onClick={handleResendVerificationEmail}
                        disabled={isResendingEmail}
                        className="mt-2 text-sm underline hover:no-underline font-semibold block"
                      >
                        {isResendingEmail ? 'Αποστολή...' : 'Επανάληψη αποστολής email επιβεβαίωσης'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {resendSuccess && (
              <div className="bg-success/10 text-success px-4 py-3 rounded-md shadow-sm mb-6 border border-success/20">
                Το email επιβεβαίωσης στάλθηκε επιτυχώς! Ελέγξτε το inbox σας (και spam folder).
              </div>
            )}

            {/* Google OAuth Button */}
            <button
              onClick={handleGoogleLogin}
              className="w-full bg-card shadow-sm border border-input text-foreground py-3 px-6 rounded-md font-semibold hover:shadow-md hover:bg-accent/50 transition-all flex items-center justify-center mb-6"
            >
              <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Συνέχεια με Google
            </button>

            <div className="relative mb-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-muted"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-card text-muted-foreground">ή</span>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-foreground mb-2">
                  Διεύθυνση Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    autoComplete="email"
                    className={`w-full pl-10 pr-4 py-3 rounded-md shadow-sm focus:ring-2 focus:ring-ring focus:shadow-md bg-card text-foreground placeholder:text-muted-foreground border border-input ${
                      errors.email ? 'ring-2 ring-destructive border-destructive' : ''
                    }`}
                    placeholder="john@example.com"
                  />
                </div>
                {errors.email && (
                  <p className="mt-1 text-sm text-destructive">{errors.email}</p>
                )}
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-foreground mb-2">
                  Κωδικός
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <input
                    type={showPassword ? "text" : "password"}
                    id="password"
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    autoComplete="current-password"
                    className={`w-full pl-10 pr-12 py-3 rounded-md shadow-sm focus:ring-2 focus:ring-ring focus:shadow-md bg-card text-foreground placeholder:text-muted-foreground border border-input ${
                      errors.password ? 'ring-2 ring-destructive border-destructive' : ''
                    }`}
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none transition-colors"
                    aria-label={showPassword ? "Απόκρυψη κωδικού" : "Εμφάνιση κωδικού"}
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
                {errors.password && (
                  <p className="mt-1 text-sm text-destructive">{errors.password}</p>
                )}
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <input
                    id="remember-me"
                    name="remember-me"
                    type="checkbox"
                    className="h-4 w-4 text-primary focus:ring-ring rounded border-input"
                  />
                  <label htmlFor="remember-me" className="ml-2 block text-sm text-foreground">
                    Να με θυμάσαι
                  </label>
                </div>
                <Link href="/forgot-password" className="text-sm text-primary hover:text-primary/80 transition-colors">
                  Ξέχασες τον κωδικό;
                </Link>
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                variant="default"
                size="full"
                className="w-full py-3 px-6 font-semibold"
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
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-muted-foreground">
                Δεν έχετε λογαριασμό;{' '}
                <Link href="/signup" className="text-primary hover:text-primary/80 font-semibold transition-colors">
                  Δημιουργήστε έναν
                </Link>
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Φόρτωση...</div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
