// frontend/hooks/useAuthGuard.ts
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/contexts/AuthContext';

export function useAuthGuard() {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && !user) {
      console.warn('[useAuthGuard] Δεν υπάρχει ενεργός χρήστης — redirect σε login.');
      router.replace('/login');
    }
  }, [user, isLoading, router]);
}
