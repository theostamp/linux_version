'use client';

import { useAuth } from '@/components/contexts/AuthContext';
import LoginForm from '@/components/LoginForm';
import { ReactNode } from 'react';
import { getEffectiveRole } from '@/lib/roleUtils';

interface AuthGateProps {
  children: ReactNode;
  fallback?: ReactNode;
  role?: 'manager' | 'resident' | 'staff' | 'admin' | 'superuser' | 'any';
}

export default function AuthGate({ children, fallback, role = 'any' }: Readonly<AuthGateProps>) {
  const { user, isLoading, isAuthReady } = useAuth();
  const effectiveRole = getEffectiveRole(user);

  if (isLoading || !isAuthReady) {
    return <div className="p-6 text-center text-gray-500">🔄 Έλεγχος σύνδεσης...</div>;
  }

  if (!user) {
    return (
      <div className="p-6">
        <p className="mb-4 text-red-600">🚫 Πρέπει να συνδεθείτε.</p>
        {fallback ?? <LoginForm />}
      </div>
    );
  }

  // Check role access using effective role (includes is_superuser check)
  if (role !== 'any') {
    // Map 'admin' role requirement to 'superuser' (since admin role maps to superuser)
    const requiredRole = role === 'admin' ? 'superuser' : role;
    
    let hasAccess = false;
    
    if (requiredRole === 'superuser') {
      // Ultra Admin (platform admin) requires BOTH is_superuser AND is_staff
      // This distinguishes platform admins from tenant superusers
      hasAccess = user.is_superuser === true && user.is_staff === true;
    } else {
      // For other roles, use effective role check
      hasAccess = effectiveRole === requiredRole;
    }
    
    if (!hasAccess) {
      return (
        <div className="p-6 text-red-600">
          ⛔ Δεν έχετε πρόσβαση σε αυτή τη σελίδα. (Απαιτείται ρόλος: {role})
        </div>
      );
    }
  }

  return <>{children}</>;
}

