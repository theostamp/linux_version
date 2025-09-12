'use client';

import { useAuth } from '@/components/contexts/AuthContext';
import { useBuilding } from '@/components/contexts/BuildingContext';
import { Loader2 } from 'lucide-react';
import FinancialTests from '@/components/system/FinancialTests';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function FinancialTestsPage() {
  const { user, isAuthReady, isLoading: authLoading } = useAuth();
  const { isLoading: buildingLoading } = useBuilding();
  const router = useRouter();

  const isLoading = authLoading || buildingLoading || !isAuthReady;

  useEffect(() => {
    if (isAuthReady && (!user || !['manager', 'staff', 'superuser'].includes(user.role))) {
      router.push('/unauthorized');
    }
  }, [user, isAuthReady, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="flex items-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <span className="ml-3 text-gray-600">Φόρτωση...</span>
        </div>
      </div>
    );
  }

  if (!user || !['manager', 'staff', 'superuser'].includes(user.role)) {
    return null; // Will redirect via useEffect
  }

  return <FinancialTests />;
}