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
import GlobalLoadingOverlay from '@/components/GlobalLoadingOverlay';

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
    <div className="flex h-screen bg-gray-50 dark:bg-gray-950 overflow-hidden">
      {/* Fixed Sidebar */}
      <Sidebar />
      
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden lg:ml-64">
        {/* Fixed Header */}
        <GlobalHeader />
        
        {/* Scrollable Main Content */}
        <main className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-950">
          <div className="p-4 sm:p-6 md:p-8 lg:p-10">
            {children}
          </div>
        </main>
        
        {/* News Ticker at Bottom */}
        <NewsTicker />
      </div>
      
      {/* Global Loading Overlay */}
      <GlobalLoadingOverlay />
      
      <Toaster position="top-right" />
    </div>
  );
}
