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

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatus('Παρακαλώ περιμένετε...');
    try {
      await login(email, password);
      toast.success('Επιτυχής σύνδεση!');
      setStatus('Επιτυχής σύνδεση! Μεταφέρεστε...');
      queryClient.clear();
      router.push(finalRedirect);
    } catch (err: any) {
      console.error('Login error:', err);
      toast.error(err.message ?? 'Κάτι πήγε στραβά!');
      setStatus(err.message ?? 'Σφάλμα σύνδεσης');
    } finally {
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
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Φόρτωση...' : 'Σύνδεση'}
          </Button>
          {status && (
            <p className="text-center text-sm text-gray-600 mt-2">{status}</p>
          )}
        </form>
      </CardContent>
    </Card>
  );
}