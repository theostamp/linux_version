'use client';

import { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { AuthProvider } from '@/components/contexts/AuthContext';
import { BuildingProvider } from '@/components/contexts/BuildingContext';
import { ReactQueryProvider } from '@/components/contexts/ReactQueryProvider';
import { LoadingProvider } from '@/components/contexts/LoadingContext';
import LayoutWrapper from '@/components/LayoutWrapper';

export default function AppProviders({ children }: { readonly children: ReactNode }) {
  const pathname = usePathname();
  const isInfoScreen = pathname?.startsWith('/info-screen');
  const isKioskMode = pathname?.startsWith('/kiosk') || pathname?.startsWith('/test-kiosk');
  const isDashboard = pathname?.startsWith('/dashboard') || pathname?.startsWith('/announcements') || 
                     pathname?.startsWith('/votes') || pathname?.startsWith('/requests') || 
                     pathname?.startsWith('/buildings') || pathname?.startsWith('/apartments') ||
                     pathname?.startsWith('/map-visualization') || pathname?.startsWith('/residents');

  // Kiosk mode routes - no auth needed, no LayoutWrapper (they have their own layout)
  if (isKioskMode) {
    return (
      <ReactQueryProvider>
        <LoadingProvider>
          {children}
        </LoadingProvider>
      </ReactQueryProvider>
    );
  }

  // Info screen routes - no auth needed, uses LayoutWrapper
  if (isInfoScreen) {
    return (
      <ReactQueryProvider>
        <LoadingProvider>
          <LayoutWrapper>{children}</LayoutWrapper>
        </LoadingProvider>
      </ReactQueryProvider>
    );
  }

  if (isDashboard) {
    return (
      <ReactQueryProvider>
        <LoadingProvider>
          <AuthProvider>
            <BuildingProvider>
              {children}
            </BuildingProvider>
          </AuthProvider>
        </LoadingProvider>
      </ReactQueryProvider>
    );
  }

  return (
    <ReactQueryProvider>
      <LoadingProvider>
        <AuthProvider>
          <BuildingProvider>
            <LayoutWrapper>{children}</LayoutWrapper>
          </BuildingProvider>
        </AuthProvider>
      </LoadingProvider>
    </ReactQueryProvider>
  );
}