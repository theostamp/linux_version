'use client';

import { ReactNode } from 'react';
import { useAuth } from '@/components/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

interface SubscriptionGateProps {
  children: ReactNode;
  fallback?: ReactNode;
  requiredStatus?: 'active' | 'trial' | 'any';
}

export default function SubscriptionGate({
  children,
  fallback,
  requiredStatus = 'any'
}: SubscriptionGateProps) {
  const { user, isAuthReady, isLoading } = useAuth();

  // Show loading state while checking auth
  if (isLoading || !isAuthReady) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Έλεγχος συνδρομής...</p>
        </div>
      </div>
    );
  }

  // If no user, show fallback or nothing
  if (!user) {
    return fallback ? <>{fallback}</> : null;
  }

  // For now, allow all authenticated users (subscription check can be added later)
  return <>{children}</>;
}

