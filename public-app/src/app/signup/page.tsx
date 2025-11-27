'use client';

import { useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Building, User, Mail, Lock, ArrowRight, CheckCircle, Eye, EyeOff } from 'lucide-react';

function SignupForm() {
  const searchParams = useSearchParams();
  const selectedPlan = searchParams.get('plan') || 'professional';
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    tenantSubdomain: '',
    plan: selectedPlan
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const plans = {
    basic: { name: 'Βασικό', price: 29, apartments: 'Έως 20 διαμερίσματα' },
    professional: { name: 'Επαγγελματικό', price: 59, apartments: 'Έως 50 διαμερίσματα' },
    enterprise: { name: 'Επιχειρηματικό', price: 99, apartments: 'Απεριόριστα' }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
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
      newErrors.tenantSubdomain = 'Το subdomain του κτιρίου είναι υποχρεωτικό';
    } else if (!/^[a-z0-9-]+$/.test(formData.tenantSubdomain)) {
      newErrors.tenantSubdomain = 'Το subdomain μπορεί να περιέχει μόνο πεζά γράμματα, αριθμούς και παύλες';
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
      // Create checkout session
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          plan: formData.plan,
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

      // Redirect to Stripe Checkout
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error('No checkout URL received');
      }
      
    } catch (error) {
      console.error('Signup error:', error);
      setErrors({ 
        general: error instanceof Error ? error.message : 'Προέκυψε σφάλμα κατά την εγγραφή. Παρακαλώ δοκιμάστε ξανά.' 
      });
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
            <div className="flex items-center space-x-4">
              <Link href="/login" className="text-gray-600 hover:text-gray-900">
                Σύνδεση
              </Link>
              <Link href="/" className="text-gray-600 hover:text-gray-900">
                Επιστροφή στην Αρχική
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Δημιουργήστε τον Λογαριασμό σας
            </h1>
            <p className="text-xl text-gray-600">
              Ξεκινήστε με το πρόγραμμα {plans[formData.plan as keyof typeof plans]?.name}
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-12">
            {/* Signup Form */}
            <div className="bg-white rounded-2xl shadow-lg p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Στοιχεία Λογαριασμού</h2>
              
              {errors.general && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
                  {errors.general}
                </div>
              )}

              {/* Google OAuth Button */}
              <button
                type="button"
                onClick={() => {
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
                  
                  const redirectUri = `${window.location.origin}/auth/callback`;
                  const state = JSON.stringify({ 
                    provider: 'google',
                    action: 'signup',
                    plan: formData.plan,
                    tenantSubdomain: formData.tenantSubdomain 
                  });
                  const googleAuthUrl = `${coreApiUrl}/api/users/auth/google/?redirect_uri=${encodeURIComponent(redirectUri)}&state=${encodeURIComponent(state)}`;
                  window.location.href = googleAuthUrl;
                }}
                className="w-full bg-white border-2 border-slate-200 text-gray-700 py-3 px-6 rounded-lg font-semibold hover:bg-gray-50 transition-colors flex items-center justify-center mb-6"
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
                  <div className="w-full border-t border-slate-200"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">ή</span>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-2">
                      Όνομα
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <input
                        type="text"
                        id="firstName"
                        name="firstName"
                        value={formData.firstName}
                        onChange={handleInputChange}
                        autoComplete="given-name"
                        className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                          errors.firstName ? 'border-red-300' : 'border-slate-200'
                        }`}
                        placeholder="John"
                      />
                    </div>
                    {errors.firstName && (
                      <p className="mt-1 text-sm text-red-600">{errors.firstName}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-2">
                      Επώνυμο
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <input
                        type="text"
                        id="lastName"
                        name="lastName"
                        value={formData.lastName}
                        onChange={handleInputChange}
                        autoComplete="family-name"
                        className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                          errors.lastName ? 'border-red-300' : 'border-slate-200'
                        }`}
                        placeholder="Doe"
                      />
                    </div>
                    {errors.lastName && (
                      <p className="mt-1 text-sm text-red-600">{errors.lastName}</p>
                    )}
                  </div>
                </div>

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
                      value={formData.email}
                      onChange={handleInputChange}
                      autoComplete="email"
                      className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        errors.email ? 'border-red-300' : 'border-slate-200'
                      }`}
                      placeholder="john@example.com"
                    />
                  </div>
                  {errors.email && (
                    <p className="mt-1 text-sm text-red-600">{errors.email}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="tenantSubdomain" className="block text-sm font-medium text-gray-700 mb-2">
                    Subdomain Κτιρίου
                  </label>
                  <div className="relative">
                    <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="text"
                      id="tenantSubdomain"
                      name="tenantSubdomain"
                      value={formData.tenantSubdomain}
                      onChange={handleInputChange}
                      className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        errors.tenantSubdomain ? 'border-red-300' : 'border-slate-200'
                      }`}
                      placeholder="my-building"
                    />
                  </div>
                  <p className="mt-1 text-sm text-gray-500">
                    Το κτίριό σας θα είναι προσβάσιμο στο: {formData.tenantSubdomain || 'my-building'}.localhost
                  </p>
                  {errors.tenantSubdomain && (
                    <p className="mt-1 text-sm text-red-600">{errors.tenantSubdomain}</p>
                  )}
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                      Κωδικός
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <input
                        type={showPassword ? "text" : "password"}
                        id="password"
                        name="password"
                        value={formData.password}
                        onChange={handleInputChange}
                        autoComplete="new-password"
                        className={`w-full pl-10 pr-12 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                          errors.password ? 'border-red-300' : 'border-slate-200'
                        }`}
                        placeholder="••••••••"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
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
                      <p className="mt-1 text-sm text-red-600">{errors.password}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                      Επιβεβαίωση Κωδικού
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        id="confirmPassword"
                        name="confirmPassword"
                        value={formData.confirmPassword}
                        onChange={handleInputChange}
                        autoComplete="new-password"
                        className={`w-full pl-10 pr-12 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                          errors.confirmPassword ? 'border-red-300' : 'border-slate-200'
                        }`}
                        placeholder="••••••••"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                        aria-label={showConfirmPassword ? "Απόκρυψη κωδικού" : "Εμφάνιση κωδικού"}
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="h-5 w-5" />
                        ) : (
                          <Eye className="h-5 w-5" />
                        )}
                      </button>
                    </div>
                    {errors.confirmPassword && (
                      <p className="mt-1 text-sm text-red-600">{errors.confirmPassword}</p>
                    )}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      Δημιουργία Λογαριασμού...
                    </>
                  ) : (
                    <>
                      Δημιουργία Λογαριασμού & Συνέχεια στην Πληρωμή
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </>
                  )}
                </button>
              </form>

              <div className="mt-6 text-center">
                <p className="text-sm text-gray-600">
                  Έχετε ήδη λογαριασμό;{' '}
                  <Link href="/login" className="text-blue-600 hover:text-blue-500 font-semibold">
                    Συνδεθείτε
                  </Link>
                </p>
              </div>
            </div>

            {/* Plan Summary */}
            <div className="bg-white rounded-2xl shadow-lg p-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Σύνοψη Προγράμματος</h2>
              
              <div className="border border-gray-200 rounded-lg p-6 mb-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900">
                      {plans[formData.plan as keyof typeof plans]?.name}
                    </h3>
                    <p className="text-gray-600">
                      {plans[formData.plan as keyof typeof plans]?.apartments}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-gray-900">
                      €{plans[formData.plan as keyof typeof plans]?.price}
                    </div>
                    <div className="text-gray-600">ανά μήνα</div>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-3" />
                    <span className="text-gray-700">30ήμερη δωρεάν δοκιμή</span>
                  </div>
                  <div className="flex items-center">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-3" />
                    <span className="text-gray-700">Ακύρωση οποιαδήποτε στιγμή</span>
                  </div>
                  <div className="flex items-center">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-3" />
                    <span className="text-gray-700">Πλήρης πρόσβαση σε όλες τις λειτουργίες</span>
                  </div>
                  <div className="flex items-center">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-3" />
                    <span className="text-gray-700">Υποστήριξη 24/7</span>
                  </div>
                </div>
              </div>

              <div className="text-sm text-gray-600">
                <p className="mb-2">
                  <strong>Τι ακολουθεί;</strong>
                </p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>Δημιουργήστε τον λογαριασμό σας</li>
                  <li>Ολοκληρώστε τη ρύθμιση πληρωμής</li>
                  <li>Προσπελάστε τον πίνακα ελέγχου του κτιρίου</li>
                  <li>Ξεκινήστε τη διαχείριση του κτιρίου σας</li>
                </ol>
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-gray-600">Φόρτωση...</div>
      </div>
    }>
      <SignupForm />
    </Suspense>
  );
}
