'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useAuth } from '@/components/contexts/AuthContext';
import type { User } from '@/types/user';
import { Eye, EyeOff } from 'lucide-react';

// Καθορίζει τη σωστή landing page βάσει του ρόλου του χρήστη
function getRedirectForRole(user: User | null): string {
  if (!user) return '/login';
  
  // Superusers, staff, managers -> Dashboard
  if (user.is_superuser || user.is_staff) {
    return '/dashboard';
  }
  
  // Check role
  const role = user.role;
  if (role === 'manager' || role === 'office_staff') {
    return '/dashboard';
  }
  
  // Internal managers -> Financial (βλέπουν τα οικονομικά της πολυκατοικίας τους)
  if (role === 'internal_manager') {
    return '/financial';
  }
  
  // Residents -> My Apartment
  if (role === 'resident') {
    return '/my-apartment';
  }
  
  // Default για άγνωστους ρόλους -> announcements (safe default)
  return '/announcements';
}

export default function LoginForm({ redirectTo }: { readonly redirectTo?: string }) {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const user = await login(email, password);
      toast.success('Επιτυχής σύνδεση!');
      
      // Αν υπάρχει explicit redirectTo, χρησιμοποίησέ το
      // Αλλιώς, κατεύθυνε βάσει ρόλου
      const targetUrl = redirectTo || getRedirectForRole(user);
      router.push(targetUrl);
    } catch (err: unknown) {
      const error = err as { message?: string };
      toast.error(error.message ?? 'Σφάλμα σύνδεσης');
      setLoading(false);
    }
  };

  return (
    <Card className="max-w-sm mx-auto mt-10 shadow-xl">
      <CardContent className="p-6 space-y-4">
        <h2 className="text-xl font-semibold text-center text-foreground">Σύνδεση</h2>
        <form onSubmit={handleLogin} className="space-y-4">
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
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Σύνδεση...' : 'Σύνδεση'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
