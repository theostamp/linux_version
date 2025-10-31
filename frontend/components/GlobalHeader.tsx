'use client';

import React, { useState, useCallback } from 'react';
import { useAuth } from '@/components/contexts/AuthContext';
import { useBuilding } from '@/components/contexts/BuildingContext';
import BuildingSelectorButton from './BuildingSelectorButton';
import LogoutButton from './LogoutButton';
import OfficeSettingsModal from './OfficeSettingsModal';
import { EventNotificationBell, EventSidebar } from '@/components/events';
import TodoNotificationBell from '@/components/todos/TodoNotificationBell';
import { User, Building as BuildingIcon, Settings, Menu, Calendar } from 'lucide-react';
import { API_BASE_URL } from '@/lib/api';

// Helper function to get user role label
// Note: Uses system_role (CustomUser.SystemRole) and optionally resident_role (Resident.Role)
// SystemRole values: 'superuser', 'admin' (Ultra Admin), or 'manager' (Django Tenant Owner)
// Resident.Role values: 'manager' (Εσωτερικός Διαχειριστής), 'owner' (Ιδιοκτήτης), 'tenant' (Ένοικος)
const getUserRoleLabel = (user: any): string => {
  if (!user) return 'Χρήστης';

  // Use system_role if available, fallback to role (backward compat)
  const systemRole = user.system_role ?? user.role;
  
  // SystemRole: 'superuser' or 'admin' = Ultra Admin
  if (systemRole === 'superuser' || systemRole === 'admin') {
    return 'Ultra Admin';
  }
  
  // SystemRole: 'manager' = Django Tenant Owner
  if (systemRole === 'manager') {
    // Check if user also has Resident.Role (apartment level)
    const residentRole = user.resident_role;
    if (residentRole) {
      // Display resident role if exists (for apartment context)
      switch (residentRole) {
        case 'manager':
          return 'Διαχειριστής (Εσωτερικός)'; // Internal Building Manager
        case 'owner':
          return 'Ιδιοκτήτης';
        case 'tenant':
          return 'Ένοικος';
      }
    }
    return 'Διαχειριστής'; // Office Manager = Django Tenant Owner
  }

  // Check for superuser flag (only if no specific role is set)
  if (user.is_superuser) return 'Ultra Admin';

  // Check for staff/admin
  if (user.is_staff) return 'Διαχειριστής';

  // Check resident_role if no system_role (for residents without SystemRole)
  if (user.resident_role && !systemRole) {
    switch (user.resident_role) {
      case 'manager':
        return 'Εσωτερικός Διαχειριστής';
      case 'owner':
        return 'Ιδιοκτήτης';
      case 'tenant':
        return 'Ένοικος';
    }
  }

  return 'Χρήστης';
};

