'use client';

import { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { AuthProvider } from '@/components/contexts/AuthContext';
import { BuildingProvider } from '@/components/contexts/BuildingContext';
import { ReactQueryProvider } from '@/components/contexts/ReactQueryProvider';
import LayoutWrapper from '@/components/LayoutWrapper';

export default function AppProviders({ children }: { readonly children: ReactNode }) {
  const pathname = usePathname();
  const isPublicDisplay = pathname?.startsWith('/info-screen');
  const isDashboard = pathname?.startsWith('/dashboard') || pathname?.startsWith('/announcements') || 
                     pathname?.startsWith('/votes') || pathname?.startsWith('/requests') || 
                     pathname?.startsWith('/buildings') || pathname?.startsWith('/apartments') ||
                     pathname?.startsWith('/map-visualization') || pathname?.startsWith('/residents');

  if (isPublicDisplay) {
    return (
      <ReactQueryProvider>
        <LayoutWrapper>{children}</LayoutWrapper>
      </ReactQueryProvider>
    );
  }

  if (isDashboard) {
    return (
      <ReactQueryProvider>
        <AuthProvider>
          <BuildingProvider>
            {children}
          </BuildingProvider>
        </AuthProvider>
      </ReactQueryProvider>
    );
  }

  return (
    <ReactQueryProvider>
      <AuthProvider>
        <BuildingProvider>
          <LayoutWrapper>{children}</LayoutWrapper>
        </BuildingProvider>
      </AuthProvider>
    </ReactQueryProvider>
  );
}