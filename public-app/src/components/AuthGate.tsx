'use client';

import { useAuth } from '@/components/contexts/AuthContext';
import LoginForm from '@/components/LoginForm';
import { ReactNode } from 'react';

interface AuthGateProps {
  children: ReactNode;
  fallback?: ReactNode;
  role?: 'manager' | 'resident' | 'staff' | 'admin' | 'superuser' | 'any' | Array<'manager' | 'resident' | 'staff' | 'admin' | 'superuser'>;
  /** Requires Ultra Admin (is_superuser=true && is_staff=true) */
  requiresUltraAdmin?: boolean;
}

/**
 * Check if user is Ultra Admin (platform level access).
 * Ultra Admin = role='admin' && is_superuser=true && is_staff=true
 */
function isUltraAdmin(user: any): boolean {
  return Boolean(
    user &&
    user.role?.toLowerCase() === 'admin' &&
    user.is_superuser === true &&
    user.is_staff === true
  );
}

export default function AuthGate({
  children,
  fallback,
  role = 'any',
  requiresUltraAdmin = false,
}: Readonly<AuthGateProps>) {
  const { user, isLoading, isAuthReady } = useAuth();
  const userRole = user?.role;

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

  // Ultra Admin check (takes precedence)
  if (requiresUltraAdmin) {
    if (!isUltraAdmin(user)) {
      return (
        <div className="p-6 text-red-600">
          ⛔ Δεν έχετε πρόσβαση σε αυτή τη σελίδα. (Απαιτείται Ultra Admin)
        </div>
      );
    }
    // Ultra Admin has access, render children
    return <>{children}</>;
  }

  // Handle array of roles
  if (Array.isArray(role)) {
    const hasAccess = role.includes(userRole as any) || (role.includes('superuser' as any) && isUltraAdmin(user));
    if (!hasAccess) {
      return (
        <div className="p-6 text-red-600">
          ⛔ Δεν έχετε πρόσβαση σε αυτή τη σελίδα. (Απαιτείται ρόλος: {role.join(', ')})
        </div>
      );
    }
    return <>{children}</>;
  }

  // For 'superuser' role, also accept Ultra Admin users
  if (role === 'superuser') {
    if (userRole !== 'superuser' && !isUltraAdmin(user)) {
      return (
        <div className="p-6 text-red-600">
          ⛔ Δεν έχετε πρόσβαση σε αυτή τη σελίδα. (Απαιτείται ρόλος: {role})
        </div>
      );
    }
    return <>{children}</>;
  }

  // Standard role check
  if (role !== 'any' && userRole !== role) {
    return (
      <div className="p-6 text-red-600">
        ⛔ Δεν έχετε πρόσβαση σε αυτή τη σελίδα. (Απαιτείται ρόλος: {role})
      </div>
    );
  }

  return <>{children}</>;
}
