'use client';

import { useAuth } from '@/components/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { AlertCircle } from 'lucide-react';

export default function FinancialTestsPage() {
  const { user, isAuthReady } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isAuthReady && (!user || !user.role || !['manager', 'staff', 'superuser', 'admin'].includes(user.role))) {
      router.push('/unauthorized');
    }
  }, [user, isAuthReady, router]);

  if (!isAuthReady) {
    return (
      <div className="p-6">
        <p>Έλεγχος δικαιωμάτων...</p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (!user.role || !['manager', 'staff', 'superuser', 'admin'].includes(user.role)) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <AlertCircle className="w-8 h-8 text-blue-600" />
        <h1 className="page-title">🧪 Financial Tests</h1>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
        <div className="flex items-start space-x-3">
          <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
          <div>
            <h3 className="font-medium text-yellow-900 mb-2">⚠️ Component Missing</h3>
            <p className="text-sm text-yellow-800">
              Το FinancialTests component λείπει. Χρειάζεται να δημιουργηθεί για να λειτουργήσει αυτή η σελίδα.
            </p>
            <p className="text-xs text-yellow-700 mt-2">
              Το component βρίσκεται στο: components/system/FinancialTests.tsx
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
