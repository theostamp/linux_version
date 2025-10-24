'use client';

import { useAuth } from '@/components/contexts/AuthContext';
import FinancialTests from '@/components/system/FinancialTests';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function FinancialTestsPage() {
  const { user, isAuthReady } = useAuth();
  const router = useRouter();

  useEffect(() => {
    console.log('[FinancialTests] Auth Check:', {
      isAuthReady,
      user: user ? { 
        email: user.email, 
        role: user.role,
        id: user.id 
      } : null,
      allowedRoles: ['manager', 'staff', 'superuser', 'admin'],
      hasAccess: user && user.role && ['manager', 'staff', 'superuser', 'admin'].includes(user.role),
      timestamp: new Date().toISOString()
    });
    
    if (isAuthReady && (!user || !user.role || !['manager', 'staff', 'superuser', 'admin'].includes(user.role))) {
      console.log('[FinancialTests] ACCESS DENIED - Redirecting to unauthorized');
      console.log('[FinancialTests] User role:', user?.role);
      router.push('/unauthorized');
    }
  }, [user, isAuthReady, router]);

  // Dashboard layout handles loading states, so we can directly render
  if (!user) {
    console.log('[FinancialTests] No user - returning null');
    return null;
  }

  if (!user.role || !['manager', 'staff', 'superuser', 'admin'].includes(user.role)) {
    console.log('[FinancialTests] Invalid role:', user.role, '- returning null');
    return null; // Will redirect via useEffect
  }

  console.log('[FinancialTests] ACCESS GRANTED - Rendering component');
  return <FinancialTests />;
}