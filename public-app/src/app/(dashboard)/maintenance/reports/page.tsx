'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import AuthGate from '@/components/AuthGate';
import SubscriptionGate from '@/components/SubscriptionGate';

export default function MaintenanceReportsPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to financial reports page
    router.replace('/financial?tab=history');
  }, [router]);

  return (
    <AuthGate>
      <SubscriptionGate>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      </SubscriptionGate>
    </AuthGate>
  );
}


