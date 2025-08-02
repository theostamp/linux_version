'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/contexts/AuthContext';

export function useSuperUserGuard() {
  const { user, isAuthReady } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthReady) return;
    if (!user?.is_superuser && !user?.is_staff) {
      router.push('/unauthorized');
    }
  }, [user, isAuthReady, router]);

  return {
    isAccessAllowed: isAuthReady && (user?.is_superuser || user?.is_staff),
    isLoading: !isAuthReady,
  };
}
