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
import { Eye, EyeOff } from 'lucide-react';
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

      // Check subscription status before redirecting
      try {
        const { data } = await api.get('/api/users/subscription/');
        const hasActiveSubscription = data.subscription &&
          (data.subscription.status === 'active' || data.subscription.status === 'trial');

        console.log('LoginForm: Subscription status:', data.subscription?.status);

        // Redirect based on subscription status
        const redirectPath = hasActiveSubscription ? finalRedirect : '/plans';
        console.log('LoginForm: Redirecting to:', redirectPath);

        setTimeout(() => {
          router.push(redirectPath);
        }, 100);
      } catch (subError) {
        console.error('LoginForm: Subscription check error:', subError);
        // If subscription check fails, redirect to plans to be safe
        setTimeout(() => {
          router.push('/plans');
        }, 100);
      }

    } catch (err: any) {
      console.error('LoginForm: Login error:', err);
      
      // Extract error message from different possible locations
      let errorMessage = 'Σφάλμα σύνδεσης';
      if (err.response?.data?.error) {
        errorMessage = err.response.data.error;
      } else if (err.response?.data?.detail) {
        errorMessage = err.response.data.detail;
      } else if (err.message) {
        errorMessage = err.message;
      }
      
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
            <p className="text-center text-sm text-gray-600 mt-2">{status}</p>
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