'use client';

import { Suspense, useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Building2, Lock, User, ArrowRight, Check, AlertCircle, Loader2, Eye, EyeOff } from 'lucide-react';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

interface InvitationDetails {
  email: string;
  building_name: string;
  building_address?: string;
  expires_at: string;
}

function CompleteRegistrationContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams?.get('token');

  const [isVerifying, setIsVerifying] = useState(true);
  const [invitationDetails, setInvitationDetails] = useState<InvitationDetails | null>(null);
  const [verificationError, setVerificationError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    password: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [submitMessage, setSubmitMessage] = useState('');

  // Verify token on mount
  useEffect(() => {
    if (!token) {
      setVerificationError('Μη έγκυρος σύνδεσμος. Δεν βρέθηκε token.');
      setIsVerifying(false);
      return;
    }

    verifyToken(token);
  }, [token]);

  const verifyToken = async (token: string) => {
    try {
      const response = await fetch(`/api/users/invitations/verify/?token=${token}`);
      const data = await response.json();

      if (response.ok) {
        setInvitationDetails({
          email: data.email,
          building_name: data.building_name || 'Κτίριο',
          building_address: data.building_address,
          expires_at: data.expires_at
        });
      } else {
        setVerificationError(data.error || 'Μη έγκυρος ή ληγμένος σύνδεσμος.');
      }
    } catch (error) {
      console.error('Token verification error:', error);
      setVerificationError('Σφάλμα κατά την επαλήθευση. Παρακαλώ δοκιμάστε ξανά.');
    } finally {
      setIsVerifying(false);
    }
  };

  const validateForm = (): string | null => {
    if (!formData.firstName.trim()) {
      return 'Το όνομα είναι υποχρεωτικό';
    }
    if (!formData.lastName.trim()) {
      return 'Το επώνυμο είναι υποχρεωτικό';
    }
    if (formData.password.length < 8) {
      return 'Ο κωδικός πρέπει να έχει τουλάχιστον 8 χαρακτήρες';
    }
    if (formData.password !== formData.confirmPassword) {
      return 'Οι κωδικοί δεν ταιριάζουν';
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validationError = validateForm();
    if (validationError) {
      setSubmitStatus('error');
      setSubmitMessage(validationError);
      return;
    }

    if (!token) {
      setSubmitStatus('error');
      setSubmitMessage('Μη έγκυρο token');
      return;
    }

    setIsSubmitting(true);
    setSubmitStatus('idle');
    setSubmitMessage('');

    try {
      const response = await fetch('/api/users/accept-invitation/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          password: formData.password,
          first_name: formData.firstName,
          last_name: formData.lastName
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSubmitStatus('success');
        setSubmitMessage('Η εγγραφή σας ολοκληρώθηκε επιτυχώς!');
        
        // Store tokens if provided (backend returns them under 'tokens' key)
        if (data.tokens?.access) {
          localStorage.setItem('access_token', data.tokens.access);
        }
        if (data.tokens?.refresh) {
          localStorage.setItem('refresh_token', data.tokens.refresh);
        }
        
        // Redirect to dashboard after 2 seconds
        setTimeout(() => {
          router.push('/dashboard');
        }, 2000);
      } else {
        setSubmitStatus('error');
        setSubmitMessage(data.error || 'Σφάλμα κατά την εγγραφή. Παρακαλώ δοκιμάστε ξανά.');
      }
    } catch (error) {
      console.error('Registration error:', error);
      setSubmitStatus('error');
      setSubmitMessage('Σφάλμα σύνδεσης. Παρακαλώ δοκιμάστε ξανά.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Loading state
  if (isVerifying) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-blue-400 animate-spin mx-auto mb-4" />
          <p className="text-white/70">Επαλήθευση συνδέσμου...</p>
        </div>
      </div>
    );
  }

  // Error state - invalid token
  if (verificationError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 flex items-center justify-center p-4">
        <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-8 max-w-md text-center">
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Μη Έγκυρος Σύνδεσμος</h2>
          <p className="text-red-200 mb-6">{verificationError}</p>
          <p className="text-white/60 text-sm">
            Παρακαλώ σαρώστε ξανά το QR code στο kiosk του κτιρίου σας.
          </p>
        </div>
      </div>
    );
  }

  // Success state
  if (submitStatus === 'success') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 flex items-center justify-center p-4">
        <div className="bg-green-500/10 border border-green-500/30 rounded-2xl p-8 max-w-md text-center">
          <div className="w-20 h-20 bg-green-500/20 border-2 border-green-400 rounded-full flex items-center justify-center mx-auto mb-6">
            <Check className="w-10 h-10 text-green-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Καλώς ήρθατε!</h2>
          <p className="text-green-200 mb-4">{submitMessage}</p>
          <p className="text-white/60 text-sm">Ανακατεύθυνση στην εφαρμογή...</p>
          <Loader2 className="w-6 h-6 text-green-400 animate-spin mx-auto mt-4" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-600 rounded-3xl mb-6 shadow-2xl">
            <Building2 className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-3">
            Ολοκλήρωση Εγγραφής
          </h1>
          {invitationDetails && (
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4 mb-2">
              <p className="text-lg font-semibold text-white">{invitationDetails.building_name}</p>
              {invitationDetails.building_address && (
                <p className="text-sm text-white/60 mt-1">{invitationDetails.building_address}</p>
              )}
              <p className="text-sm text-blue-300 mt-2">{invitationDetails.email}</p>
            </div>
          )}
        </div>

        {/* Form Card */}
        <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-8 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-5">

            {/* Name Fields */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="firstName" className="block text-sm font-medium text-white/80 mb-2">
                  Όνομα *
                </label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white/40" />
                  <input
                    id="firstName"
                    type="text"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    placeholder="Γιώργος"
                    required
                    disabled={isSubmitting}
                    className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/20 rounded-xl text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-transparent transition-all disabled:opacity-50"
                  />
                </div>
              </div>
              <div>
                <label htmlFor="lastName" className="block text-sm font-medium text-white/80 mb-2">
                  Επώνυμο *
                </label>
                <input
                  id="lastName"
                  type="text"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  placeholder="Παπαδόπουλος"
                  required
                  disabled={isSubmitting}
                  className="w-full px-4 py-4 bg-white/5 border border-white/20 rounded-xl text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-transparent transition-all disabled:opacity-50"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-white/80 mb-2">
                Κωδικός *
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white/40" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Τουλάχιστον 8 χαρακτήρες"
                  required
                  minLength={8}
                  disabled={isSubmitting}
                  className="w-full pl-12 pr-12 py-4 bg-white/5 border border-white/20 rounded-xl text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-transparent transition-all disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-white/40 hover:text-white/60"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Confirm Password Field */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-white/80 mb-2">
                Επιβεβαίωση Κωδικού *
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white/40" />
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  placeholder="Επαναλάβετε τον κωδικό"
                  required
                  disabled={isSubmitting}
                  className="w-full pl-12 pr-12 py-4 bg-white/5 border border-white/20 rounded-xl text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-transparent transition-all disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-white/40 hover:text-white/60"
                >
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Error Message */}
            {submitStatus === 'error' && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-200">{submitMessage}</p>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Εγγραφή...</span>
                </>
              ) : (
                <>
                  <span>Ολοκλήρωση Εγγραφής</span>
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>

            {/* Info Text */}
            <div className="text-center">
              <p className="text-xs text-white/50 leading-relaxed">
                Με την εγγραφή σας αποδέχεστε τους όρους χρήσης της υπηρεσίας.
              </p>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-xs text-white/30">
            © {new Date().getFullYear()} New Concierge. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}

// Loading fallback
function CompleteRegistrationLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="w-12 h-12 text-blue-400 animate-spin mx-auto mb-4" />
        <p className="text-white/70">Φόρτωση...</p>
      </div>
    </div>
  );
}

// Main page component with Suspense
export default function KioskCompleteRegistrationPage() {
  return (
    <Suspense fallback={<CompleteRegistrationLoading />}>
      <CompleteRegistrationContent />
    </Suspense>
  );
}

