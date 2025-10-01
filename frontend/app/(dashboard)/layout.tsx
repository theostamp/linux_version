// frontend/app/(dashboard)/layout.tsx
'use client';

import { ReactNode, useState, useEffect } from 'react';
import { useAuth } from '@/components/contexts/AuthContext';
import { useBuilding } from '@/components/contexts/BuildingContext';
import { Loader2 } from 'lucide-react';
import GlobalHeader from '@/components/GlobalHeader';
import Sidebar from '@/components/Sidebar';
import { Toaster } from 'react-hot-toast';
import { Toaster as SonnerToaster } from 'sonner';
import GlobalLoadingOverlay from '@/components/GlobalLoadingOverlay';
import GoToTopButton from '@/components/GoToTopButton';
import { TodoSidebarProvider } from '@/components/todos/TodoSidebarContext';
import TodoSidebar from '@/components/todos/TodoSidebar';
import { MonthlyTaskReminderModal } from '@/components/notifications/MonthlyTaskReminderModal';
import { useMonthlyTasksReminder } from '@/hooks/useMonthlyTasksReminder';

interface DashboardLayoutProps {
  children: ReactNode;
  fullWidth?: boolean;
}

export default function DashboardLayout({ children, fullWidth = false }: DashboardLayoutProps) {
  // Get auth and building contexts
  const { user, isAuthReady, isLoading: authLoading } = useAuth();
  const { isLoading: buildingLoading } = useBuilding();

  const isLoading = authLoading || buildingLoading || !isAuthReady;

  // Monthly tasks reminder
  const { data: pendingTasks = [] } = useMonthlyTasksReminder();
  const [showTaskModal, setShowTaskModal] = useState(false);

  // Show modal when pending tasks are detected
  // Persistence Logic:
  // - If user dismisses/skips: Modal hides but reappears on next login/refresh (same day)
  // - If user sends notification: localStorage cleared, modal won't reappear
  // - If new day: Dismissal cleared, modal shows again for unsent tasks
  useEffect(() => {
    if (pendingTasks && pendingTasks.length > 0 && user && isAuthReady) {
      // Check localStorage to see if user has dismissed this task today
      const taskId = pendingTasks[0].id;
      const dismissKey = `monthly-task-dismissed-${taskId}`;
      const dismissedUntil = localStorage.getItem(dismissKey);

      // If task was dismissed, check if it's still the same day
      if (dismissedUntil) {
        const dismissedDate = new Date(dismissedUntil);
        const now = new Date();

        // If it's a new day or different task, show modal again
        if (dismissedDate.toDateString() === now.toDateString()) {
          // Still same day - don't show modal
          return;
        } else {
          // New day - clear old dismissal and show modal
          localStorage.removeItem(dismissKey);
        }
      }

      // Show modal 2 seconds after dashboard loads
      const timer = setTimeout(() => {
        setShowTaskModal(true);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [pendingTasks, user, isAuthReady]);

  // Handle modal close - store dismissal in localStorage
  const handleModalClose = () => {
    setShowTaskModal(false);

    // If task was skipped (not sent), store dismissal date
    // This will show modal again on next login/page refresh
    if (pendingTasks && pendingTasks.length > 0) {
      const taskId = pendingTasks[0].id;
      const dismissKey = `monthly-task-dismissed-${taskId}`;
      localStorage.setItem(dismissKey, new Date().toISOString());
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 overflow-y-auto">
        <div className="flex justify-center items-center h-full p-10">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <span className="ml-3 text-gray-600">Φόρτωση...</span>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!user && isAuthReady) {
    if (typeof window !== 'undefined') {
      const currentPath = window.location.pathname + window.location.search;
      // Don't redirect back to unauthorized page
      const safeRedirect = currentPath.includes('/unauthorized') ? '/dashboard' : currentPath;
      const redirectUrl = `/login?redirectTo=${encodeURIComponent(safeRedirect)}`;
      window.location.href = redirectUrl;
    }
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Μετάβαση στη σελίδα σύνδεσης...</p>
        </div>
      </div>
    );
  }

  return (
    <TodoSidebarProvider>
      <div className="flex h-screen bg-gray-50 dark:bg-gray-950 overflow-hidden">
        {/* Fixed Sidebar */}
        <Sidebar />
        
        {/* Main Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden lg:ml-64">
          {/* Fixed Header */}
          <GlobalHeader />

          {/* Scrollable Main Content */}
          <main className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-950 pt-20">
            <div className="px-4 sm:px-6 md:px-8 lg:px-10 pb-4 sm:pb-6 md:pb-8 lg:pb-10">
              <div className="w-full">
                {children}
              </div>
            </div>
          </main>
        </div>
        
        {/* Todo Sidebar */}
        <TodoSidebar />
        
        {/* Global Loading Overlay */}
        <GlobalLoadingOverlay />
        
        {/* Go to Top Button */}
        <GoToTopButton />

        {/* Monthly Tasks Reminder Modal */}
        <MonthlyTaskReminderModal
          tasks={pendingTasks || []}
          open={showTaskModal}
          onClose={handleModalClose}
        />

        <Toaster position="top-right" />
        <SonnerToaster position="top-right" richColors />
      </div>
    </TodoSidebarProvider>
  );
}
