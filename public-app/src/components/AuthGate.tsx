'use client';

import { useAuth } from '@/components/contexts/AuthContext';
import LoginForm from '@/components/LoginForm';
import { ReactNode } from 'react';

interface AuthGateProps {
  children: ReactNode;
  fallback?: ReactNode;
  role?: 'manager' | 'resident' | 'staff' | 'admin' | 'superuser' | 'any';
}

export default function AuthGate({ children, fallback, role = 'any' }: Readonly<AuthGateProps>) {
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

  if (role !== 'any' && userRole !== role) {
    return (
      <div className="p-6 text-red-600">
        ⛔ Δεν έχετε πρόσβαση σε αυτή τη σελίδα. (Απαιτείται ρόλος: {role})
      </div>
    );
  }

  return <>{children}</>;
}

