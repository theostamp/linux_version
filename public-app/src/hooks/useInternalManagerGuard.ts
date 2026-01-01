'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/contexts/AuthContext';
import { useBuilding } from '@/components/contexts/BuildingContext';
import { getEffectiveRoleForBuilding, getRoleLabelFromRole } from '@/lib/roleUtils';

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
  const { selectedBuilding } = useBuilding();
  const router = useRouter();
  const effectiveRole = getEffectiveRoleForBuilding(user, selectedBuilding);
  const hasAccess = effectiveRole
    ? ['internal_manager', 'manager', 'office_staff', 'staff', 'superuser'].includes(effectiveRole)
    : false;

  useEffect(() => {
    if (!isAuthReady) return;

    console.log('useInternalManagerGuard: Checking permissions', {
      user: user?.email,
      role: getRoleLabelFromRole(effectiveRole),
      buildingId: selectedBuilding?.id,
      hasAccess,
    });

    if (!hasAccess) {
      console.log('useInternalManagerGuard: Access denied, redirecting to unauthorized');
      router.push('/unauthorized');
    }
  }, [user, isAuthReady, router, effectiveRole, selectedBuilding?.id, hasAccess]);

  return {
    isAccessAllowed: isAuthReady && hasAccess,
    isLoading: !isAuthReady,
  };
}
