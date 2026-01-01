'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/contexts/AuthContext';
import { getRoleLabel, hasOfficeAdminAccess } from '@/lib/roleUtils';

export function useSuperUserGuard() {
  const { user, isAuthReady } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthReady) return;

    const hasAccess = hasOfficeAdminAccess(user);
    console.log('useSuperUserGuard: Checking permissions', {
      user: user?.email,
      role: getRoleLabel(user),
      hasAccess,
    });

    if (!hasAccess) {
      console.log('useSuperUserGuard: Access denied, redirecting to unauthorized');
      router.push('/unauthorized');
    }
  }, [user, isAuthReady, router]);

  return {
    isAccessAllowed: isAuthReady && hasOfficeAdminAccess(user),
    isLoading: !isAuthReady,
  };
}
