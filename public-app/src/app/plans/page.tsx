'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Building, Home, Monitor, CheckCircle, ArrowRight, Loader2, Minus, Plus, ChevronLeft } from 'lucide-react';
import BuildingRevealBackground from '@/components/BuildingRevealBackground';
import { useAuth } from '@/components/contexts/AuthContext';

/**
 * Τιμολογιακή Πολιτική:
 * - Free: 1-7 διαμερίσματα → €0
 * - Cloud: 8-20 → €18, 21-30 → €22, 31+ → €25
 * - Kiosk: 8-20 → €28, 21-30 → €35, 31+ → €40
 */

type PlanType = 'free' | 'cloud' | 'kiosk';

interface PricingTier {
  minApartments: number;
  maxApartments: number | null;
  monthlyPrice: number;
}

interface PlanInfo {
  name: string;
  description: string;
  icon: React.ReactNode;
  tiers: PricingTier[];
  features: string[];
}

const PLANS: Record<PlanType, PlanInfo> = {
  free: {
    name: 'Free',
    description: 'Βασικό φύλλο κοινοχρήστων',
    icon: <Home className="h-6 w-6" />,
    tiers: [{ minApartments: 1, maxApartments: 7, monthlyPrice: 0 }],
    features: [
      'Έως 7 διαμερίσματα',
      'Βασικό φύλλο κοινοχρήστων',
      '1 πολυκατοικία'
    ]
  },
  cloud: {
    name: 'Concierge Cloud',
    description: 'Πλήρης πλατφόρμα χωρίς οθόνη',
    icon: <Building className="h-6 w-6" />,
    tiers: [
      { minApartments: 8, maxApartments: 20, monthlyPrice: 18 },
      { minApartments: 21, maxApartments: 30, monthlyPrice: 22 },
      { minApartments: 31, maxApartments: null, monthlyPrice: 25 }
    ],
    features: [
      'Απεριόριστα διαμερίσματα',
      'Ανακοινώσεις & ψηφοφορίες',
      'Αιτήματα συντήρησης',
      'Web & mobile πρόσβαση',
      'Έως 5 πολυκατοικίες'
    ]
  },
  kiosk: {
    name: 'Info Point',
    description: 'Με σημείο ενημέρωσης στην είσοδο',
    icon: <Monitor className="h-6 w-6" />,
    tiers: [
      { minApartments: 8, maxApartments: 20, monthlyPrice: 28 },
      { minApartments: 21, maxApartments: 30, monthlyPrice: 35 },
      { minApartments: 31, maxApartments: null, monthlyPrice: 40 }
    ],
    features: [
      'Όλα τα Cloud features',
      'Οθόνη ενημέρωσης στην είσοδο',
      'Hardware & εγκατάσταση',
      'Ενσωματωμένο internet',
      'Τεχνική υποστήριξη 24/7'
    ]
  }
};

function getPriceForApartments(plan: PlanType, apartmentCount: number): number | null {
  const planInfo = PLANS[plan];
  for (const tier of planInfo.tiers) {
    if (
      apartmentCount >= tier.minApartments &&
      (tier.maxApartments === null || apartmentCount <= tier.maxApartments)
    ) {
      return tier.monthlyPrice;
    }
  }
  return null;
}

