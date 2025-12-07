'use client';

import { ReactNode, useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Toaster } from 'sonner';
import { AuthProvider } from '@/components/contexts/AuthContext';
import { BuildingProvider } from '@/components/contexts/BuildingContext';
import { ReactQueryProvider } from '@/components/contexts/ReactQueryProvider';
import { LoadingProvider } from '@/components/contexts/LoadingContext';
import LayoutWrapper from '@/components/LayoutWrapper';

export default function AppProviders({ children }: { readonly children: ReactNode }) {
  const pathname = usePathname();

  const isInfoScreen = pathname?.startsWith('/info-screen');
  const isKioskMode = (pathname?.startsWith('/kiosk') || pathname?.startsWith('/kiosk-display')) && !pathname?.startsWith('/kiosk-widgets') && !pathname?.startsWith('/kiosk-management');

  // Routes that should NOT have sidebar (landing pages, auth pages, payment pages)
  const noSidebarRoutes = [
    '/',
    '/login',
    '/register',
    '/signup',
    '/plans',
    '/payment',
    '/auth/callback',
    '/logout',
    '/verify-payment',
    '/forgot-password',
    '/accept-invitation'
  ];
  
  // Auth pages that should NOT show the loading spinner (they handle their own auth)
  const noAuthLoadingRoutes = [
    '/login',
    '/signup',
    '/forgot-password',
    '/accept-invitation',
    '/'
  ];
  
  const isNoAuthLoadingRoute = noAuthLoadingRoutes.some(route =>
    pathname === route || (route !== '/' && pathname?.startsWith(route))
  );

  // All routes from the (dashboard) directory should use auth
  // Check if the pathname starts with any of the dashboard routes
  const dashboardRoutes = [
    '/dashboard', '/office-dashboard', '/announcements', '/votes', '/requests', '/buildings', '/apartments', '/notifications',
    '/map-visualization', '/residents', '/maintenance', '/collaborators', '/documents',
    '/kiosk-widgets', '/kiosk-management', '/financial', '/office-finance', '/projects', '/teams', '/admin', '/calendar',
    '/chat', '/data-migration', '/suppliers', '/system-health',
    '/financial-tests', '/users', '/office-staff', '/my-profile', '/my-subscription',
    '/my-apartment', '/online-payments'  // Resident pages
  ];

  const isDashboard = dashboardRoutes.some(route => pathname?.startsWith(route));
  const isNoSidebarRoute = noSidebarRoutes.some(route =>
    pathname === route || (route !== '/' && pathname?.startsWith(route))
  );

  // Debug logging
  useEffect(() => {
    console.log('[AppProviders] Current pathname:', pathname);
    console.log('[AppProviders] Is Dashboard:', isDashboard);
    console.log('[AppProviders] Is Kiosk Mode:', isKioskMode);
    console.log('[AppProviders] Is Info Screen:', isInfoScreen);
    console.log('[AppProviders] Is No Sidebar Route:', isNoSidebarRoute);
  }, [pathname, isDashboard, isKioskMode, isInfoScreen, isNoSidebarRoute]);

  // Kiosk mode routes - no auth needed, no LayoutWrapper (they have their own layout)
  // IMPORTANT: Only /kiosk and /test-kiosk routes, NOT /kiosk-widgets or /kiosk-management
  if (isKioskMode) {
    return (
      <ReactQueryProvider>
        <LoadingProvider>
          {children}
          <Toaster position="top-right" richColors closeButton />
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
          <Toaster position="top-right" richColors closeButton />
        </LoadingProvider>
      </ReactQueryProvider>
    );
  }

  // All other routes including /kiosk-widgets get AuthProvider
  // LayoutWrapper should NOT be used for:
  // - Dashboard routes (they have their own layout with sidebar in (dashboard)/layout.tsx)
  // - No sidebar routes (landing, auth, payment pages)
  // - Kiosk and info screen routes (handled above)
  const shouldUseLayoutWrapper = pathname && !isDashboard && !isKioskMode && !isInfoScreen && !isNoSidebarRoute;

  // For auth pages (login, signup, etc.), skip AuthProvider to avoid loading spinner
  if (isNoAuthLoadingRoute) {
    return (
      <ReactQueryProvider>
        <LoadingProvider>
          {children}
          <Toaster position="top-right" richColors closeButton />
        </LoadingProvider>
      </ReactQueryProvider>
    );
  }

  return (
    <ReactQueryProvider>
      <LoadingProvider>
        <AuthProvider>
          <BuildingProvider>
            {shouldUseLayoutWrapper ? <LayoutWrapper>{children}</LayoutWrapper> : children}
            {/* ✅ Sonner Toaster - Available globally for all routes */}
            <Toaster position="top-right" richColors closeButton />
          </BuildingProvider>
        </AuthProvider>
      </LoadingProvider>
    </ReactQueryProvider>
  );
}

