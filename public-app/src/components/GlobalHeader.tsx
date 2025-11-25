'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { useAuth } from '@/components/contexts/AuthContext';
import { useBuilding } from '@/components/contexts/BuildingContext';
import BuildingSelectorButton from './BuildingSelectorButton';
import LogoutButton from './LogoutButton';
import OfficeSettingsModal from './OfficeSettingsModal';
import { User, Building as BuildingIcon, Settings, Calendar } from 'lucide-react';
import { getOfficeLogoUrl } from '@/lib/utils';

// Helper function to get user role label
const getUserRoleLabel = (user: { is_superuser?: boolean; is_staff?: boolean; role?: string; profile?: { role?: string } } | null): string => {
  if (!user) return 'Χρήστης';

  if (user.is_superuser) return 'Ultra Admin';
  if (user.is_staff) return 'Διαχειριστής';

  if (user.role) {
    switch (user.role.toLowerCase()) {
      case 'admin':
      case 'manager':
        return 'Διαχειριστής';
      case 'internal_manager':
        return 'Εσωτερικός Διαχειριστής';
      case 'owner':
        return 'Ιδιοκτήτης';
      case 'tenant':
      case 'resident':
        return 'Ένοικος';
      default:
        return user.role;
    }
  }

  if (user.profile?.role) {
    switch (user.profile.role) {
      case 'superuser':
        return 'Ultra Admin';
      case 'manager':
        return 'Διαχειριστής';
      case 'internal_manager':
        return 'Εσωτερικός Διαχειριστής';
      case 'resident':
        return 'Κάτοικος';
      default:
        return user.profile.role;
    }
  }

  return 'Χρήστης';
};

// Helper function to check if user is admin-level (can see building selector)
const isAdminLevel = (user: { is_superuser?: boolean; is_staff?: boolean; role?: string; profile?: { role?: string } } | null): boolean => {
  if (!user) return false;
  if (user.is_superuser || user.is_staff) return true;
  
  const role = user.role || user.profile?.role;
  // Only 'manager' (Office Manager) is admin-level
  return role === 'manager';
};

