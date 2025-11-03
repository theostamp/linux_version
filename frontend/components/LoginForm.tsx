// frontend/components/LoginForm.tsx
'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useAuth } from '@/components/contexts/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import OAuthButtons from './OAuthButtons';
import { Eye, EyeOff, RefreshCw, Mail } from 'lucide-react';
import { api } from '@/lib/api';

export default function LoginForm({ redirectTo = '/dashboard' }: { readonly redirectTo?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const finalRedirect = searchParams.get('redirectTo') ?? redirectTo;
  const { login } = useAuth();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [emailNotVerified, setEmailNotVerified] = useState(false);
  const [pendingVerificationEmail, setPendingVerificationEmail] = useState<string | null>(null);
  const [resendingEmail, setResendingEmail] = useState(false);

  const handleResendVerificationEmail = async () => {
    const emailToResend = pendingVerificationEmail || email || (typeof window !== 'undefined' ? localStorage.getItem('pending_verification_email') : null);
    
    if (!emailToResend) {
      toast.error('Δεν βρέθηκε email για επαναποστολή.');
      return;
    }
    
    setResendingEmail(true);
    
    try {
      await api.post('/api/users/resend-verification/', { email: emailToResend });
      toast.success('Το email επιβεβαίωσης στάλθηκε ξανά. Παρακαλώ ελέγξτε το inbox σας.');
    } catch (error: any) {
      console.error('Resend email error:', error);
      const errorMessage = error.response?.data?.error || 'Αποτυχία επαναποστολής email.';
      toast.error(errorMessage);
    } finally {
      setResendingEmail(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatus('Παρακαλώ περιμένετε...');

    try {
      const loggedInUser = await login(email, password);
      console.log('LoginForm: Login successful, user:', loggedInUser.email);

      toast.success('Επιτυχής σύνδεση!');
      setStatus('Επιτυχής σύνδεση! Έλεγχος συνδρομής...');

      // Clear queries and wait a bit for state to settle
      queryClient.clear();

      // Check if we need to redirect to tenant URL
      const tenantUrl = (loggedInUser as any).tenantUrl;
      const redirectPath = (loggedInUser as any).redirectPath || finalRedirect;
      
      // Get current hostname
      const currentHost = window.location.hostname;
      
      if (tenantUrl) {
        // Parse the tenant URL to get its hostname
        const tenantUrlObj = new URL(tenantUrl);
        const tenantHost = tenantUrlObj.hostname;
        
        // Check if we're already on the tenant subdomain
        if (currentHost === tenantHost) {
          console.log('LoginForm: Already on tenant subdomain, redirecting to dashboard');
          // We're already on the correct subdomain, just navigate to the dashboard
          setTimeout(() => {
            router.push('/dashboard');
          }, 100);
        } else {
          console.log('LoginForm: Redirecting to tenant URL:', tenantUrl);
          // We need to switch to the tenant subdomain
          window.location.href = tenantUrl;
        }
      } else {
        console.log('LoginForm: Backend suggested redirect:', redirectPath);
        setTimeout(() => {
          router.push(redirectPath);
        }, 100);
      }

    } catch (err: any) {
      console.error('LoginForm: Login error:', err);
      
      // Check if email is not verified
      const responseData = err.response?.data;
      if (responseData?.email_not_verified) {
        setEmailNotVerified(true);
        setPendingVerificationEmail(responseData.email || email);
        // Store email in localStorage for resend functionality
        if (typeof window !== 'undefined' && responseData.email) {
          localStorage.setItem('pending_verification_email', responseData.email);
        }
        toast.error('Το email σας δεν έχει επιβεβαιωθεί. Παρακαλώ ελέγξτε το email σας.');
        setStatus('Το email σας δεν έχει επιβεβαιωθεί. Παρακαλώ ελέγξτε το email σας και κάντε κλικ στο link επιβεβαίωσης.');
        setLoading(false);
        return;
      }
      
      // Extract error message from different possible locations
      let errorMessage = 'Σφάλμα σύνδεσης';
      if (responseData?.error) {
        errorMessage = responseData.error;
      } else if (responseData?.detail) {
        errorMessage = responseData.detail;
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setEmailNotVerified(false);
      setPendingVerificationEmail(null);
      toast.error(errorMessage);
      setStatus(errorMessage);
      setLoading(false);
    }
  };

  return (
    <Card className="max-w-sm mx-auto mt-10 shadow-xl">
      <CardContent className="p-6 space-y-4">
        <h2 className="text-xl font-semibold text-center">Σύνδεση</h2>
        <form onSubmit={handleLogin} className="space-y-4">␊
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="username"
            />
          </div>
          <div>
            <Label htmlFor="password">Κωδικός</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Απόκρυψη κωδικού' : 'Εμφάνιση κωδικού'}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4 text-gray-500" />
                ) : (
                  <Eye className="h-4 w-4 text-gray-500" />
                )}
              </Button>
            </div>
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Φόρτωση...' : 'Σύνδεση'}
          </Button>
          {status && (
            <p className={`text-center text-sm mt-2 ${emailNotVerified ? 'text-amber-600 font-medium' : 'text-gray-600'}`}>
              {status}
            </p>
          )}
          {emailNotVerified && pendingVerificationEmail && (
            <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-start gap-3">
                <Mail className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-amber-800 font-medium mb-2">
                    Το email σας <strong>{pendingVerificationEmail}</strong> δεν έχει επιβεβαιωθεί.
                  </p>
                  <p className="text-sm text-amber-700 mb-3">
                    Παρακαλώ ελέγξτε το inbox σας για το email επιβεβαίωσης. Αν δεν το έχετε λάβει, μπορείτε να το στείλετε ξανά.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleResendVerificationEmail}
                    disabled={resendingEmail}
                    className="w-full flex items-center justify-center gap-2 border-amber-300 text-amber-700 hover:bg-amber-100"
                  >
                    <RefreshCw className={`w-4 h-4 ${resendingEmail ? 'animate-spin' : ''}`} />
                    {resendingEmail ? 'Αποστολή...' : 'Επαναποστολή Email Επιβεβαίωσης'}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </form>
        
        <OAuthButtons mode="login" />

        <div className="mt-6 space-y-3 text-center">
          <button
            type="button"
            onClick={() => router.push('/forgot-password')}
            className="text-sm text-gray-500 hover:text-gray-700 underline"
          >
            Ξεχάσατε τον κωδικό σας;
          </button>

          <p className="text-sm text-gray-600">
            Δεν έχεις λογαριασμό;{' '}
            <button
              type="button"
              onClick={() => router.push('/register')}
              className="text-blue-600 hover:text-blue-800 font-medium"
            >
              Εγγραφή
            </button>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}