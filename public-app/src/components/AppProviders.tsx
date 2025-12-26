'use client';

import { ReactNode, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Toaster } from 'sonner';
import { AuthProvider } from '@/components/contexts/AuthContext';
import { BuildingProvider } from '@/components/contexts/BuildingContext';
import { LoadingProvider } from '@/components/contexts/LoadingContext';
import LayoutWrapper from '@/components/LayoutWrapper';

export default function AppProviders({ children }: { readonly children: ReactNode }) {
  const pathname = usePathname();
  const isPlasmicHost = pathname === '/plasmic-host';

  // Force light mode globally (dark mode is intentionally disabled across the app).
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('dark');
    try {
      localStorage.removeItem('theme-preference');
    } catch {
      // ignore
    }
  }, [pathname]);

  const isInfoScreen = pathname?.startsWith('/info-screen');
  const isKioskMode = (pathname?.startsWith('/kiosk') || pathname?.startsWith('/kiosk-display')) && !pathname?.startsWith('/kiosk-widgets') && !pathname?.startsWith('/kiosk-management');

  // Public routes (no auth providers / no dashboard shell)
  const publicRoutes = [
    '/',
    '/login',
    '/register',
    '/signup',
    '/plans',
    '/payment',
    '/marketplace',
    '/auth',
    '/logout',
    '/verify-payment',
    '/forgot-password',
    '/accept-invitation',
    '/advertise',
    '/tenant',
    '/magic-login',
    '/unauthorized',
    '/m',
    '/vote-by-email',
    '/backend-proxy',
  ];

  const isPublicRoute = publicRoutes.some(route =>
    pathname === route || (route !== '/' && pathname?.startsWith(route))
  );

  const isNoAuthLoadingRoute = isPublicRoute;
  const isNoSidebarRoute = isPublicRoute;

  // Treat any non-public route as a dashboard route to avoid manual route lists.
  const isDashboard = Boolean(pathname) && !isKioskMode && !isInfoScreen && !isPublicRoute && !isPlasmicHost;

  // Debug logging
  useEffect(() => {
    if (isPlasmicHost) return;
    console.log('[AppProviders] Current pathname:', pathname);
    console.log('[AppProviders] Is Dashboard:', isDashboard);
    console.log('[AppProviders] Is Kiosk Mode:', isKioskMode);
    console.log('[AppProviders] Is Info Screen:', isInfoScreen);
    console.log('[AppProviders] Is No Sidebar Route:', isNoSidebarRoute);
  }, [pathname, isDashboard, isKioskMode, isInfoScreen, isNoSidebarRoute, isPlasmicHost]);

  // Plasmic app host route must be completely "clean":
  // - no auth/building providers that might call backend
  // - no LayoutWrapper / sidebar
  // - no Toaster (adds DOM to the canvas)
  if (isPlasmicHost) {
    return children;
  }

  // Kiosk mode routes - no auth needed, no LayoutWrapper (they have their own layout)
  // IMPORTANT: Only /kiosk and /test-kiosk routes, NOT /kiosk-widgets or /kiosk-management
  if (isKioskMode) {
    return (
      <LoadingProvider>
        {children}
        <Toaster position="top-right" richColors closeButton />
      </LoadingProvider>
    );
  }

  // Info screen routes - no auth needed, uses LayoutWrapper
  if (isInfoScreen) {
    return (
      <LoadingProvider>
        <LayoutWrapper>{children}</LayoutWrapper>
        <Toaster position="top-right" richColors closeButton />
      </LoadingProvider>
    );
  }

  // All other routes including /kiosk-widgets get AuthProvider
  // LayoutWrapper should NOT be used for:
  // - Dashboard routes (they have their own layout with sidebar in (dashboard)/layout.tsx)
  // - No sidebar routes (landing, auth, payment pages)
  // - Kiosk and info screen routes (handled above)
  // Route layouts handle the app shell; avoid applying LayoutWrapper by default.
  const shouldUseLayoutWrapper = false;

  // For public pages, skip AuthProvider to avoid loading spinner
  if (isNoAuthLoadingRoute) {
    return (
      <LoadingProvider>
        {children}
        <Toaster position="top-right" richColors closeButton />
      </LoadingProvider>
    );
  }

  return (
    <LoadingProvider>
      <AuthProvider>
        <BuildingProvider>
          {shouldUseLayoutWrapper ? <LayoutWrapper>{children}</LayoutWrapper> : children}
          {/* ✅ Sonner Toaster - Available globally for all routes */}
          <Toaster position="top-right" richColors closeButton />
        </BuildingProvider>
      </AuthProvider>
    </LoadingProvider>
  );
}
