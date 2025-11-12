'use client';

import { useAuth } from '@/components/contexts/AuthContext';

type Role = 'any' | 'manager' | 'admin';

export function useAuthGuard(requiredRole: Role = 'any') {
  const { user, isAuthReady } = useAuth();

  const isAllowed = (() => {
    if (!user) return false;
    if (requiredRole === 'any') return true;

    const role = user.role;

    if (requiredRole === 'manager') return user.is_staff || role === 'manager';
    if (requiredRole === 'admin') return user.is_superuser || role === 'superuser';

    return false;
  })();

  return { isAllowed, isAuthReady };
}

