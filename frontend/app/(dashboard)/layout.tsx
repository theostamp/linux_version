// frontend/app/(dashboard)/layout.tsx
'use client';

import { ReactNode } from 'react';
import { useAuth } from '@/components/contexts/AuthContext';
import { useBuilding } from '@/components/contexts/BuildingContext';
import { Loader2 } from 'lucide-react';
import GlobalHeader from '@/components/GlobalHeader';
import Sidebar from '@/components/Sidebar';
import { Toaster } from 'react-hot-toast';
import NewsTicker from '@/components/NewsTicker';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { isAuthReady, isLoading: authLoading } = useAuth();
  const { isLoading: buildingLoading } = useBuilding();

  const isLoading = authLoading || buildingLoading || !isAuthReady;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 overflow-y-auto">
        <div className="flex justify-center items-center h-full p-10">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <span className="ml-3 text-gray-600">Φόρτωση...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-100 dark:bg-gray-950">
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 p-4 sm:p-6 md:p-8 lg:p-10 overflow-y-auto">
          <GlobalHeader />
          <div className="pt-4">
            {children}
          </div>
        </main>
        <Toaster position="top-right" />
      </div>
      <NewsTicker />
    </div>
  );
}
