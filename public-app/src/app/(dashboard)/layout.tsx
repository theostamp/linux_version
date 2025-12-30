'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import CollapsibleSidebar from '@/components/CollapsibleSidebar';
import GlobalHeader from '@/components/GlobalHeader';
import { useAuth } from '@/components/contexts/AuthContext';
import { Loader2 } from 'lucide-react';
import { AIAssistantChat } from '@/components/ai-assistant/AIAssistantChat';

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
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="h-12 w-12 text-primary animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Φόρτωση...</p>
        </div>
      </div>
    );
  }

  // Don't render if not authenticated (will redirect)
  if (!isAuthenticated || !user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-bg-app-main flex">
      {/* Collapsible Sidebar - Gets user from AuthContext */}
      <CollapsibleSidebar />

      {/* Main Content - Flex grow to take remaining space */}
      <div className="flex-1 flex flex-col min-w-0 transition-all duration-300 ease-in-out">
        {/* Header */}
        <GlobalHeader />

        {/* Page Content - Standardized container layout */}
        <div className="py-8 container mx-auto px-4 sm:px-6 lg:px-8">
          {children}
        </div>
      </div>

      {/* AI Assistant Chat Widget */}
      <AIAssistantChat />
    </div>
  );
}
