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
const getUserRoleLabel = (user: { is_superuser?: boolean; is_staff?: boolean; role?: string } | null): string => {
  if (!user) return 'Χρήστης';

  if (user.is_superuser) return 'Ultra Admin';
  if (user.is_staff) return 'Διαχειριστής';

  if (user.role) {
    switch (user.role.toLowerCase()) {
      case 'admin':
      case 'manager':
        return 'Διαχειριστής';
      case 'owner':
        return 'Ιδιοκτήτης';
      case 'tenant':
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
      case 'resident':
        return 'Κάτοικος';
      default:
        return user.profile.role;
    }
  }

  return 'Χρήστης';
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 lg:pl-72">
          <div className="flex items-center justify-between h-20">
            {/* Left side - Logo and Building Selector */}
            <div className="flex items-center gap-4 lg:gap-6">
              <div className="flex items-center gap-3">
                {/* Office Logo or Default Icon */}
                {(() => {
                  const logoUrl = getOfficeLogoUrl(user?.office_logo);
                  return logoUrl && !logoError ? (
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center shadow-md overflow-hidden bg-gray-50">
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
                    <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg flex items-center justify-center shadow-md">
                      <BuildingIcon className="w-5 h-5 text-white" />
                    </div>
                  );
                })()}
                
                {/* Office Details */}
                <div className="hidden sm:block">
                  <h1 className="text-lg font-bold text-gray-900 leading-tight">
                    {user?.office_name || 'Γραφείο Διαχείρισης'}
                  </h1>
                  {user?.office_address && (
                    <p className="text-xs text-gray-500 leading-tight">
                      {user.office_address}
                    </p>
                  )}
                  {user?.office_phone && (
                    <p className="text-xs text-gray-500 leading-tight">
                      Τηλ: {user.office_phone}
                      {user?.office_phone_emergency && ` / ${user.office_phone_emergency}`}
                    </p>
                  )}
                  {user?.email && (
                    <p className="text-xs text-gray-500 leading-tight">
                      {user.email}
                    </p>
                  )}
                </div>
                
                {/* Mobile version */}
                <div className="sm:hidden">
                  <h1 className="text-sm font-bold text-gray-900 leading-tight">
                    {user?.office_name?.substring(0, 2) || 'ΓΔ'}
                  </h1>
                </div>
              </div>
              
              {/* Building Selector - Hidden on mobile to save space */}
              <div className="hidden md:flex items-center gap-3">
                <span className="text-sm font-medium text-gray-600">Κτίριο:</span>
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
                className="hidden sm:block p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200"
                title="Άνοιγμα Ημερολογίου σε νέο παράθυρο"
              >
                <Calendar className="w-5 h-5" />
              </button>
              
              {/* Settings - Desktop */}
              <button 
                onClick={handleSettingsModalOpen}
                className="hidden sm:block p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200"
                title="Ρυθμίσεις Γραφείου Διαχείρισης"
              >
                <Settings className="w-5 h-5" />
              </button>

              {/* Settings - Mobile */}
              <button 
                onClick={() => setIsSettingsModalOpen(true)}
                className="sm:hidden p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200"
                title="Ρυθμίσεις"
              >
                <Settings className="w-4 h-4" />
              </button>

              {/* User Info */}
              {user && (
                <div className="flex items-center gap-2 sm:gap-3 px-3 py-2 bg-gray-50 rounded-lg">
                  <div className="w-8 h-8 bg-gradient-to-r from-gray-500 to-gray-600 rounded-lg flex items-center justify-center">
                    <User className="w-4 h-4 text-white" />
                  </div>
                  <div className="hidden sm:block">
                    <p className="text-sm font-medium text-gray-900 leading-tight">
                      {user.first_name || user.last_name
                        ? `${user.first_name} ${user.last_name}`.trim()
                        : user.email}
                    </p>
                    <p className="text-xs text-gray-500 leading-tight">
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
      </header>

      {/* Office Settings Modal */}
      <OfficeSettingsModal 
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
      />
    </>
  );
}