export default function GlobalHeader() {
  console.log('[GlobalHeader] Rendering');
  
  const { user } = useAuth();
  const { selectedBuilding, setSelectedBuilding } = useBuilding();
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isEventSidebarOpen, setIsEventSidebarOpen] = useState(false);
  const [logoError, setLogoError] = useState(false);
  const [logoLoading, setLogoLoading] = useState(false);

  // Memoized callbacks to prevent re-renders
  const handleEventSidebarOpen = useCallback(() => {
    setIsEventSidebarOpen(true);
  }, []);

  const handleSettingsModalOpen = useCallback(() => {
    setIsSettingsModalOpen(true);
  }, []);

  // Reset logo error when user changes
  React.useEffect(() => {
    setLogoError(false);
    if (user?.office_logo) {
      console.log('GlobalHeader: User has office logo:', user.office_logo);
    }
  }, [user?.office_logo]);

  return (
    <>
      <header className="fixed top-0 left-0 right-0 lg:left-64 z-40 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm shadow-md border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            {/* Left side - Logo and Building Selector */}
            <div className="flex items-center gap-4 lg:gap-6">
              {/* Mobile Menu Toggle - Hidden on large screens since sidebar is always visible */}
              <button className="lg:hidden p-2 text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-all duration-200">
                <Menu className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3">
                {/* Office Logo or Default Icon */}
                {user?.office_logo && !logoError ? (
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center shadow-md overflow-hidden">
                    <img 
                      src={user.office_logo.startsWith('http') ? user.office_logo : `${API_BASE_URL.replace('/api', '')}${user.office_logo.startsWith('/') ? user.office_logo : `/${user.office_logo}`}`}
                      alt="Office Logo" 
                      className={`w-full h-full object-contain transition-opacity duration-200 ${logoLoading ? 'opacity-50' : 'opacity-100'}`}
                      onLoad={() => setLogoLoading(false)}
                      onLoadStart={() => setLogoLoading(true)}
                      onError={() => {
                        setLogoError(true);
                        setLogoLoading(false);
                      }}
                    />
                  </div>
                ) : (
                  <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg flex items-center justify-center shadow-md">
                    <BuildingIcon className="w-5 h-5 text-white" />
                  </div>
                )}
                
                {/* Office Details */}
                <div className="hidden sm:block">
                  <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100 leading-tight">
                    {user?.office_name || 'Γραφείο Διαχείρισης'}
                  </h1>
                  {user?.office_address && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 leading-tight">
                      {user.office_address}
                    </p>
                  )}
                </div>
                
                {/* Mobile version */}
                <div className="sm:hidden">
                  <h1 className="text-sm font-bold text-gray-900 dark:text-gray-100 leading-tight">
                    {user?.office_name?.substring(0, 2) || 'ΓΔ'}
                  </h1>
                </div>
              </div>
              
              {/* Building Selector - Hidden on mobile to save space */}
              <div className="hidden md:flex items-center gap-3">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Κτίριο:</span>
                <BuildingSelectorButton
                  onBuildingSelect={setSelectedBuilding}
                  selectedBuilding={selectedBuilding}
                  className="min-w-[200px]"
                />
              </div>
            </div>

            {/* Right side - User info and actions */}
            <div className="flex items-center gap-2 sm:gap-4">
              {/* Calendar - Hidden on small mobile */}
              <button 
                onClick={() => {
                  const calendarUrl = `${window.location.protocol}//${window.location.host}/calendar`;
                  window.open(calendarUrl, 'calendar', 'width=1200,height=800,scrollbars=yes,resizable=yes');
                }}
                className="hidden sm:block p-2 text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-all duration-200"
                title="Άνοιγμα Ημερολογίου σε νέο παράθυρο"
              >
                <Calendar className="w-5 h-5" />
              </button>

              {/* Event Notifications - Hidden on small mobile - TEMPORARILY DISABLED */}
              {/* <div className="hidden sm:block">
                <EventNotificationBell onClick={handleEventSidebarOpen} />
              </div> */}

              {/* Todo Notifications - Hidden on small mobile */}
              <div className="hidden sm:block">
                <TodoNotificationBell />
              </div>
              
              {/* Settings - Desktop */}
              <button 
                onClick={handleSettingsModalOpen}
                className="hidden sm:block p-2 text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-all duration-200"
                title="Ρυθμίσεις Γραφείου Διαχείρισης"
              >
                <Settings className="w-5 h-5" />
              </button>

              {/* Settings - Mobile */}
              <button 
                onClick={() => setIsSettingsModalOpen(true)}
                className="sm:hidden p-2 text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-all duration-200"
                title="Ρυθμίσεις"
              >
                <Settings className="w-4 h-4" />
              </button>

              {/* User Info */}
              {user && (
                <div className="flex items-center gap-2 sm:gap-3 px-3 py-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="w-8 h-8 bg-gradient-to-r from-gray-500 to-gray-600 rounded-lg flex items-center justify-center">
                    <User className="w-4 h-4 text-white" />
                  </div>
                  <div className="hidden sm:block">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 leading-tight">
                      {user.first_name || user.last_name
                        ? `${user.first_name} ${user.last_name}`.trim()
                        : user.email}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 leading-tight">
                      {getUserRoleLabel(user)}
                    </p>
                  </div>
                  <div className="sm:hidden">
                    <p className="text-xs font-medium text-gray-900 dark:text-gray-100 leading-tight">
                      {user.first_name || user.last_name
                        ? `${user.first_name} ${user.last_name}`.trim().split(' ')[0]
                        : user.email.split('@')[0]}
                    </p>
                  </div>
                </div>
              )}
              
              {/* Logout Button */}
              <LogoutButton className="btn-secondary text-sm" />
            </div>
          </div>
        </div>
      </header>

      {/* Office Settings Modal */}
      <OfficeSettingsModal 
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
      />

      {/* Event Sidebar */}
      <EventSidebar
        isOpen={isEventSidebarOpen}
        onClose={() => setIsEventSidebarOpen(false)}
      />
    </>
  );
} 