'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import CollapsibleSidebar from '@/components/CollapsibleSidebar';
import GlobalHeader from '@/components/GlobalHeader';
import { useAuth } from '@/components/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { user, isLoading, isAuthReady, isAuthenticated } = useAuth();

  useEffect(() => {
    // Wait for auth to be ready
    if (!isAuthReady) return;

    // If not authenticated, redirect to login
    if (!isAuthenticated) {
      router.push('/login?redirect=' + encodeURIComponent(window.location.pathname));
      return;
    }
  }, [isAuthReady, isAuthenticated, router]);

  // Show loading while auth is initializing
  if (!isAuthReady || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-12 w-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Φόρτωση...</p>
        </div>
      </div>
    );
  }

  // Don't render if not authenticated (will redirect)
  if (!isAuthenticated || !user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Collapsible Sidebar - Gets user from AuthContext */}
      <CollapsibleSidebar />

      {/* Main Content - Adjusted padding for collapsed sidebar (80px) */}
      <div className="lg:pl-20">
        {/* Header */}
        <GlobalHeader />

        {/* Page Content */}
        <div className="pt-[96px]">
          {children}
        </div>
      </div>
    </div>
  );
}