function PlansContent() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  
  const [apartments, setApartments] = useState(15);
  const [selectedPlan, setSelectedPlan] = useState<PlanType>('cloud');
  const [isYearly, setIsYearly] = useState(false);
  const [subdomain, setSubdomain] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Redirect if user already has tenant
  useEffect(() => {
    if (!authLoading && user?.tenant) {
      router.push('/dashboard');
    }
  }, [user, authLoading, router]);

  // Auto-select plan based on apartments
  useEffect(() => {
    if (apartments <= 7 && selectedPlan !== 'kiosk') {
      setSelectedPlan('free');
    } else if (apartments > 7 && selectedPlan === 'free') {
      setSelectedPlan('cloud');
    }
  }, [apartments, selectedPlan]);

  // Calculate price
  const isFreeEligible = apartments <= 7;
  const effectivePlan = isFreeEligible && selectedPlan !== 'kiosk' ? 'free' : selectedPlan;
  const monthlyPrice = effectivePlan === 'free' ? 0 : getPriceForApartments(effectivePlan, apartments) || 0;
  const yearlyPrice = monthlyPrice * 10; // 2 μήνες δωρεάν
  const displayPrice = isYearly ? yearlyPrice : monthlyPrice;

  const handleApartmentChange = (delta: number) => {
    setApartments(prev => Math.max(1, Math.min(100, prev + delta)));
  };

  const validateSubdomain = (value: string): boolean => {
    if (!value.trim()) return false;
    return /^[a-z0-9-]+$/.test(value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!subdomain.trim()) {
      setError('Το subdomain είναι υποχρεωτικό');
      return;
    }

    if (!validateSubdomain(subdomain)) {
      setError('Το subdomain πρέπει να περιέχει μόνο πεζά γράμματα, αριθμούς και παύλες');
      return;
    }

    setIsLoading(true);

    try {
      // Get access token from localStorage
      const accessToken = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
      
      if (!accessToken) {
        throw new Error('Πρέπει να συνδεθείτε πρώτα');
      }

      if (effectivePlan === 'free') {
        // Create free tenant directly
        const response = await fetch('/api/create-free-tenant', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`
          },
          body: JSON.stringify({
            subdomain,
            apartments
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Αποτυχία δημιουργίας workspace');
        }

        // Store new tokens if provided
        if (data.tokens) {
          if (data.tokens.access) {
            localStorage.setItem('access_token', data.tokens.access);
          }
          if (data.tokens.refresh) {
            localStorage.setItem('refresh_token', data.tokens.refresh);
          }
        }

        // Redirect to tenant dashboard with tokens in hash for cross-domain auth
        if (data.tenantUrl) {
          const tokens = data.tokens || {};
          const targetUrl = `https://${data.tenantUrl}/auth/callback#access=${encodeURIComponent(tokens.access || '')}&refresh=${encodeURIComponent(tokens.refresh || '')}&redirect=${encodeURIComponent('/dashboard')}`;
          window.location.href = targetUrl;
        } else {
          router.push('/dashboard');
        }
      } else {
        // Create Stripe checkout session for paid plans
        const response = await fetch('/api/create-checkout-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            plan: effectivePlan,
            apartments,
            billingInterval: isYearly ? 'year' : 'month',
            userData: {
              email: user?.email || '',
              firstName: user?.first_name || '',
              lastName: user?.last_name || '',
              password: '' // OAuth users don't need password
            },
            tenantSubdomain: subdomain,
            oauth: true
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Αποτυχία δημιουργίας checkout session');
        }

        if (data.url) {
          window.location.href = data.url;
        } else {
          throw new Error('Δεν λήφθηκε URL πληρωμής');
        }
      }
    } catch (err) {
      console.error('Plan selection error:', err);
      setError(err instanceof Error ? err.message : 'Προέκυψε σφάλμα');
      setIsLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-emerald-400 animate-spin" />
      </div>
    );
  }

  if (!user) {
    // Check if tokens exist in localStorage (user might be loading)
    const hasTokens = typeof window !== 'undefined' && localStorage.getItem('access_token');
    
    if (hasTokens) {
      // Tokens exist but user not loaded yet - show loading
      return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-8 w-8 text-emerald-400 animate-spin mx-auto mb-4" />
            <p className="text-slate-400">Φόρτωση...</p>
          </div>
        </div>
      );
    }
    
    // No tokens - actually not logged in
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-400 mb-4">Πρέπει να συνδεθείτε πρώτα</p>
          <Link href="/login" className="text-emerald-400 hover:text-emerald-300">
            Σύνδεση
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 relative">
      <BuildingRevealBackground />
      
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <Link href="/" className="flex items-center gap-2 text-slate-200 hover:text-white transition-colors">
              <ChevronLeft className="h-4 w-4" />
              <span className="text-sm">Αρχική</span>
            </Link>
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-400">Συνδεδεμένος ως:</span>
              <span className="text-sm font-medium text-slate-200">{user.email}</span>
            </div>
          </div>
        </div>
      </header>

      <main className="py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 mb-4">
              <Building className="h-6 w-6 text-emerald-400" />
              <span className="text-sm font-semibold text-slate-400 uppercase tracking-wider">
                New Concierge
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-50 mb-2">
              Επιλέξτε το Πακέτο σας
            </h1>
            <p className="text-slate-400">
              Ρυθμίστε το workspace της πολυκατοικίας σας
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Error message */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            {/* Apartment Counter */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
              <h3 className="text-sm font-medium text-slate-400 mb-4">Διαμερίσματα στην πολυκατοικία</h3>
              <div className="flex items-center justify-center gap-4">
                <button
                  type="button"
                  onClick={() => handleApartmentChange(-1)}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
                  disabled={apartments <= 1}
                >
                  <Minus className="h-4 w-4" />
                </button>
                <div className="text-center">
                  <input
                    type="number"
                    value={apartments}
                    onChange={(e) => setApartments(Math.max(1, Math.min(100, parseInt(e.target.value) || 1)))}
                    className="w-20 bg-transparent text-center text-3xl font-bold text-emerald-400 focus:outline-none"
                    min={1}
                    max={100}
                  />
                  <p className="text-xs text-slate-500">διαμερίσματα</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleApartmentChange(1)}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
                  disabled={apartments >= 100}
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Plan Selection */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
              <h3 className="text-sm font-medium text-slate-400 mb-4">Επιλέξτε πακέτο</h3>
              <div className="grid gap-4 sm:grid-cols-3">
                {/* Free Plan */}
                <button
                  type="button"
                  onClick={() => setSelectedPlan('free')}
                  disabled={apartments > 7}
                  className={`relative flex flex-col items-center rounded-xl border p-4 transition-all ${
                    effectivePlan === 'free'
                      ? 'border-emerald-500 bg-emerald-500/10'
                      : apartments > 7
                      ? 'border-slate-800 bg-slate-800/30 opacity-50 cursor-not-allowed'
                      : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
                  }`}
                >
                  <Home className="h-8 w-8 text-slate-300 mb-2" />
                  <span className="font-medium text-slate-200">Free</span>
                  <span className="text-xs text-slate-500 mb-2">1-7 διαμερίσματα</span>
                  <span className="text-2xl font-bold text-emerald-400">€0</span>
                </button>

                {/* Cloud Plan */}
                <button
                  type="button"
                  onClick={() => setSelectedPlan('cloud')}
                  disabled={apartments <= 7}
                  className={`relative flex flex-col items-center rounded-xl border p-4 transition-all ${
                    effectivePlan === 'cloud'
                      ? 'border-emerald-500 bg-emerald-500/10'
                      : apartments <= 7
                      ? 'border-slate-800 bg-slate-800/30 opacity-50 cursor-not-allowed'
                      : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
                  }`}
                >
                  <Building className="h-8 w-8 text-slate-300 mb-2" />
                  <span className="font-medium text-slate-200">Cloud</span>
                  <span className="text-xs text-slate-500 mb-2">8+ διαμερίσματα</span>
                  <span className="text-2xl font-bold text-emerald-400">
                    €{getPriceForApartments('cloud', Math.max(8, apartments))}
                  </span>
                </button>

                {/* Kiosk Plan */}
                <button
                  type="button"
                  onClick={() => setSelectedPlan('kiosk')}
                  className={`relative flex flex-col items-center rounded-xl border p-4 transition-all ${
                    selectedPlan === 'kiosk'
                      ? 'border-emerald-500 bg-emerald-500/10'
                      : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
                  }`}
                >
                  <span className="absolute -top-2 right-2 rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-bold text-slate-950">
                    Δημοφιλές
                  </span>
                  <Monitor className="h-8 w-8 text-slate-300 mb-2" />
                  <span className="font-medium text-slate-200">Info Point</span>
                  <span className="text-xs text-slate-500 mb-2">Με οθόνη</span>
                  <span className="text-2xl font-bold text-emerald-400">
                    €{getPriceForApartments('kiosk', Math.max(8, apartments))}
                  </span>
                </button>
              </div>

              {/* Billing Toggle (only for paid plans) */}
              {effectivePlan !== 'free' && (
                <div className="mt-6 flex items-center justify-center gap-3">
                  <span className={`text-sm ${!isYearly ? 'text-slate-200' : 'text-slate-500'}`}>
                    Μηνιαία
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsYearly(!isYearly)}
                    className={`relative h-6 w-11 rounded-full transition-colors ${
                      isYearly ? 'bg-emerald-500' : 'bg-slate-700'
                    }`}
                  >
                    <span
                      className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                        isYearly ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                  <span className={`text-sm ${isYearly ? 'text-slate-200' : 'text-slate-500'}`}>
                    Ετήσια
                  </span>
                  {isYearly && (
                    <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs font-medium text-emerald-400">
                      -2 μήνες
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Subdomain Input */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
              <h3 className="text-sm font-medium text-slate-400 mb-4">Διεύθυνση Workspace</h3>
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <div className="relative">
                    <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-500" />
                    <input
                      type="text"
                      value={subdomain}
                      onChange={(e) => setSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                      className="w-full pl-10 pr-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-slate-200 placeholder-slate-500 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-colors"
                      placeholder="my-building"
                    />
                  </div>
                </div>
                <span className="text-slate-500">.newconcierge.app</span>
              </div>
              <p className="mt-2 text-xs text-slate-500">
                Μόνο πεζά γράμματα, αριθμοί και παύλες
              </p>
            </div>

            {/* Price Summary */}
            <div className="rounded-2xl border border-emerald-500/30 bg-slate-900 p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm text-slate-400">Επιλεγμένο πακέτο</p>
                  <p className="text-lg font-semibold text-slate-200">{PLANS[effectivePlan].name}</p>
                </div>
                <div className="text-right">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold text-emerald-400">€{displayPrice}</span>
                    <span className="text-slate-500">/{isYearly ? 'έτος' : 'μήνα'}</span>
                  </div>
                  {effectivePlan !== 'free' && isYearly && (
                    <p className="text-xs text-emerald-400">
                      Εξοικονόμηση €{monthlyPrice * 2}/έτος
                    </p>
                  )}
                </div>
              </div>

              <div className="border-t border-slate-800 pt-4">
                <p className="text-xs font-medium text-slate-400 mb-2">Περιλαμβάνει:</p>
                <ul className="space-y-1">
                  {PLANS[effectivePlan].features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-xs text-slate-400">
                      <CheckCircle className="h-3 w-3 text-emerald-400 shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading || !subdomain.trim()}
              className="w-full bg-emerald-500 text-slate-950 py-4 px-6 rounded-xl font-semibold hover:bg-emerald-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center shadow-lg shadow-emerald-500/25"
            >
              {isLoading ? (
                <>
                  <Loader2 className="animate-spin h-5 w-5 mr-2" />
                  Επεξεργασία...
                </>
              ) : effectivePlan === 'free' ? (
                <>
                  Δημιουργία Workspace
                  <ArrowRight className="ml-2 h-5 w-5" />
                </>
              ) : (
                <>
                  Συνέχεια στην Πληρωμή
                  <ArrowRight className="ml-2 h-5 w-5" />
                </>
              )}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}

export default function PlansPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-emerald-400 animate-spin" />
      </div>
    }>
      <PlansContent />
    </Suspense>
  );
}

