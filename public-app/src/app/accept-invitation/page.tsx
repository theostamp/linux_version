'use client';

import { useState, Suspense, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Building, Lock, ArrowRight, Loader2, Eye, EyeOff, CheckCircle, XCircle, UserPlus } from 'lucide-react';

function AcceptInvitationForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const buildingId = searchParams.get('building_id');
  
  const [formData, setFormData] = useState({
    password: '',
    passwordConfirm: ''
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
  const [success, setSuccess] = useState(false);

  // Redirect if no token
  useEffect(() => {
    if (!token) {
      setErrors({ general: 'Δεν βρέθηκε token πρόσκλησης. Παρακαλώ χρησιμοποιήστε τον σύνδεσμο από το email.' });
    }
  }, [token]);

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

    if (!formData.password) {
      newErrors.password = 'Ο κωδικός είναι υποχρεωτικός';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Ο κωδικός πρέπει να έχει τουλάχιστον 8 χαρακτήρες';
    }

    if (!formData.passwordConfirm) {
      newErrors.passwordConfirm = 'Η επιβεβαίωση κωδικού είναι υποχρεωτική';
    } else if (formData.password !== formData.passwordConfirm) {
      newErrors.passwordConfirm = 'Οι κωδικοί δεν ταιριάζουν';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm() || !token) {
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

      // Accept invitation via backend API
      const response = await fetch(`${coreApiUrl}/api/users/accept-invitation/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: token,
          password: formData.password,
          password_confirm: formData.passwordConfirm
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.detail || 'Σφάλμα αποδοχής πρόσκλησης');
      }

      // Store tokens if provided
      if (data.tokens?.access) {
        localStorage.setItem('access_token', data.tokens.access);
      }
      if (data.tokens?.refresh) {
        localStorage.setItem('refresh_token', data.tokens.refresh);
      }

      // Store building context from invitation URL or API response
      const finalBuildingId = buildingId || data.building_id;
      if (finalBuildingId) {
        localStorage.setItem('selectedBuildingId', finalBuildingId.toString());
        localStorage.setItem('activeBuildingId', finalBuildingId.toString());
        console.log(`[AcceptInvitation] Set active building from invitation: ${finalBuildingId}`);
      }

      setSuccess(true);
      
      // Redirect after 2 seconds - residents go to my-apartment, others to dashboard
      setTimeout(() => {
        // Check if user data indicates they are a resident
        const isResident = data.user?.role === 'resident';
        const targetPath = isResident ? '/my-apartment' : '/dashboard';
        
        // Handle cross-subdomain redirect if tenant_url is provided
        if (data.tenant_url) {
          // Build redirect URL with tokens for cross-subdomain auth
          const accessToken = localStorage.getItem('access_token') || '';
          const refreshToken = localStorage.getItem('refresh_token') || '';
          const redirectUrl = `https://${data.tenant_url}/auth/callback#access=${encodeURIComponent(accessToken)}&refresh=${encodeURIComponent(refreshToken)}&redirect=${encodeURIComponent(targetPath)}`;
          console.log('[AcceptInvitation] Cross-subdomain redirect to:', redirectUrl);
          window.location.href = redirectUrl;
        } else {
          router.push(targetPath);
        }
      }, 2000);
      
    } catch (error) {
      console.error('Accept invitation error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Προέκυψε σφάλμα. Παρακαλώ δοκιμάστε ξανά.';
      setErrors({ 
        general: errorMessage
      });
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen">
        {/* Header */}
        <header className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-6">
              <Link href="/" className="flex items-center">
                <Building className="h-8 w-8 text-primary" />
                <span className="ml-2 text-2xl font-bold text-gray-900">New Concierge</span>
              </Link>
            </div>
          </div>
        </header>

        <main className="py-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-md mx-auto">
            <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Επιτυχής Εγγραφή!
              </h1>
              <p className="text-gray-600 mb-4">
                Ο λογαριασμός σας δημιουργήθηκε επιτυχώς. Ανακατευθύνεστε στην εφαρμογή...
              </p>
              <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <Link href="/" className="flex items-center">
              <Building className="h-8 w-8 text-primary" />
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
            <div className="text-center mb-8">
              <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <UserPlus className="h-8 w-8 text-primary" />
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Αποδοχή Πρόσκλησης
              </h1>
              <p className="text-gray-600">
                Ορίστε τον κωδικό πρόσβασής σας για να ολοκληρώσετε την εγγραφή σας
              </p>
            </div>
            
            {errors.general && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 flex items-start gap-3">
                <XCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
                <div>{errors.general}</div>
              </div>
            )}

            {!token ? (
              <div className="text-center py-8">
                <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                <p className="text-gray-600">
                  Δεν βρέθηκε έγκυρο token πρόσκλησης.
                </p>
                <Link 
                  href="/login" 
                  className="mt-4 inline-block text-primary hover:text-primary-hover font-medium"
                >
                  Επιστροφή στη σύνδεση
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                    Νέος Κωδικός
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
                      className={`w-full pl-10 pr-12 py-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent ${
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
                  <p className="mt-1 text-xs text-gray-500">
                    Τουλάχιστον 8 χαρακτήρες
                  </p>
                </div>

                <div>
                  <label htmlFor="passwordConfirm" className="block text-sm font-medium text-gray-700 mb-2">
                    Επιβεβαίωση Κωδικού
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type={showPasswordConfirm ? "text" : "password"}
                      id="passwordConfirm"
                      name="passwordConfirm"
                      value={formData.passwordConfirm}
                      onChange={handleInputChange}
                      autoComplete="new-password"
                      className={`w-full pl-10 pr-12 py-3 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent ${
                        errors.passwordConfirm ? 'border-red-300' : 'border-slate-200'
                      }`}
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswordConfirm(!showPasswordConfirm)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                      aria-label={showPasswordConfirm ? "Απόκρυψη κωδικού" : "Εμφάνιση κωδικού"}
                    >
                      {showPasswordConfirm ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                  {errors.passwordConfirm && (
                    <p className="mt-1 text-sm text-red-600">{errors.passwordConfirm}</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-primary text-white py-3 px-6 rounded-lg font-semibold hover:bg-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="animate-spin h-5 w-5 mr-2" />
                      Ολοκλήρωση...
                    </>
                  ) : (
                    <>
                      Ολοκλήρωση Εγγραφής
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </>
                  )}
                </button>
              </form>
            )}

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                Έχετε ήδη λογαριασμό;{' '}
                <Link href="/login" className="text-primary hover:text-primary-hover font-semibold">
                  Συνδεθείτε
                </Link>
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function AcceptInvitationPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-gray-600">Φόρτωση...</p>
        </div>
      </div>
    }>
      <AcceptInvitationForm />
    </Suspense>
  );
}

