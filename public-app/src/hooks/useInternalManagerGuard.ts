'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/contexts/AuthContext';
import { getRoleLabel, hasInternalManagerAccess } from '@/lib/roleUtils';

/**
 * Guard hook για σελίδες που επιτρέπουν πρόσβαση σε:
 * - internal_manager (εσωτερικός διαχειριστής)
 * - manager (γραφείο διαχείρισης)
 * - office_staff (υπάλληλος γραφείου)
 * - staff
 * - superuser
 */
export function useInternalManagerGuard() {
  const { user, isAuthReady } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthReady) return;
    
    const hasAccess = hasInternalManagerAccess(user);
    console.log('useInternalManagerGuard: Checking permissions', {
      user: user?.email,
      role: getRoleLabel(user),
      hasAccess,
    });
    
    if (!hasAccess) {
      console.log('useInternalManagerGuard: Access denied, redirecting to unauthorized');
      router.push('/unauthorized');
    }
  }, [user, isAuthReady, router]);

  return {
    isAccessAllowed: isAuthReady && hasInternalManagerAccess(user),
    isLoading: !isAuthReady,
  };
}