export default function GlobalHeader() {
  const { user } = useAuth();
  const { selectedBuilding, setSelectedBuilding } = useBuilding();
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [logoError, setLogoError] = useState(false);
  const [logoLoading, setLogoLoading] = useState(false);

  const handleSettingsModalOpen = useCallback(() => {
    setIsSettingsModalOpen(true);
  }, []);

  useEffect(() => {
    setLogoError(false);
  }, [user?.office_logo]);

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-sm shadow-md border-b border-gray-200">
        <div className="w-full px-4 sm:px-6 lg:px-8 lg:pl-64 lg:pr-8">
          <div className="max-w-[1600px] mx-auto">
            <div className="grid grid-cols-[auto_1fr_auto] items-center gap-6 lg:gap-8 h-20 py-3">
              {/* Left Section - Logo */}
              <div className="flex-shrink-0">
                {(() => {
                  const logoUrl = getOfficeLogoUrl(user?.office_logo);
                  return logoUrl && !logoError ? (
                    <div className="w-12 h-12 rounded-lg flex items-center justify-center shadow-md overflow-hidden bg-gray-50">
                      <img
                        src={logoUrl}
                        alt="Office Logo"
                        className={`w-full h-full object-contain transition-opacity duration-200 ${logoLoading ? 'opacity-50' : 'opacity-100'}`}
                        onLoad={() => {
                          setLogoLoading(false);
                          setLogoError(false);
                        }}
                        onLoadStart={() => setLogoLoading(true)}
                        onError={() => {
                          setLogoError(true);
                          setLogoLoading(false);
                        }}
                      />
                    </div>
                  ) : (
                    <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg flex items-center justify-center shadow-md">
                      <BuildingIcon className="w-6 h-6 text-white" />
                    </div>
                  );
                })()}
              </div>

              {/* Center Section - Office Details spread across width */}
              <div className="min-w-0">
                {/* Desktop: Grid Layout for even spacing */}
                <div className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
                  {/* Office Name and Address */}
                  <div className="flex flex-col justify-center min-w-0">
                    <h1 className="text-base font-bold text-gray-900 leading-tight mb-1 truncate">
                      {user?.office_name || 'Γραφείο Διαχείρισης'}
                    </h1>
                    {user?.office_address && (
                      <p className="text-xs text-gray-500 leading-tight truncate">
                        {user.office_address}
                      </p>
                    )}
                  </div>

                  {/* Contact Details */}
                  <div className="flex flex-col justify-center min-w-0">
                    {user?.office_phone && (
                      <p className="text-xs text-gray-500 leading-tight mb-1 truncate">
                        📞 {user.office_phone}
                      </p>
                    )}
                    {user?.email && (
                      <p className="text-xs text-gray-500 leading-tight truncate">
                        ✉️ {user.email}
                      </p>
                    )}
                  </div>

                  {/* Building Selector - ADMIN-ONLY (Office Manager, Staff, Superuser) */}
                  {isAdminLevel(user) && (
                    <div className="hidden lg:flex items-center gap-2 min-w-0">
                      <span className="text-xs font-medium text-gray-600 whitespace-nowrap">Κτίριο:</span>
                      <BuildingSelectorButton
                        onBuildingSelect={setSelectedBuilding}
                        selectedBuilding={selectedBuilding}
                        className="min-w-[160px]"
                      />
                    </div>
                  )}
                </div>

                {/* Mobile version - Office Name Only */}
                <div className="sm:hidden">
                  <h1 className="text-sm font-bold text-gray-900 leading-tight truncate">
                    {user?.office_name?.substring(0, 15) || 'ΓΔ'}
                  </h1>
                </div>
              </div>

              {/* Right Section - Actions and User Info */}
              <div className="flex items-center gap-2 flex-shrink-0">
              {/* Calendar Button */}
              <button
                onClick={() => {
                  const calendarUrl = `${window.location.protocol}//${window.location.host}/calendar`;
                  window.open(calendarUrl, 'calendar', 'width=1200,height=800,scrollbars=yes,resizable=yes');
                }}
                className="hidden sm:flex p-2.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200"
                title="Άνοιγμα Ημερολογίου σε νέο παράθυρο"
              >
                <Calendar className="w-5 h-5" />
              </button>

              {/* Settings Button - Desktop - ADMIN-ONLY */}
              {isAdminLevel(user) && (
                <button
                  onClick={handleSettingsModalOpen}
                  className="hidden sm:flex p-2.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200"
                  title="Ρυθμίσεις Γραφείου Διαχείρισης"
                >
                  <Settings className="w-5 h-5" />
                </button>
              )}

              {/* Settings Button - Mobile - ADMIN-ONLY */}
              {isAdminLevel(user) && (
                <button
                  onClick={() => setIsSettingsModalOpen(true)}
                  className="sm:hidden p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200"
                  title="Ρυθμίσεις"
                >
                  <Settings className="w-4 h-4" />
                </button>
              )}

              {/* User Info Card */}
              {user && (
                <div className="flex items-center gap-3 px-4 py-2 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="w-8 h-8 bg-gradient-to-r from-gray-500 to-gray-600 rounded-lg flex items-center justify-center flex-shrink-0">
                    <User className="w-4 h-4 text-white" />
                  </div>
                  <div className="hidden sm:block">
                    <p className="text-sm font-medium text-gray-900 leading-tight">
                      {user.first_name || user.last_name
                        ? `${user.first_name} ${user.last_name}`.trim()
                        : user.email}
                    </p>
                    <p className="text-xs text-gray-500 leading-tight mt-0.5">
                      {getUserRoleLabel(user)}
                    </p>
                  </div>
                  <div className="sm:hidden">
                    <p className="text-xs font-medium text-gray-900 leading-tight">
                      {user.first_name || user.last_name
                        ? `${user.first_name} ${user.last_name}`.trim().split(' ')[0]
                        : user.email.split('@')[0]}
                    </p>
                  </div>
                </div>
              )}

              {/* Logout Button */}
              <LogoutButton className="text-sm" />
            </div>
          </div>
        </div>
      </div>
    </header>

      {/* Office Settings Modal */}
      <OfficeSettingsModal 
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
      />
    </>
  );
}

