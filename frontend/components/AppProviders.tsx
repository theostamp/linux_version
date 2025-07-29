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
  const isPublicDisplay = pathname?.startsWith('/info-screen');
  const isDashboard = pathname?.startsWith('/dashboard') || pathname?.startsWith('/announcements') || 
                     pathname?.startsWith('/votes') || pathname?.startsWith('/requests') || 
                     pathname?.startsWith('/buildings') || pathname?.startsWith('/apartments') ||
                     pathname?.startsWith('/map-visualization') || pathname?.startsWith('/residents');

  if (isPublicDisplay) {
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