'use client';

import { useAuth } from '@/components/contexts/AuthContext';
import { getEffectiveRole, hasOfficeAdminAccess } from '@/lib/roleUtils';

type Role = 'any' | 'manager' | 'admin';

export function useAuthGuard(requiredRole: Role = 'any') {
  const { user, isAuthReady } = useAuth();

  const isAllowed = (() => {
    if (!user) return false;
    if (requiredRole === 'any') return true;

    const normalizedRole = getEffectiveRole(user);

    if (requiredRole === 'manager') return normalizedRole === 'manager' || normalizedRole === 'office_staff';
    if (requiredRole === 'admin') return hasOfficeAdminAccess(user);

    return false;
  })();

  return { isAllowed, isAuthReady };
}

