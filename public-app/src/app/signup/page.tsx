'use client';

import { useState, useEffect, Suspense, useCallback } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { Building, User, Mail, Lock, ArrowRight, CheckCircle, Eye, EyeOff, Home, Monitor, Minus, Plus, ChevronLeft } from 'lucide-react';

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
    icon: <Home className="h-5 w-5" />,
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
    icon: <Building className="h-5 w-5" />,
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
    icon: <Monitor className="h-5 w-5" />,
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

function determinePlan(planParam: string | null, apartments: number): PlanType {
  // If explicitly free or small building
  if (planParam === 'free' || (apartments <= 7 && planParam !== 'kiosk')) {
    return 'free';
  }
  // If explicitly kiosk
  if (planParam === 'kiosk') {
    return 'kiosk';
  }
  // Default to cloud for >7 apartments
  if (apartments > 7) {
    return planParam === 'cloud' ? 'cloud' : 'cloud';
  }
  return 'free';
}

function SignupForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  // Get initial values from URL params
  const initialPlan = searchParams.get('plan') as PlanType | null;
  const initialApartments = parseInt(searchParams.get('apartments') || '15', 10);
  
  const [apartments, setApartments] = useState(initialApartments);
  const [selectedPlan, setSelectedPlan] = useState<PlanType>(() => 
    determinePlan(initialPlan, initialApartments)
  );
  const [isYearly, setIsYearly] = useState(false);
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    tenantSubdomain: ''
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Calculate price based on apartments and plan
  const isFreeEligible = apartments <= 7;
  const effectivePlan = isFreeEligible && selectedPlan !== 'kiosk' ? 'free' : selectedPlan;
  const monthlyPrice = effectivePlan === 'free' ? 0 : getPriceForApartments(effectivePlan, apartments) || 0;
  const yearlyPrice = monthlyPrice * 10; // 2 μήνες δωρεάν
  const displayPrice = isYearly ? yearlyPrice : monthlyPrice;

  // Update plan when apartments change
  useEffect(() => {
    if (apartments <= 7 && selectedPlan !== 'kiosk') {
      setSelectedPlan('free');
    } else if (apartments > 7 && selectedPlan === 'free') {
      setSelectedPlan('cloud');
    }
  }, [apartments, selectedPlan]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleApartmentChange = (delta: number) => {
    setApartments(prev => Math.max(1, Math.min(100, prev + delta)));
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.firstName.trim()) {
      newErrors.firstName = 'Το όνομα είναι υποχρεωτικό';
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Το επώνυμο είναι υποχρεωτικό';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Το email είναι υποχρεωτικό';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Το email δεν είναι έγκυρο';
    }

    if (!formData.password) {
      newErrors.password = 'Ο κωδικός είναι υποχρεωτικός';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Ο κωδικός πρέπει να έχει τουλάχιστον 8 χαρακτήρες';
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Οι κωδικοί δεν ταιριάζουν';
    }

    if (!formData.tenantSubdomain.trim()) {
      newErrors.tenantSubdomain = 'Το subdomain είναι υποχρεωτικό';
    } else if (!/^[a-z0-9-]+$/.test(formData.tenantSubdomain)) {
      newErrors.tenantSubdomain = 'Μόνο πεζά γράμματα, αριθμοί και παύλες';
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
      // For free plan, skip payment and go directly to account creation
      if (effectivePlan === 'free') {
        // TODO: Direct account creation for free tier
        const response = await fetch('/api/create-checkout-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            plan: 'free',
            apartments,
            billingInterval: 'month',
            userData: {
              firstName: formData.firstName,
              lastName: formData.lastName,
              email: formData.email,
              password: formData.password
            },
            tenantSubdomain: formData.tenantSubdomain
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to create account');
        }

        // For free plan, might redirect to dashboard or confirmation
        if (data.url) {
          window.location.href = data.url;
        } else if (data.success) {
          router.push('/login?registered=true');
        }
        return;
      }

      // For paid plans, create checkout session
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan: effectivePlan,
          apartments,
          billingInterval: isYearly ? 'year' : 'month',
          userData: {
            firstName: formData.firstName,
            lastName: formData.lastName,
            email: formData.email,
            password: formData.password
          },
          tenantSubdomain: formData.tenantSubdomain
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create checkout session');
      }

      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error('No checkout URL received');
      }
      
    } catch (error) {
      console.error('Signup error:', error);
      setErrors({ 
        general: error instanceof Error ? error.message : 'Προέκυψε σφάλμα. Δοκιμάστε ξανά.' 
      });
      setIsLoading(false);
    }
  };

  const handleGoogleAuth = () => {
    let coreApiUrl = process.env.NEXT_PUBLIC_CORE_API_URL;
    if (!coreApiUrl) {
      setErrors({ general: 'Backend API not configured.' });
      return;
    }
    
    if (!coreApiUrl.startsWith('http://') && !coreApiUrl.startsWith('https://')) {
      coreApiUrl = `https://${coreApiUrl}`;
    }
    coreApiUrl = coreApiUrl.replace(/\/$/, '');
    
    const redirectUri = `${window.location.origin}/auth/callback`;
    const state = JSON.stringify({ 
      provider: 'google',
      action: 'signup',
      plan: effectivePlan,
      apartments,
      billingInterval: isYearly ? 'year' : 'month',
      tenantSubdomain: formData.tenantSubdomain 
    });
    const googleAuthUrl = `${coreApiUrl}/api/users/auth/google/?redirect_uri=${encodeURIComponent(redirectUri)}&state=${encodeURIComponent(state)}`;
    window.location.href = googleAuthUrl;
  };

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <Link href="/" className="flex items-center gap-2 text-slate-200 hover:text-white transition-colors">
              <ChevronLeft className="h-4 w-4" />
              <span className="text-sm">Αρχική</span>
            </Link>
            <div className="flex items-center gap-4">
              <span className="text-sm text-slate-400">Έχετε λογαριασμό;</span>
              <Link 
                href="/login" 
                className="text-sm font-medium text-emerald-400 hover:text-emerald-300 transition-colors"
              >
                Σύνδεση
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          {/* Title */}
          <div className="text-center mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-50 mb-2">
              Δημιουργία Λογαριασμού
            </h1>
            <p className="text-slate-400">
              Ξεκινήστε με το {PLANS[effectivePlan].name} 
              {effectivePlan !== 'free' && ` - €${displayPrice}/${isYearly ? 'έτος' : 'μήνα'}`}
            </p>
          </div>

          <div className="grid lg:grid-cols-5 gap-8">
            {/* Left: Plan Selection & Pricing */}
            <div className="lg:col-span-2 space-y-6">
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
              {apartments > 7 && (
                <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
                  <h3 className="text-sm font-medium text-slate-400 mb-4">Επιλέξτε πακέτο</h3>
                  <div className="space-y-3">
                    <button
                      type="button"
                      onClick={() => setSelectedPlan('cloud')}
                      className={`w-full flex items-center justify-between rounded-xl border p-4 transition-all ${
                        selectedPlan === 'cloud'
                          ? 'border-emerald-500 bg-emerald-500/10'
                          : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Building className="h-5 w-5 text-slate-300" />
                        <div className="text-left">
                          <span className="font-medium text-slate-200">Cloud</span>
                          <p className="text-xs text-slate-500">Χωρίς οθόνη</p>
                        </div>
                      </div>
                      <span className="text-lg font-bold text-emerald-400">
                        €{getPriceForApartments('cloud', apartments)}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSelectedPlan('kiosk')}
                      className={`w-full flex items-center justify-between rounded-xl border p-4 transition-all relative ${
                        selectedPlan === 'kiosk'
                          ? 'border-emerald-500 bg-emerald-500/10'
                          : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
                      }`}
                    >
                      <span className="absolute -top-2 right-3 rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-bold text-slate-950">
                        Δημοφιλές
                      </span>
                      <div className="flex items-center gap-3">
                        <Monitor className="h-5 w-5 text-slate-300" />
                        <div className="text-left">
                          <span className="font-medium text-slate-200">Info Point</span>
                          <p className="text-xs text-slate-500">Με οθόνη εισόδου</p>
                        </div>
                      </div>
                      <span className="text-lg font-bold text-emerald-400">
                        €{getPriceForApartments('kiosk', apartments)}
                      </span>
                    </button>
                  </div>

                  {/* Billing Toggle */}
                  <div className="mt-4 flex items-center justify-center gap-3">
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
                </div>
              )}

              {/* Price Summary */}
              <div className="rounded-2xl border border-emerald-500/30 bg-slate-900 p-6">
                <div className="text-center">
                  <p className="text-sm text-slate-400 mb-2">
                    {effectivePlan === 'free' ? 'Δωρεάν πακέτο' : 'Συνολικό κόστος'}
                  </p>
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-4xl font-bold text-emerald-400">
                      €{displayPrice}
                    </span>
                    <span className="text-slate-500">
                      /{isYearly ? 'έτος' : 'μήνα'}
                    </span>
                  </div>
                  {effectivePlan !== 'free' && isYearly && (
                    <p className="mt-1 text-xs text-emerald-400">
                      Εξοικονόμηση €{monthlyPrice * 2}/έτος
                    </p>
                  )}
                </div>

                <div className="mt-4 pt-4 border-t border-slate-800">
                  <p className="text-xs font-medium text-slate-400 mb-2">
                    {PLANS[effectivePlan].name} περιλαμβάνει:
                  </p>
                  <ul className="space-y-1">
                    {PLANS[effectivePlan].features.slice(0, 4).map((feature) => (
                      <li key={feature} className="flex items-center gap-2 text-xs text-slate-400">
                        <CheckCircle className="h-3 w-3 text-emerald-400 shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            {/* Right: Signup Form */}
            <div className="lg:col-span-3">
              <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 sm:p-8">
                <h2 className="text-xl font-bold text-slate-50 mb-6">Στοιχεία Λογαριασμού</h2>
                
                {errors.general && (
                  <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg mb-6 text-sm">
                    {errors.general}
                  </div>
                )}

                {/* Google OAuth */}
                <button
                  type="button"
                  onClick={handleGoogleAuth}
                  className="w-full bg-slate-800 border border-slate-700 text-slate-200 py-3 px-6 rounded-xl font-medium hover:bg-slate-700 transition-colors flex items-center justify-center gap-3 mb-6"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                  Συνέχεια με Google
                </button>

                <div className="relative mb-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-700"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-3 bg-slate-900 text-slate-500">ή με email</span>
                  </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                  {/* Name fields */}
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="firstName" className="block text-sm font-medium text-slate-300 mb-2">
                        Όνομα
                      </label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-500" />
                        <input
                          type="text"
                          id="firstName"
                          name="firstName"
                          value={formData.firstName}
                          onChange={handleInputChange}
                          autoComplete="given-name"
                          className={`w-full pl-10 pr-4 py-3 bg-slate-800 border rounded-xl text-slate-200 placeholder-slate-500 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-colors ${
                            errors.firstName ? 'border-red-500/50' : 'border-slate-700'
                          }`}
                          placeholder="Γιώργος"
                        />
                      </div>
                      {errors.firstName && (
                        <p className="mt-1 text-xs text-red-400">{errors.firstName}</p>
                      )}
                    </div>

                    <div>
                      <label htmlFor="lastName" className="block text-sm font-medium text-slate-300 mb-2">
                        Επώνυμο
                      </label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-500" />
                        <input
                          type="text"
                          id="lastName"
                          name="lastName"
                          value={formData.lastName}
                          onChange={handleInputChange}
                          autoComplete="family-name"
                          className={`w-full pl-10 pr-4 py-3 bg-slate-800 border rounded-xl text-slate-200 placeholder-slate-500 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-colors ${
                            errors.lastName ? 'border-red-500/50' : 'border-slate-700'
                          }`}
                          placeholder="Παπαδόπουλος"
                        />
                      </div>
                      {errors.lastName && (
                        <p className="mt-1 text-xs text-red-400">{errors.lastName}</p>
                      )}
                    </div>
                  </div>

                  {/* Email */}
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
                        value={formData.email}
                        onChange={handleInputChange}
                        autoComplete="email"
                        className={`w-full pl-10 pr-4 py-3 bg-slate-800 border rounded-xl text-slate-200 placeholder-slate-500 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-colors ${
                          errors.email ? 'border-red-500/50' : 'border-slate-700'
                        }`}
                        placeholder="email@example.com"
                      />
                    </div>
                    {errors.email && (
                      <p className="mt-1 text-xs text-red-400">{errors.email}</p>
                    )}
                  </div>

                  {/* Subdomain */}
                  <div>
                    <label htmlFor="tenantSubdomain" className="block text-sm font-medium text-slate-300 mb-2">
                      Subdomain (διεύθυνση πολυκατοικίας)
                    </label>
                    <div className="relative">
                      <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-500" />
                      <input
                        type="text"
                        id="tenantSubdomain"
                        name="tenantSubdomain"
                        value={formData.tenantSubdomain}
                        onChange={handleInputChange}
                        className={`w-full pl-10 pr-4 py-3 bg-slate-800 border rounded-xl text-slate-200 placeholder-slate-500 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-colors ${
                          errors.tenantSubdomain ? 'border-red-500/50' : 'border-slate-700'
                        }`}
                        placeholder="my-building"
                      />
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      {formData.tenantSubdomain || 'my-building'}.newconcierge.app
                    </p>
                    {errors.tenantSubdomain && (
                      <p className="mt-1 text-xs text-red-400">{errors.tenantSubdomain}</p>
                    )}
                  </div>

                  {/* Password fields */}
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="password" className="block text-sm font-medium text-slate-300 mb-2">
                        Κωδικός
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-500" />
                        <input
                          type={showPassword ? "text" : "password"}
                          id="password"
                          name="password"
                          value={formData.password}
                          onChange={handleInputChange}
                          autoComplete="new-password"
                          className={`w-full pl-10 pr-12 py-3 bg-slate-800 border rounded-xl text-slate-200 placeholder-slate-500 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-colors ${
                            errors.password ? 'border-red-500/50' : 'border-slate-700'
                          }`}
                          placeholder="••••••••"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-500 hover:text-slate-300"
                        >
                          {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                        </button>
                      </div>
                      {errors.password && (
                        <p className="mt-1 text-xs text-red-400">{errors.password}</p>
                      )}
                    </div>

                    <div>
                      <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-300 mb-2">
                        Επιβεβαίωση
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-500" />
                        <input
                          type={showConfirmPassword ? "text" : "password"}
                          id="confirmPassword"
                          name="confirmPassword"
                          value={formData.confirmPassword}
                          onChange={handleInputChange}
                          autoComplete="new-password"
                          className={`w-full pl-10 pr-12 py-3 bg-slate-800 border rounded-xl text-slate-200 placeholder-slate-500 focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-colors ${
                            errors.confirmPassword ? 'border-red-500/50' : 'border-slate-700'
                          }`}
                          placeholder="••••••••"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-500 hover:text-slate-300"
                        >
                          {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                        </button>
                      </div>
                      {errors.confirmPassword && (
                        <p className="mt-1 text-xs text-red-400">{errors.confirmPassword}</p>
                      )}
                    </div>
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-emerald-500 text-slate-950 py-3 px-6 rounded-xl font-semibold hover:bg-emerald-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center shadow-lg shadow-emerald-500/25"
                  >
                    {isLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-2 border-slate-950 border-t-transparent mr-2"></div>
                        Δημιουργία...
                      </>
                    ) : (
                      <>
                        {effectivePlan === 'free' ? 'Δημιουργία Λογαριασμού' : 'Συνέχεια στην Πληρωμή'}
                        <ArrowRight className="ml-2 h-5 w-5" />
                      </>
                    )}
                  </button>

                  {/* Terms */}
                  <p className="text-xs text-slate-500 text-center">
                    Με την εγγραφή αποδέχεστε τους{' '}
                    <a href="/terms" className="text-emerald-400 hover:text-emerald-300">Όρους Χρήσης</a>
                    {' '}και την{' '}
                    <a href="/privacy" className="text-emerald-400 hover:text-emerald-300">Πολιτική Απορρήτου</a>
                  </p>
                </form>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="animate-pulse text-slate-400">Φόρτωση...</div>
      </div>
    }>
      <SignupForm />
    </Suspense>
  );
}
