'use client';

import { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import CollapsibleSidebar from '@/components/CollapsibleSidebar';
import GlobalHeader from '@/components/GlobalHeader';
import GlobalLoadingOverlay from '@/components/GlobalLoadingOverlay';

export default function LayoutWrapper({ children }: { readonly children: ReactNode }) {
  const pathname = usePathname();
  const isInfoScreen = pathname?.startsWith('/info-screen');

  if (isInfoScreen) {
    return (
      <div className="min-h-screen">
        {children}
        <GlobalLoadingOverlay />
      </div>
    );
  }

  // Ενοποιημένο layout με CollapsibleSidebar (όπως το dashboard)
  return (
    <div className="min-h-screen bg-background">
      {/* Ενοποιημένο Collapsible Sidebar */}
      <CollapsibleSidebar />

      {/* Main Content - Adjusted padding for collapsed sidebar (80px) */}
      <div className="lg:pl-20">
        {/* Header */}
        <GlobalHeader />

        {/* Page Content */}
        <div className="py-8 container mx-auto px-4 sm:px-6 lg:px-8">
          {children}
        </div>
      </div>
      <GlobalLoadingOverlay />
    </div>
  );
}
