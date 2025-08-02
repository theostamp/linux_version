'use client';

import { useAuth } from '@/components/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { ReactNode, useEffect } from 'react';

interface RoleGuardProps {
  readonly allowedRoles: readonly ('superuser' | 'staff' | 'manager')[];
  readonly children: ReactNode;
}

export default function RoleGuard({ allowedRoles, children }: RoleGuardProps) {
  const { user, isAuthReady } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthReady) return;

    const hasAccess =
      user &&
      (
        (allowedRoles.includes('superuser') && user.is_superuser) ||
        (allowedRoles.includes('staff') && user.is_staff)
        // add more roles as needed
      );

    if (!hasAccess) {
      router.push('/unauthorized');
    }
  }, [user, isAuthReady, router, allowedRoles]);

  if (!isAuthReady) return <p>Έλεγχος δικαιωμάτων...</p>;

  return <>{children}</>;
}
