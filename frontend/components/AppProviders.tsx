'use client';

import { ReactNode, useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { AuthProvider } from '@/components/contexts/AuthContext';
import { BuildingProvider } from '@/components/contexts/BuildingContext';
import { ReactQueryProvider } from '@/components/contexts/ReactQueryProvider';
import { LoadingProvider } from '@/components/contexts/LoadingContext';
import LayoutWrapper from '@/components/LayoutWrapper';

export default function AppProviders({ children }: { readonly children: ReactNode }) {
  const pathname = usePathname();
  const [isClientReady, setIsClientReady] = useState(false);

  useEffect(() => {
    setIsClientReady(true);
  }, []);

  const isInfoScreen = pathname?.startsWith('/info-screen');
  const isKioskMode = (pathname?.startsWith('/kiosk') || pathname?.startsWith('/kiosk-display')) && !pathname?.startsWith('/kiosk-widgets') && !pathname?.startsWith('/kiosk-management');
  // All routes from the (dashboard) directory should use auth
  // Check if the pathname starts with any of the dashboard routes
  const dashboardRoutes = [
    '/dashboard', '/announcements', '/votes', '/requests', '/buildings', '/apartments', '/notifications',
    '/map-visualization', '/residents', '/maintenance', '/collaborators', '/documents',
    '/kiosk-widgets', '/kiosk-management', '/financial', '/projects', '/teams', '/admin', '/calendar',
    '/chat', '/data-migration', '/suppliers', '/system-health',
    '/financial-tests'
  ];

  const isDashboard = dashboardRoutes.some(route => pathname?.startsWith(route));

  // Debug logging
  useEffect(() => {
    console.log('[AppProviders] Current pathname:', pathname);
    console.log('[AppProviders] Is Dashboard:', isDashboard);
    console.log('[AppProviders] Is Kiosk Mode:', isKioskMode);
    console.log('[AppProviders] Is Info Screen:', isInfoScreen);
  }, [pathname, isDashboard, isKioskMode, isInfoScreen]);

  // Kiosk mode routes - no auth needed, no LayoutWrapper (they have their own layout)
  // IMPORTANT: Only /kiosk and /test-kiosk routes, NOT /kiosk-widgets or /kiosk-management
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

  // All other routes including /kiosk-widgets get AuthProvider
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