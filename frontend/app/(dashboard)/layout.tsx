// frontend/app/(dashboard)/layout.tsx
'use client';

import { ReactNode } from 'react';
import { useAuth } from '@/components/contexts/AuthContext';
import { useBuilding } from '@/components/contexts/BuildingContext';
import { Loader2 } from 'lucide-react';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { isAuthReady, isLoading: authLoading } = useAuth();
  const { isLoading: buildingLoading } = useBuilding();

  const isLoading = authLoading || buildingLoading || !isAuthReady;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 overflow-y-auto">
      {isLoading ? (
        <div className="flex justify-center items-center h-full p-10">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <span className="ml-3 text-gray-600">Φόρτωση...</span>
        </div>
      ) : (
        children
      )}
    </div>
  );
}
