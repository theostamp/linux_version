'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/contexts/AuthContext';

export function useSuperUserGuard() {
  const { user, isAuthReady } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthReady) return;
    
    console.log('useSuperUserGuard: Checking permissions', {
      user: user?.email,
      is_superuser: user?.is_superuser,
      is_staff: user?.is_staff,
      hasAccess: user?.is_superuser || user?.is_staff
    });
    
    if (!user?.is_superuser && !user?.is_staff) {
      console.log('useSuperUserGuard: Access denied, redirecting to unauthorized');
      router.push('/unauthorized');
    }
  }, [user, isAuthReady, router]);

  return {
    isAccessAllowed: isAuthReady && (user?.is_superuser || user?.is_staff),
    isLoading: !isAuthReady,
  };
}

