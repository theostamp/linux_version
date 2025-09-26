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
  // All routes from the (dashboard) directory should use auth
  // Check if the pathname starts with any of the dashboard routes
  const dashboardRoutes = [
    '/dashboard', '/announcements', '/votes', '/requests', '/buildings', '/apartments',
    '/map-visualization', '/residents', '/maintenance', '/collaborators', '/documents',
    '/kiosk-widgets', '/financial', '/projects', '/teams', '/admin', '/calendar',
    '/chat', '/data-migration', '/kiosk-settings', '/suppliers', '/system-health',
    '/financial-tests'
  ];
  
  const isDashboard = dashboardRoutes.some(route => pathname?.startsWith(route));

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

  // Always provide AuthProvider for all routes - let individual components decide if they need auth
  // Simplified logic: always provide AuthProvider, conditionally provide LayoutWrapper
  const shouldUseLayoutWrapper = pathname && !isDashboard && !isKioskMode && !isInfoScreen;
  
  return (
    <ReactQueryProvider>
      <LoadingProvider>
        <AuthProvider>
          <BuildingProvider>
            {shouldUseLayoutWrapper ? <LayoutWrapper>{children}</LayoutWrapper> : children}
          </BuildingProvider>
        </AuthProvider>
      </LoadingProvider>
    </ReactQueryProvider>
  );
}